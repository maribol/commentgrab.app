import type { CommentGrabMessage, PingResponse } from '@/shared/messaging';
import type { ScrapeResult } from '@/shared/types';
import { detectPlatform } from '@/shared/platform';
import { reportProgress } from '@/shared/messaging';
import { getSettings, onStorageChanged } from '@/shared/storage';
import { scrapeYouTube } from './dom/youtube';
import { scrapeGoogleMaps } from './dom/googlemaps';
import { scrapeGeneric } from './dom/generic';
import { widgetState } from './state';
import { mountWidget } from './mount';

declare global {
  interface Window {
    __commentgrabInjected?: boolean;
  }
}

if (!window.__commentgrabInjected) {
  window.__commentgrabInjected = true;
  init();
}

function syncFromUrl(): void {
  widgetState.url = location.href;
  widgetState.pageTitle = document.title;
  widgetState.platform = detectPlatform(location.href);
}

async function init(): Promise<void> {
  syncFromUrl();

  const settings = await getSettings();
  widgetState.enabled = settings.widgetEnabled;
  widgetState.position = settings.widgetPosition;

  mountWidget();

  // Reflect live settings changes (toggle widget / move it).
  onStorageChanged((keys) => {
    if (!keys.includes('commentgrab:settings')) return;
    getSettings().then((s) => {
      widgetState.enabled = s.widgetEnabled;
      widgetState.position = s.widgetPosition;
    });
  });

  // SPA navigations (YouTube, new Reddit) change the URL without a reload.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      syncFromUrl();
    } else if (widgetState.pageTitle !== document.title) {
      widgetState.pageTitle = document.title;
    }
  }, 1000);

  // Set by a 'cancelScrape' tab message; reset at the start of each content scrape.
  let cancelRequested = false;

  // Respond to popup-initiated scrapes (DOM platforms) and pings.
  chrome.runtime.onMessage.addListener((message: CommentGrabMessage, _sender, sendResponse) => {
    if (!message) return undefined;

    if (message.kind === 'ping') {
      sendResponse({ ready: true, platform: detectPlatform(location.href) } satisfies PingResponse);
      return undefined;
    }

    if (message.kind === 'cancelScrape') {
      cancelRequested = true;
      widgetState.stopRequested = true; // also stop a widget-initiated DOM scrape
      return undefined;
    }

    if (message.kind === 'contentScrape') {
      cancelRequested = false;
      const shouldStop = () => cancelRequested;
      const onProgress = (msg: string, percent: number) => reportProgress({ message: msg, percent });
      const run: Promise<ScrapeResult> =
        message.platform === 'youtube'
          ? scrapeYouTube(message.options ?? {}, onProgress, shouldStop)
          : message.platform === 'googlemaps'
            ? scrapeGoogleMaps(message.options ?? {}, onProgress, shouldStop)
            : scrapeGeneric(message.options ?? {}, onProgress, shouldStop);
      run.then(sendResponse);
      return true; // async
    }

    return undefined;
  });
}
