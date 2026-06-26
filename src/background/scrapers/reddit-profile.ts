import type { Comment, Post, ScrapeResult } from '@/shared/types';
import type { ProgressFn } from './reddit';

const MAX_PAGES = 10;
const PAGE_SIZE = 100;

function usernameFromUrl(url: string): string | null {
  try {
    const m = new URL(url).pathname.match(/\/u(?:ser)?\/([^/]+)/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function mapChild(child: { kind: string; data: Record<string, any> }): Comment | null {
  const d = child.data;
  const base = {
    author: d.author || '',
    timestamp: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : '',
    permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : '',
    links: [] as string[],
    score: (typeof d.score === 'number' ? d.score : 'Hidden') as number | 'Hidden',
    depth: 0,
    subreddit: d.subreddit || '',
  };

  if (child.kind === 't1') {
    if (!d.body || d.body === '[deleted]' || d.body === '[removed]') return null;
    return {
      ...base,
      text: String(d.body).trim(),
      commentId: d.name || (d.id ? `t1_${d.id}` : ''),
      type: 'comment',
      title: d.link_title || '',
    };
  }
  if (child.kind === 't3') {
    const text = (d.selftext && d.selftext.trim()) || d.title || '';
    return {
      ...base,
      text: String(text).trim(),
      commentId: d.name || (d.id ? `t3_${d.id}` : ''),
      type: 'post',
      title: d.title || '',
      links: d.url && !d.is_self ? [d.url] : [],
    };
  }
  return null;
}

export async function scrapeRedditProfile(url: string, progress: ProgressFn): Promise<ScrapeResult> {
  const username = usernameFromUrl(url);
  if (!username) {
    return { success: false, comments: [], post: null, platform: 'redditProfile', error: 'Could not read the Reddit username from the URL.' };
  }

  try {
    progress(`Fetching u/${username}…`, 12);
    const items: Comment[] = [];
    let after: string | null = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), raw_json: '1' });
      if (after) params.set('after', after);
      const res = await fetch(`https://www.reddit.com/user/${encodeURIComponent(username)}.json?${params}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        if (page === 0) {
          if (res.status === 429)
            return { success: false, comments: [], post: null, platform: 'redditProfile', error: 'Reddit rate-limited the request. Try again shortly.', rateLimited: true };
          return { success: false, comments: [], post: null, platform: 'redditProfile', error: `Reddit returned ${res.status}.` };
        }
        break;
      }
      const data = await res.json();
      const children = data?.data?.children ?? [];
      for (const child of children) {
        const mapped = mapChild(child);
        if (mapped) items.push(mapped);
      }
      progress(`Loaded ${items.length} posts & comments…`, Math.min(92, 20 + page * 8));
      after = data?.data?.after ?? null;
      if (!after) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    const post: Post = {
      title: `u/${username}`,
      body: '',
      url: `https://www.reddit.com/user/${username}/`,
      source: `u/${username}`,
      author: username,
      numComments: items.length,
    };

    progress(`Loaded ${items.length} items`, 96);
    return { success: true, comments: items, post, platform: 'redditProfile', method: 'json' };
  } catch (err) {
    return { success: false, comments: [], post: null, platform: 'redditProfile', error: (err as Error).message };
  }
}
