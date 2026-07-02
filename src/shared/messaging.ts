import type { BatchScrapeResult, PlatformId, PostStub, ScrapeOptions, ScrapeProgress, ScrapeResult } from './types';

export type CommentGrabMessage =
  | { kind: 'bgScrape'; platform: PlatformId; url: string; options?: ScrapeOptions }
  | { kind: 'bgBatchScrape'; stubs: PostStub[]; query: string; source: string; url: string; limit: number }
  | { kind: 'listScrape'; want: number }
  | { kind: 'contentScrape'; platform: PlatformId; url: string; options?: ScrapeOptions }
  | { kind: 'ping' }
  | { kind: 'progress'; progress: ScrapeProgress }
  | { kind: 'openDashboard'; path?: string }
  | { kind: 'cancelScrape' };

export interface PingResponse {
  ready: boolean;
  platform?: PlatformId | null;
}

/** Post list read from a Reddit list page's DOM. */
export interface ListScrapeResult {
  success: boolean;
  stubs: PostStub[];
  error?: string;
}

export interface BatchScrapeRequest {
  stubs: PostStub[];
  query: string;
  source: string;
  url: string;
  limit: number;
}

/** Ask the service worker to fetch a JSON-API platform (reddit/HN/steam). */
export function requestBackgroundScrape(
  platform: PlatformId,
  url: string,
  options?: ScrapeOptions,
): Promise<ScrapeResult> {
  return chrome.runtime.sendMessage<CommentGrabMessage, ScrapeResult>({ kind: 'bgScrape', platform, url, options });
}

/** Ask a tab's content script to read the ranked post list off a Reddit list page's DOM. */
export function requestListScrape(tabId: number, want: number): Promise<ListScrapeResult> {
  return chrome.tabs.sendMessage<CommentGrabMessage, ListScrapeResult>(tabId, { kind: 'listScrape', want });
}

/** Ask the service worker to scrape comments for the ranked top N posts. */
export function requestBatchScrape(req: BatchScrapeRequest): Promise<BatchScrapeResult> {
  return chrome.runtime.sendMessage<CommentGrabMessage, BatchScrapeResult>({ kind: 'bgBatchScrape', ...req });
}

/** Ask a tab's content script to scrape the live DOM (youtube/generic). */
export function requestContentScrape(
  tabId: number,
  platform: PlatformId,
  url: string,
  options?: ScrapeOptions,
): Promise<ScrapeResult> {
  return chrome.tabs.sendMessage<CommentGrabMessage, ScrapeResult>(tabId, {
    kind: 'contentScrape',
    platform,
    url,
    options,
  });
}

export async function pingContent(tabId: number): Promise<PingResponse> {
  try {
    const res = await chrome.tabs.sendMessage<CommentGrabMessage, PingResponse>(tabId, { kind: 'ping' });
    return res ?? { ready: false };
  } catch {
    return { ready: false };
  }
}

/**
 * Ensure our content script is live in the tab. A freshly (re)loaded extension
 * does not inject into already-open tabs, so the first ping fails until the
 * user reloads. Instead we inject it programmatically (needs `scripting` +
 * `activeTab`, granted by the popup gesture) and wait for it to come up.
 */
export async function ensureContentScript(tabId: number): Promise<boolean> {
  if ((await pingContent(tabId)).ready) return true;
  try {
    const files = (chrome.runtime.getManifest().content_scripts ?? []).flatMap((s) => s.js ?? []);
    if (files.length) await chrome.scripting.executeScript({ target: { tabId }, files });
  } catch {
    return false; // restricted page (chrome://, web store, etc.) — can't inject
  }
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if ((await pingContent(tabId)).ready) return true;
  }
  return false;
}

/** Fire-and-forget scrape progress broadcast. */
export function reportProgress(progress: ScrapeProgress): void {
  chrome.runtime.sendMessage<CommentGrabMessage>({ kind: 'progress', progress }).catch(() => {});
}

/**
 * Open the dashboard in a new tab via the service worker. Calling window.open
 * to a chrome-extension:// URL from a page context gets blocked by ad blockers
 * (ERR_BLOCKED_BY_CLIENT), so we let the background page create the tab.
 */
export function openDashboardTab(path = ''): void {
  chrome.runtime.sendMessage<CommentGrabMessage>({ kind: 'openDashboard', path }).catch(() => {});
}

/** Ask the service worker to stop an in-flight background scrape (reddit/HN/steam). */
export function cancelBackgroundScrape(): void {
  chrome.runtime.sendMessage<CommentGrabMessage>({ kind: 'cancelScrape' }).catch(() => {});
}

/** Ask a tab's content script to stop an in-flight DOM scrape (youtube/generic). */
export function cancelContentScrape(tabId: number): void {
  chrome.tabs.sendMessage<CommentGrabMessage>(tabId, { kind: 'cancelScrape' }).catch(() => {});
}

/** Subscribe to progress broadcasts. Returns an unsubscribe function. */
export function onProgress(cb: (progress: ScrapeProgress) => void): () => void {
  const handler = (msg: unknown): void => {
    if (msg && typeof msg === 'object' && (msg as CommentGrabMessage).kind === 'progress') {
      cb((msg as Extract<CommentGrabMessage, { kind: 'progress' }>).progress);
    }
  };
  chrome.runtime.onMessage.addListener(handler);
  return () => chrome.runtime.onMessage.removeListener(handler);
}
