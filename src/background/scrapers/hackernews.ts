import type { Comment, Post, ScrapeResult } from '@/shared/types';
import type { ProgressFn } from './reddit';

const API = 'https://hacker-news.firebaseio.com/v0';
const BATCH = 25;

/** Service workers have no DOM, so decode HN's HTML with regex. */
function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<p>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#62;/g, '>')
    .replace(/&#60;/g, '<')
    .replace(/&amp;/g, '&')
    .trim();
}

function linksFromHtml(html: string): string[] {
  const out: string[] = [];
  const rx = /href="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html || ''))) if (!m[1].startsWith('javascript:')) out.push(m[1]);
  return out;
}

interface HnItem {
  id: number;
  type?: string;
  by?: string;
  text?: string;
  title?: string;
  url?: string;
  time?: number;
  kids?: number[];
  descendants?: number;
  dead?: boolean;
  deleted?: boolean;
}

async function fetchItem(id: number): Promise<HnItem | null> {
  const res = await fetch(`${API}/item/${id}.json`);
  if (!res.ok) return null;
  return res.json();
}

async function walk(
  kidIds: number[],
  depth: number,
  out: Comment[],
  total: number,
  seen: Set<number>,
  progress: ProgressFn,
): Promise<void> {
  const queue = kidIds.filter((id) => !seen.has(id));
  for (const id of queue) seen.add(id);

  for (let i = 0; i < queue.length; i += BATCH) {
    const batch = queue.slice(i, i + BATCH);
    if (i > 0) await new Promise((r) => setTimeout(r, 100));
    const items = await Promise.all(batch.map(fetchItem));
    for (const item of items) {
      if (!item || item.dead || item.deleted || item.type !== 'comment') continue;
      const text = htmlToText(item.text || '');
      if (!text) continue;
      out.push({
        text,
        author: item.by || '',
        timestamp: item.time ? new Date(item.time * 1000).toISOString() : '',
        permalink: `https://news.ycombinator.com/item?id=${item.id}`,
        links: linksFromHtml(item.text || ''),
        score: 'Hidden',
        depth,
        commentId: String(item.id),
        replyCount: item.kids?.length ?? 0,
      });
      if (item.kids?.length) await walk(item.kids, depth + 1, out, total, seen, progress);
    }
    progress(`Loading comments… ${out.length} found`, Math.min(90, 20 + Math.round((out.length / Math.max(total, 1)) * 70)));
  }
}

export async function scrapeHackerNews(url: string, progress: ProgressFn): Promise<ScrapeResult> {
  try {
    const id = url.match(/[?&]id=(\d+)/)?.[1];
    if (!id) return { success: false, comments: [], post: null, platform: 'hackernews', error: 'Invalid Hacker News URL.' };

    progress('Fetching story…', 12);
    const story = await fetchItem(Number(id));
    if (!story) return { success: false, comments: [], post: null, platform: 'hackernews', error: 'Story not found.' };

    const post: Post = {
      title: story.title || '',
      body: htmlToText(story.text || ''),
      url: story.url || `https://news.ycombinator.com/item?id=${id}`,
      source: 'Hacker News',
      author: story.by || '',
      numComments: story.descendants || 0,
    };

    const comments: Comment[] = [];
    if (story.kids?.length) {
      progress(`Loading ${story.descendants ?? '?'} comments…`, 20);
      await walk(story.kids, 0, comments, story.descendants || 0, new Set<number>(), progress);
    }

    progress(`Loaded ${comments.length} comments`, 96);
    return { success: true, comments, post, platform: 'hackernews', method: 'json' };
  } catch (err) {
    return { success: false, comments: [], post: null, platform: 'hackernews', error: (err as Error).message };
  }
}
