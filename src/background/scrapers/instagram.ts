import type { Comment, Post, ScrapeResult } from '@/shared/types';
import type { ProgressFn, ShouldStop } from './reddit';

/**
 * Instagram post / reel comments via Instagram's public GraphQL endpoint —
 * fetched straight from the service worker (CORS is granted by the
 * instagram.com host permission), the same clean model as our Reddit scraper.
 * No MAIN-world hook, no content script, no cookies: this hits the legacy
 * `query_hash` query that serves public-post comments unauthenticated.
 *
 * Caveat: that endpoint is on borrowed time — Instagram rate-limits it and may
 * retire it. We surface a partial result + a friendly rate-limit message rather
 * than failing hard, so the user keeps whatever loaded.
 */

const GRAPHQL_URL = 'https://www.instagram.com/graphql/query/';
/** "PostPageContainerQuery" comment-by-shortcode hash. Top-level comments only. */
const COMMENTS_QUERY_HASH = '33ba35852cb50da46f5b5e889df7d159';
const PER_PAGE = 50;
/** Politeness gap between pages so we don't trip Instagram's limiter. */
const PAGE_DELAY_MS = 800;
/** Safety cap so a runaway thread can't loop forever. */
const MAX_PAGES = 300;

const URL_RE = /(?<![("])\bhttps?:\/\/[^\s)<>\]]+/g;

function extractLinks(text: string): string[] {
  if (!text) return [];
  return [...new Set(text.match(URL_RE) ?? [])];
}

/** Pull the shortcode from /p/<code>/, /reel/<code>/ or /tv/<code>/. */
function shortcodeOf(url: string): string {
  const m = /\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i.exec(url);
  return m?.[1] ?? '';
}

interface IgCommentNode {
  id: string;
  text: string;
  created_at: number;
  owner?: { id?: string; username?: string; profile_pic_url?: string };
  edge_liked_by?: { count?: number };
}

interface IgCommentEdge {
  node: IgCommentNode;
}

function buildUrl(shortcode: string, after: string): string {
  const variables = JSON.stringify({ shortcode, first: PER_PAGE, after });
  return `${GRAPHQL_URL}?query_hash=${COMMENTS_QUERY_HASH}&variables=${encodeURIComponent(variables)}`;
}

function toComment(node: IgCommentNode, shortcode: string): Comment {
  const username = node.owner?.username ?? '';
  return {
    text: (node.text ?? '').trim(),
    author: username,
    timestamp: node.created_at ? new Date(node.created_at * 1000).toISOString() : '',
    permalink: node.id ? `https://www.instagram.com/p/${shortcode}/c/${node.id}/` : '',
    links: extractLinks(node.text ?? ''),
    score: typeof node.edge_liked_by?.count === 'number' ? node.edge_liked_by.count : 'Hidden',
    depth: 0,
    commentId: node.id || '',
    type: 'comment',
  };
}

export async function scrapeInstagram(url: string, progress: ProgressFn, shouldStop?: ShouldStop): Promise<ScrapeResult> {
  const shortcode = shortcodeOf(url);
  if (!shortcode) {
    return { success: false, comments: [], post: null, platform: 'instagram', error: 'Could not read the post code from this Instagram URL.' };
  }

  const comments: Comment[] = [];
  const seen = new Set<string>();
  let post: Post | null = null;
  let after = '';
  let total = 0;
  let rateLimited = false;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      if (shouldStop?.()) break;
      if (page > 0) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));

      progress(page === 0 ? 'Fetching comments…' : `Loading comments… ${comments.length} found`, page === 0 ? 12 : Math.min(92, 20 + page * 4));

      const res = await fetch(buildUrl(shortcode, after), { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        // 4xx here is almost always Instagram's rate limiter / login wall.
        rateLimited = res.status === 429 || res.status === 401 || res.status === 403;
        break;
      }

      const media = (await res.json())?.data?.shortcode_media;
      if (!media) {
        rateLimited = true; // empty payload = throttled
        break;
      }

      if (!post) {
        const owner = media.owner?.username ? `@${media.owner.username}` : 'Instagram';
        const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text ?? '';
        total = media.edge_media_to_comment?.count ?? 0;
        post = {
          title: caption ? caption.split('\n')[0].slice(0, 120) : `Instagram post by ${owner}`,
          body: caption,
          url: `https://www.instagram.com/p/${shortcode}/`,
          source: owner,
          author: media.owner?.username ?? '',
          numComments: total,
        };
      }

      const conn = media.edge_media_to_comment;
      const edges: IgCommentEdge[] = conn?.edges ?? [];
      for (const edge of edges) {
        const node = edge?.node;
        if (!node?.id || seen.has(node.id)) continue;
        seen.add(node.id);
        comments.push(toComment(node, shortcode));
      }

      const pageInfo = conn?.page_info;
      if (!pageInfo?.has_next_page || !pageInfo?.end_cursor || edges.length === 0) break;
      after = pageInfo.end_cursor;
    }

    if (comments.length === 0) {
      return {
        success: false,
        comments: [],
        post,
        platform: 'instagram',
        error: rateLimited
          ? 'Instagram rate-limited the request. Wait a few minutes and try again.'
          : 'No comments found. Open a public Instagram post or reel and try again.',
        rateLimited,
      };
    }

    progress(`Loaded ${comments.length} comments`, 96);
    return { success: true, comments, post, platform: 'instagram', method: 'json', rateLimited };
  } catch (err) {
    // Return whatever we managed to collect rather than discarding it.
    if (comments.length) {
      return { success: true, comments, post, platform: 'instagram', method: 'json', rateLimited: true };
    }
    return { success: false, comments: [], post, platform: 'instagram', error: (err as Error).message };
  }
}
