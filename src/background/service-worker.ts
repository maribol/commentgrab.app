import type { PlatformId, ScrapeResult } from '@/shared/types';
import type { CommentGrabMessage } from '@/shared/messaging';
import { scrapeReddit, type ProgressFn, type ShouldStop } from './scrapers/reddit';
import { scrapeRedditProfile } from './scrapers/reddit-profile';
import { scrapeHackerNews } from './scrapers/hackernews';
import { scrapeSteam } from './scrapers/steam';
import { scrapeBluesky } from './scrapers/bluesky';
import { scrapeGitHub } from './scrapers/github';
import { scrapeStackExchange } from './scrapers/stackexchange';
import { scrapeInstagram } from './scrapers/instagram';

// Set by a 'cancelScrape' message; reset at the start of each background scrape.
let cancelRequested = false;

function dispatch(platform: PlatformId, url: string, progress: ProgressFn, shouldStop: ShouldStop): Promise<ScrapeResult> {
  switch (platform) {
    case 'reddit':
      return scrapeReddit(url, progress, shouldStop);
    case 'redditProfile':
      return scrapeRedditProfile(url, progress);
    case 'hackernews':
      return scrapeHackerNews(url, progress);
    case 'steam':
      return scrapeSteam(url, progress);
    case 'bluesky':
      return scrapeBluesky(url, progress);
    case 'github':
      return scrapeGitHub(url, progress, shouldStop);
    case 'stackexchange':
      return scrapeStackExchange(url, progress, shouldStop);
    case 'instagram':
      return scrapeInstagram(url, progress, shouldStop);
    default:
      return Promise.resolve({
        success: false,
        comments: [],
        post: null,
        platform,
        error: `Platform "${platform}" is scraped on-page, not by the service worker.`,
      });
  }
}

chrome.runtime.onMessage.addListener((message: CommentGrabMessage, sender, sendResponse) => {
  if (message?.kind === 'openDashboard') {
    const url = chrome.runtime.getURL('src/dashboard/index.html') + (message.path ? `#${message.path}` : '');
    chrome.tabs.create({ url }).catch(() => {});
    return undefined;
  }

  if (message?.kind === 'cancelScrape') {
    cancelRequested = true;
    return undefined;
  }

  if (!message || message.kind !== 'bgScrape') return undefined;

  cancelRequested = false; // fresh scrape
  const tabId = sender.tab?.id;
  // Push progress to the popup (runtime broadcast) and, if a content script
  // started the scrape, back to its tab so the on-page widget updates too.
  const progress: ProgressFn = (msg, percent) => {
    const payload: CommentGrabMessage = { kind: 'progress', progress: { message: msg, percent } };
    chrome.runtime.sendMessage(payload).catch(() => {});
    if (typeof tabId === 'number') chrome.tabs.sendMessage(tabId, payload).catch(() => {});
  };

  dispatch(message.platform, message.url, progress, () => cancelRequested)
    .then(sendResponse)
    .catch((err: unknown) =>
      sendResponse({
        success: false,
        comments: [],
        post: null,
        platform: message.platform,
        error: (err as Error)?.message ?? 'Scrape failed.',
      } satisfies ScrapeResult),
    );
  return true; // async sendResponse
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open the setup page (language + optional API key) on first install.
    const url = chrome.runtime.getURL('src/dashboard/index.html') + '#/welcome';
    chrome.tabs.create({ url }).catch(() => {});
  }
});
