import type { BatchRun, BatchScrapeResult, ScrapeOptions, ScrapeResult, SavedCollection, AppSettings } from './types';
import { usesBackgroundFetch } from './platform';
import { requestBackgroundScrape, requestContentScrape } from './messaging';
import { recordScrape } from './stats';
import { addHistory, updateHistory, upsertCollection, upsertBatch } from './storage';
import { uid } from './util';

/** Route a scrape to the service worker (JSON APIs) or the tab's content script (DOM). */
export async function runScrape(
  platform: ScrapeResult['platform'],
  url: string,
  tabId?: number,
  options?: ScrapeOptions,
): Promise<ScrapeResult> {
  if (usesBackgroundFetch(platform)) {
    return requestBackgroundScrape(platform, url, options);
  }
  if (typeof tabId !== 'number') {
    return { success: false, comments: [], post: null, platform, error: 'No active tab to scrape.' };
  }
  return requestContentScrape(tabId, platform, url, options);
}

export function buildCollection(result: ScrapeResult, url: string, note?: string, boardIds?: string[]): SavedCollection {
  const now = Date.now();
  const title = result.post?.title || result.post?.source || 'Untitled scrape';
  return {
    id: uid('col'),
    title,
    platform: result.platform,
    source: result.post?.source || '',
    url,
    post: result.post,
    comments: result.comments,
    commentCount: result.comments.length,
    createdAt: now,
    updatedAt: now,
    note,
    analysis: null,
    boardIds: boardIds?.length ? boardIds : undefined,
  };
}

export async function saveResultAsCollection(result: ScrapeResult, url: string, note?: string, boardIds?: string[]): Promise<SavedCollection> {
  const collection = buildCollection(result, url, note, boardIds);
  await upsertCollection(collection);
  return collection;
}

/** Record stats + history for a successful scrape; optionally auto-save a collection. */
export async function finalizeScrape(
  result: ScrapeResult,
  url: string,
  settings: AppSettings,
): Promise<{ collectionId?: string; historyId?: string }> {
  if (!result.success) return {};

  await recordScrape(result.platform, result.comments.length);

  let collectionId: string | undefined;
  if (settings.autoSave) {
    const collection = await saveResultAsCollection(result, url);
    collectionId = collection.id;
  }

  const historyId = uid('h');
  await addHistory({
    id: historyId,
    platform: result.platform,
    title: result.post?.title || result.post?.source || 'Scrape',
    source: result.post?.source || '',
    url,
    commentCount: result.comments.length,
    scrapedAt: Date.now(),
    savedCollectionId: collectionId,
  });

  return { collectionId, historyId };
}

/**
 * Persist the full scrape (all comments) to a collection and link it back to
 * its history entry so it's openable from History and the dashboard.
 */
export async function saveAndLink(
  result: ScrapeResult,
  url: string,
  historyId: string | null,
  boardIds?: string[],
): Promise<SavedCollection> {
  const collection = await saveResultAsCollection(result, url, undefined, boardIds);
  if (historyId) await updateHistory(historyId, { savedCollectionId: collection.id });
  return collection;
}

/**
 * Persist a batch scrape: save each successful post as its own collection
 * (tagged with the batch id so it's still individually openable), group them
 * under a BatchRun in ranked order, and record stats + a single history entry.
 */
export async function saveBatch(batch: BatchScrapeResult, url: string): Promise<BatchRun> {
  const now = Date.now();
  const batchId = uid('batch');
  const collectionIds: string[] = [];
  let totalComments = 0;

  for (const { result } of batch.posts) {
    if (!result.success) continue;
    const collection = buildCollection(result, result.post?.url || url);
    collection.batchId = batchId;
    await upsertCollection(collection);
    collectionIds.push(collection.id);
    totalComments += result.comments.length;
    await recordScrape(result.platform, result.comments.length);
  }

  const run: BatchRun = {
    id: batchId,
    platform: 'reddit',
    query: batch.query,
    source: batch.source,
    url,
    sort: 'comments',
    createdAt: now,
    updatedAt: now,
    collectionIds,
  };
  await upsertBatch(run);

  await addHistory({
    id: uid('h'),
    platform: 'reddit',
    title: `Batch: ${batch.query}`,
    source: batch.source,
    url,
    commentCount: totalComments,
    scrapedAt: now,
  });

  return run;
}
