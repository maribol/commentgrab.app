import type { Comment, Post, ScrapeResult } from '@/shared/types';
import type { ProgressFn } from './reddit';

const REVIEWS_API = 'https://store.steampowered.com/appreviews';
const MAX_PAGES = 100;

function appIdFromUrl(url: string): string | null {
  return url.match(/\/app\/(\d+)/)?.[1] ?? url.match(/\/recommended\/(\d+)\/?/)?.[1] ?? null;
}

interface SteamReview {
  recommendationid?: string;
  author?: { steamid?: string; playtime_forever?: number };
  review?: string;
  voted_up?: boolean;
  votes_up?: number;
  timestamp_created?: number;
}

function reviewToComment(r: SteamReview, appId: string): Comment {
  const verdict = r.voted_up ? 'Recommended' : 'Not Recommended';
  const hours = r.author?.playtime_forever ? Math.round(r.author.playtime_forever / 60) : 0;
  const playtime = hours ? ` · ${hours}h played` : '';
  return {
    text: `[${verdict}${playtime}]\n\n${(r.review || '').trim()}`,
    author: r.author?.steamid || '',
    timestamp: r.timestamp_created ? new Date(r.timestamp_created * 1000).toISOString() : '',
    permalink: r.author?.steamid ? `https://steamcommunity.com/profiles/${r.author.steamid}/recommended/${appId}/` : '',
    links: [],
    score: typeof r.votes_up === 'number' ? r.votes_up : 0,
    depth: 0,
    commentId: r.recommendationid || '',
    type: 'review',
  };
}

function reviewsUrl(appId: string, cursor: string): string {
  const params = new URLSearchParams({
    json: '1',
    filter: 'recent',
    language: 'all',
    num_per_page: '100',
    cursor,
    review_type: 'all',
    purchase_type: 'all',
  });
  return `${REVIEWS_API}/${appId}?${params}`;
}

export async function scrapeSteam(url: string, progress: ProgressFn): Promise<ScrapeResult> {
  const appId = appIdFromUrl(url);
  if (!appId) return { success: false, comments: [], post: null, platform: 'steam', error: 'Could not detect the Steam app id.' };

  try {
    progress('Fetching Steam reviews…', 12);
    const [detailsRes, firstRes] = await Promise.all([
      fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`),
      fetch(reviewsUrl(appId, '*')),
    ]);

    let title = `Steam App ${appId}`;
    try {
      const details = await detailsRes.json();
      if (details?.[appId]?.success) title = details[appId].data?.name || title;
    } catch {
      /* keep default title */
    }

    const first = await firstRes.json();
    if (first?.success !== 1) throw new Error('Steam returned an error.');

    const summary = first.query_summary ?? {};
    const post: Post = {
      title,
      body: [summary.review_score_desc, summary.total_reviews ? `${Number(summary.total_reviews).toLocaleString()} reviews` : '']
        .filter(Boolean)
        .join(' · '),
      url: `https://store.steampowered.com/app/${appId}/`,
      source: 'Steam',
      numComments: summary.total_reviews || 0,
    };

    const comments: Comment[] = [];
    const seen = new Set<string>();
    const append = (rows: SteamReview[]) => {
      for (const r of rows) {
        const c = reviewToComment(r, appId);
        const key = c.commentId || c.permalink || `${c.author}|${c.timestamp}`;
        if (seen.has(key)) continue;
        seen.add(key);
        comments.push(c);
      }
    };

    append(first.reviews || []);
    let cursor: string = first.cursor;
    progress(`Found ${comments.length} reviews…`, 22);

    for (let page = 1; page < MAX_PAGES; page++) {
      if (!cursor || cursor === '*') break;
      await new Promise((r) => setTimeout(r, 400));
      const res = await fetch(reviewsUrl(appId, cursor));
      const data = await res.json();
      if (data?.success !== 1 || !(data.reviews?.length)) break;
      append(data.reviews);
      if (data.cursor === cursor) break;
      cursor = data.cursor;
      progress(`Loading reviews… ${comments.length} found`, Math.min(90, 22 + page * 4));
    }

    progress(`Loaded ${comments.length} reviews`, 96);
    return { success: true, comments, post, platform: 'steam', method: 'json' };
  } catch (err) {
    return { success: false, comments: [], post: null, platform: 'steam', error: (err as Error).message };
  }
}
