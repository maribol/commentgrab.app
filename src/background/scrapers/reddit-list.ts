import type { BatchPost, BatchScrapeResult, PostStub } from '@/shared/types';
import { truncate } from '@/shared/util';
import { scrapeReddit, type ProgressFn, type ShouldStop } from './reddit';

/** Comments kept per post — the initial thread JSON, no deep "load more". */
const PER_POST_CAP = 300;
/** Politeness gap between per-post thread fetches. */
const POST_GAP_MS = 250;

export interface BatchStubsRequest {
  /** Candidate posts read from the list page's DOM. */
  stubs: PostStub[];
  /** Display label for the run. */
  query: string;
  source: string;
  /** The list page the posts came from. */
  url: string;
  /** How many of the top-ranked posts to actually scrape. */
  limit: number;
}

/**
 * Scrape the top `limit` posts (ranked by comment count) from a set of stubs
 * read off a Reddit list page. Each post's comments are fetched in "fast" mode
 * (capped, no deep drilling) so a whole batch stays quick and gentle on Reddit's
 * rate limits. Posts are fetched sequentially; a Stop keeps whatever finished.
 */
export async function scrapeBatchFromStubs(
  req: BatchStubsRequest,
  progress: ProgressFn,
  shouldStop?: ShouldStop,
): Promise<BatchScrapeResult> {
  const base = { query: req.query, source: req.source, url: req.url };
  if (!req.stubs.length) {
    return { success: false, ...base, posts: [], error: 'No posts found on this page.' };
  }

  // Rank by comment count (V8's stable sort keeps the page's order when counts
  // are equal or unavailable), then take the requested top N.
  const stubs = [...req.stubs].sort((a, b) => b.numComments - a.numComments).slice(0, Math.max(1, req.limit));

  const posts: BatchPost[] = [];
  for (let i = 0; i < stubs.length; i++) {
    if (shouldStop?.()) break; // Stop pressed — keep what we have
    const stub = stubs[i];
    const pct = Math.min(96, 25 + Math.round(((i + 0.5) / stubs.length) * 70));
    progress(`Scraping post ${i + 1}/${stubs.length} — ${truncate(stub.title || 'post', 60)}`, pct);
    if (i > 0) await new Promise((r) => setTimeout(r, POST_GAP_MS));
    // Swallow the per-post progress; the batch-level message above is enough.
    const result = await scrapeReddit(stub.url, () => {}, shouldStop, { fast: true, maxComments: PER_POST_CAP });
    // Keep the list page's comment count as the post's headline number even when
    // fast mode caps the actual scrape, so the dashboard shows the true size.
    if (result.post) result.post.numComments = stub.numComments || result.post.numComments;
    posts.push({ stub, result });
  }

  const anyOk = posts.some((p) => p.result.success);
  return { success: anyOk, ...base, posts, error: anyOk ? undefined : 'Could not scrape any of the posts.' };
}
