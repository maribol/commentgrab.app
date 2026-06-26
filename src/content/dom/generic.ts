import type { Comment, Post, ScrapeOptions, ScrapeResult } from '@/shared/types';
import { sleep } from '@/shared/util';

type Progress = (message: string, percent: number) => void;
type ShouldStop = () => boolean;

interface SiteConfig {
  container: string;
  text: string;
  author?: string;
  rating?: string;
  date?: string;
}

const HOST_CONFIGS: Array<{ match: RegExp; config: SiteConfig }> = [
  {
    match: /(^|\.)amazon\./i,
    config: {
      container: 'div[data-hook="review"], li[data-hook="review"]',
      text: 'span[data-hook="review-body"]',
      author: 'span.a-profile-name',
      rating: 'i[data-hook="review-star-rating"] span.a-icon-alt, i[data-hook="cmps-review-star-rating"] span.a-icon-alt',
      date: 'span[data-hook="review-date"]',
    },
  },
  {
    match: /(^|\.)trustpilot\./i,
    config: {
      container: 'article[data-service-review-card-paper], article',
      text: 'p[data-service-review-text-typography], [data-service-review-text-typography]',
      author: '[data-consumer-name-typography]',
      rating: 'div[data-service-review-rating] img',
      date: 'time',
    },
  },
  {
    match: /(^|\.)etsy\./i,
    config: {
      container: '[data-region="review"], #reviews li, .shop2-review-review',
      text: '.review-text, [data-region="review"] p, p',
      author: 'a[href*="/people/"], .shop2-review-attribution',
      date: '.shop2-review-attribution time, time',
    },
  },
];

function textOf(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function ratingOf(el: Element | null): string {
  if (!el) return '';
  const alt = el.getAttribute('alt') || el.getAttribute('aria-label') || el.textContent || '';
  const m = alt.match(/([\d.]+)\s*(?:out of|\/)\s*(\d+)/i);
  if (m) return `${m[1]}/${m[2]}`;
  return alt.trim();
}

async function autoScroll(passes: number, shouldStop?: ShouldStop): Promise<void> {
  const scroller = document.scrollingElement || document.documentElement;
  for (let i = 0; i < passes; i++) {
    if (shouldStop?.()) break;
    window.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
    await sleep(450);
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function extractWithConfig(config: SiteConfig): Comment[] {
  const containers = Array.from(document.querySelectorAll(config.container));
  const out: Comment[] = [];
  const seen = new Set<string>();
  containers.forEach((c, i) => {
    const body = textOf(c.querySelector(config.text)) || textOf(c);
    if (!body || body.length < 2) return;
    const rating = config.rating ? ratingOf(c.querySelector(config.rating)) : '';
    const text = rating ? `[${rating}] ${body}` : body;
    const key = text.slice(0, 120);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      text,
      author: config.author ? textOf(c.querySelector(config.author)) : '',
      timestamp: config.date ? textOf(c.querySelector(config.date)) : '',
      permalink: '',
      links: [],
      score: 'Hidden',
      depth: 0,
      commentId: `g_${i}`,
    });
  });
  return out;
}

/** Heuristic fallback: find the largest group of sibling text blocks that read like comments. */
function extractHeuristic(): Comment[] {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[class*="comment" i], [class*="review" i], [id*="comment" i], [class*="message" i]',
    ),
  ).filter((el) => {
    const t = (el.textContent || '').trim();
    return t.length > 40 && t.length < 6000 && el.querySelectorAll('p, span').length < 60;
  });

  // Group by parent so we capture one cohesive list of comments.
  const byParent = new Map<Element, HTMLElement[]>();
  for (const el of candidates) {
    const parent = el.parentElement;
    if (!parent) continue;
    const arr = byParent.get(parent) ?? [];
    arr.push(el);
    byParent.set(parent, arr);
  }
  let best: HTMLElement[] = [];
  for (const arr of byParent.values()) if (arr.length > best.length) best = arr;
  if (best.length < 2) best = candidates.slice(0, 100);

  const out: Comment[] = [];
  const seen = new Set<string>();
  best.forEach((el, i) => {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    const key = text.slice(0, 120);
    if (!text || seen.has(key)) return;
    seen.add(key);
    out.push({ text, author: '', timestamp: '', permalink: '', links: [], score: 'Hidden', depth: 0, commentId: `h_${i}` });
  });
  return out;
}

function pageMeta(): Post {
  const h1 = document.querySelector('h1');
  return {
    title: textOf(h1) || document.title.trim(),
    body: '',
    url: location.href,
    source: location.hostname.replace(/^www\./, ''),
  };
}

export async function scrapeGeneric(options: ScrapeOptions, onProgress: Progress, shouldStop?: ShouldStop): Promise<ScrapeResult> {
  try {
    onProgress('Loading page content…', 20);
    await autoScroll(options.maxComments && options.maxComments > 200 ? 6 : 3, shouldStop);

    const host = location.hostname.toLowerCase();
    const entry = HOST_CONFIGS.find((c) => c.match.test(host));

    onProgress('Extracting comments…', 70);
    let comments = entry ? extractWithConfig(entry.config) : [];
    let method: 'dom' = 'dom';
    if (comments.length === 0) comments = extractHeuristic();

    if (comments.length === 0) {
      return {
        success: false,
        comments: [],
        post: pageMeta(),
        platform: 'generic',
        error: 'No comments detected on this page. CommentGrab works best on Reddit, YouTube, Hacker News and Steam.',
      };
    }

    if (options.maxComments && comments.length > options.maxComments) comments = comments.slice(0, options.maxComments);
    return { success: true, comments, post: pageMeta(), platform: 'generic', method };
  } catch (err) {
    return { success: false, comments: [], post: null, platform: 'generic', error: (err as Error).message };
  }
}
