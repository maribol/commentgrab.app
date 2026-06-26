import type { Comment, Post, ScrapeResult } from '@/shared/types';
import type { ProgressFn } from './reddit';

/** Public, unauthenticated AppView — no login or token required. */
const APPVIEW = 'https://public.api.bsky.app/xrpc';

function extractLinks(text: string): string[] {
  const out = new Set<string>();
  const rx = /https?:\/\/[^\s)]+/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text || ''))) out.add(m[0]);
  return [...out];
}

function truncate(s: string, n: number): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function rkeyOf(uri: string): string {
  return uri.split('/').pop() || '';
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Bluesky returned ${res.status}.`);
  return res.json();
}

interface ThreadNode {
  post?: {
    uri: string;
    author?: { handle?: string; displayName?: string };
    record?: { text?: string; createdAt?: string };
    likeCount?: number;
    replyCount?: number;
    indexedAt?: string;
  };
  replies?: ThreadNode[];
  // #notFoundPost / #blockedPost nodes simply lack `post`.
}

function walk(node: ThreadNode, depth: number, out: Comment[], seen: Set<string>): void {
  const p = node.post;
  if (p?.record && !seen.has(p.uri)) {
    seen.add(p.uri);
    const handle = p.author?.handle || '';
    out.push({
      text: (p.record.text || '').trim(),
      author: handle,
      timestamp: p.record.createdAt || p.indexedAt || '',
      permalink: handle ? `https://bsky.app/profile/${handle}/post/${rkeyOf(p.uri)}` : '',
      links: extractLinks(p.record.text || ''),
      score: typeof p.likeCount === 'number' ? p.likeCount : 'Hidden',
      depth,
      commentId: p.uri,
      replyCount: p.replyCount ?? 0,
    });
  }
  if (Array.isArray(node.replies)) for (const child of node.replies) walk(child, depth + 1, out, seen);
}

function fail(error: string): ScrapeResult {
  return { success: false, comments: [], post: null, platform: 'bluesky', error };
}

export async function scrapeBluesky(url: string, progress: ProgressFn): Promise<ScrapeResult> {
  try {
    const m = new URL(url).pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)/i);
    if (!m) return fail('Not a Bluesky post URL.');
    let did = m[1];
    const rkey = m[2];

    if (!did.startsWith('did:')) {
      progress('Resolving handle…', 12);
      const r = await getJson(`${APPVIEW}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(did)}`);
      did = r?.did;
      if (!did) return fail('Could not resolve Bluesky handle.');
    }

    progress('Fetching thread…', 30);
    const uri = `at://${did}/app.bsky.feed.post/${rkey}`;
    const data = await getJson(
      `${APPVIEW}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=1000&parentHeight=0`,
    );
    const thread: ThreadNode | undefined = data?.thread;
    const root = thread?.post;
    if (!root) return fail('Bluesky post not found or unavailable.');

    const handle = root.author?.handle || '';
    const post: Post = {
      title: root.record?.text ? truncate(root.record.text, 100) : `@${handle}`,
      body: root.record?.text || '',
      url,
      source: handle ? `@${handle}` : 'Bluesky',
      author: handle,
      score: root.likeCount || 0,
      numComments: root.replyCount || 0,
    };

    const comments: Comment[] = [];
    const seen = new Set<string>();
    if (Array.isArray(thread?.replies)) for (const child of thread!.replies) walk(child, 0, comments, seen);

    progress(`Loaded ${comments.length} replies`, 96);
    return { success: true, comments, post, platform: 'bluesky', method: 'json' };
  } catch (err) {
    return fail((err as Error).message);
  }
}
