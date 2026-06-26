import type { Comment, Post, ScrapeResult } from '@/shared/types';
import { deriveSource } from '@/shared/platform';

export type ProgressFn = (message: string, percent: number) => void;
export type ShouldStop = () => boolean;

const TRANSIENT = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const MORE_BATCH = 100;

interface RedditMore {
  ids: string[];
  depth: number;
}

async function fetchJson(url: string): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok || !TRANSIENT.has(res.status) || attempt === MAX_ATTEMPTS) return res;
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS) throw err;
    }
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  throw lastErr ?? new Error('Reddit request failed');
}

/** Trim deep comment permalinks back to the canonical thread path. */
function canonicalThreadPath(pathname: string): string {
  const clean = pathname.replace(/\.json\/?$/i, '').replace(/\/+$/, '');
  const segs = clean.split('/').filter(Boolean);
  const idx = segs.findIndex((s) => s.toLowerCase() === 'comments');
  if (idx === -1 || !segs[idx + 1]) return clean || '/';
  return '/' + segs.slice(0, Math.min(segs.length, idx + 3)).join('/');
}

function extractLinks(markdown: string): string[] {
  if (!markdown) return [];
  const found = new Set<string>();
  const mdLink = /\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  const bare = /(?<![("])\bhttps?:\/\/[^\s)<>\]]+/g;
  let m: RegExpExecArray | null;
  while ((m = mdLink.exec(markdown))) found.add(m[1]);
  while ((m = bare.exec(markdown))) found.add(m[0]);
  return [...found];
}

interface RedditChild {
  kind: string;
  data: Record<string, any>;
}

function parseTree(
  children: RedditChild[],
  depth: number,
  seen: Set<string>,
  out: Comment[],
  more: RedditMore[],
): void {
  for (const child of children) {
    if (child.kind === 'more') {
      const ids: string[] = child.data?.children ?? [];
      if (ids.length) more.push({ ids, depth });
      continue;
    }
    if (child.kind !== 't1') continue;
    const d = child.data;
    if (d.author === '[deleted]' && d.body === '[deleted]') continue;
    if (d.author === '[removed]' && d.body === '[removed]') continue;

    const commentId: string = d.name || (d.id ? `t1_${d.id}` : '');
    const dedupeKey = commentId || d.permalink || '';
    if (dedupeKey) {
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
    }

    const commentDepth = Number.isFinite(Number(d.depth)) ? Number(d.depth) : depth;
    out.push({
      text: (d.body || '').trim(),
      author: d.author || '',
      timestamp: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : '',
      permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : '',
      links: extractLinks(d.body || ''),
      score: typeof d.score === 'number' ? d.score : 'Hidden',
      depth: commentDepth,
      commentId,
    });

    const replies = d.replies?.data?.children;
    if (Array.isArray(replies)) parseTree(replies, commentDepth + 1, seen, out, more);
  }
}

async function fetchMoreBatch(
  linkId: string,
  ids: string[],
  seen: Set<string>,
): Promise<{ comments: Comment[]; more: RedditMore[] }> {
  const params = new URLSearchParams({
    api_type: 'json',
    raw_json: '1',
    link_id: linkId,
    children: ids.join(','),
  });
  const res = await fetch(`https://www.reddit.com/api/morechildren.json?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(res.status === 429 ? 'Rate limited by Reddit' : `Reddit ${res.status}`);
  const data = await res.json();
  const things: RedditChild[] = data?.json?.data?.things ?? [];
  const comments: Comment[] = [];
  const more: RedditMore[] = [];
  parseTree(things, 0, seen, comments, more);
  return { comments, more };
}

async function drainMore(
  linkId: string,
  initial: RedditMore[],
  seen: Set<string>,
  baseCount: number,
  progress: ProgressFn,
  shouldStop?: ShouldStop,
): Promise<Comment[]> {
  const collected: Comment[] = [];
  const queued = new Set<string>();
  const pending: string[] = [];
  for (const m of initial) for (const id of m.ids) if (!queued.has(id)) (queued.add(id), pending.push(id));

  let batches = 0;
  while (pending.length) {
    if (shouldStop?.()) break; // user pressed Stop — keep what we have
    const batch = pending.splice(0, MORE_BATCH);
    try {
      if (batches > 0) await new Promise((r) => setTimeout(r, 200));
      const { comments, more } = await fetchMoreBatch(linkId, batch, seen);
      collected.push(...comments);
      for (const m of more) for (const id of m.ids) if (!queued.has(id)) (queued.add(id), pending.push(id));
    } catch {
      // Skip a failed batch and keep going.
    }
    batches++;
    progress(`Loading comments… ${baseCount + collected.length} found`, Math.min(90, 30 + batches * 5));
  }
  return collected;
}

export async function scrapeReddit(url: string, progress: ProgressFn, shouldStop?: ShouldStop): Promise<ScrapeResult> {
  try {
    const u = new URL(url);
    u.pathname = canonicalThreadPath(u.pathname) + '.json';
    u.searchParams.delete('context');
    u.searchParams.set('limit', '500');
    u.searchParams.set('raw_json', '1');

    progress('Fetching thread…', 12);
    const res = await fetchJson(u.toString());
    if (!res.ok) {
      if (res.status === 429)
        return { success: false, comments: [], post: null, platform: 'reddit', error: 'Reddit rate-limited the request. Try again in a moment.', rateLimited: true };
      return { success: false, comments: [], post: null, platform: 'reddit', error: `Reddit returned ${res.status}.` };
    }

    const data = await res.json();
    const listing = data?.[0]?.data?.children?.[0]?.data;
    const linkId: string = data?.[0]?.data?.children?.[0]?.data?.name || '';
    const post: Post = {
      title: listing?.title || '',
      body: listing?.selftext || '',
      url: listing?.permalink ? `https://www.reddit.com${listing.permalink}` : url,
      source: deriveSource(url, 'reddit'),
      author: listing?.author || '',
      score: listing?.score || 0,
      numComments: listing?.num_comments || 0,
    };

    const seen = new Set<string>();
    const comments: Comment[] = [];
    const more: RedditMore[] = [];
    parseTree(data?.[1]?.data?.children ?? [], 0, seen, comments, more);

    if (more.length && linkId) {
      progress(`Found ${comments.length} comments, loading more…`, 30);
      comments.push(...(await drainMore(linkId, more, seen, comments.length, progress, shouldStop)));
    }

    progress(`Loaded ${comments.length} comments`, 96);
    return { success: true, comments, post, platform: 'reddit', method: 'json' };
  } catch (err) {
    return { success: false, comments: [], post: null, platform: 'reddit', error: (err as Error).message };
  }
}
