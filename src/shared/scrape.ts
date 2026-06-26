import type { ScrapeOptions, ScrapeResult, SavedCollection, AppSettings } from './types';
import { usesBackgroundFetch } from './platform';
import { requestBackgroundScrape, requestContentScrape } from './messaging';
import { recordScrape } from './stats';
import { addHistory, updateHistory, upsertCollection } from './storage';
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
