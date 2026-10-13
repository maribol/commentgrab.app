// Generated spot illustrations (Gemini, EF house line style in the CommentGrab lilac palette).
// Sources, prompts and montages: ~/scratchpad/spectra/illustrations/. 256px WebP, hero 512px.
import type { PlatformId } from '@/shared/types';
import hero from './hero.webp';
import reddit from './reddit.webp';
import youtube from './youtube.webp';
import hackernews from './hackernews.webp';
import steam from './steam.webp';
import stepOpen from './step-open.webp';
import stepScrape from './step-scrape.webp';
import stepExport from './step-export.webp';

export const heroIllustration = hero;
export const stepIllustrations = [stepOpen, stepScrape, stepExport] as const;
export const platformIllustrations: Partial<Record<PlatformId, string>> = { reddit, youtube, hackernews, steam };
