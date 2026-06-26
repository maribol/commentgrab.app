import { reactive } from 'vue';
import type { PlatformId } from '@/shared/types';

export const widgetState = reactive<{
  platform: PlatformId | null;
  url: string;
  pageTitle: string;
  enabled: boolean;
  position: 'bottom-left' | 'bottom-right';
  /** Flipped to true to ask an in-flight scrape to stop early. */
  stopRequested: boolean;
}>({
  platform: null,
  url: location.href,
  pageTitle: document.title,
  enabled: true,
  position: 'bottom-left',
  stopRequested: false,
});
