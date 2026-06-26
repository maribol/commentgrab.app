import type { PlatformId, ScrapeOptions, ScrapeResult } from '@/shared/types';
import { usesBackgroundFetch } from '@/shared/platform';
import { requestBackgroundScrape } from '@/shared/messaging';
import { scrapeYouTube } from './dom/youtube';
import { scrapeGoogleMaps } from './dom/googlemaps';
import { scrapeGeneric } from './dom/generic';

type Progress = (message: string, percent: number) => void;
type ShouldStop = () => boolean;

/**
 * Run a scrape from inside the content script: JSON platforms go to the
 * service worker; DOM platforms run right here against the live page.
 */
export function scrapeLocal(
  platform: PlatformId,
  url: string,
  options: ScrapeOptions,
  onProgress: Progress,
  shouldStop?: ShouldStop,
): Promise<ScrapeResult> {
  if (usesBackgroundFetch(platform)) {
    return requestBackgroundScrape(platform, url, options);
  }
  if (platform === 'youtube') return scrapeYouTube(options, onProgress, shouldStop);
  if (platform === 'googlemaps') return scrapeGoogleMaps(options, onProgress, shouldStop);
  return scrapeGeneric(options, onProgress, shouldStop);
}
