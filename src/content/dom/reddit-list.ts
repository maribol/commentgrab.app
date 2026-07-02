import type { PostStub } from '@/shared/types';
import { sleep } from '@/shared/util';

type Progress = (message: string, percent: number) => void;
type ShouldStop = () => boolean;

/** Parse "1.2k", "3,456", "2M" → integer. Exported for tests. */
export function parseCount(raw: string | null | undefined): number {
  if (!raw) return 0;
  const m = String(raw).replace(/,/g, '').match(/([\d.]+)\s*([kmb])?/i);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  const suffix = (m[2] || '').toLowerCase();
  if (suffix === 'k') n *= 1e3;
  else if (suffix === 'm') n *= 1e6;
  else if (suffix === 'b') n *= 1e9;
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function absolute(href: string): string {
  if (!href) return '';
  try {
    return new URL(href, location.origin).href.split(/[?#]/)[0];
  } catch {
    return href;
  }
}

/** A post's comment count from a rendered unit, best-effort across Reddit's layouts. */
function commentCountFromUnit(unit: Element, post: Element | null): number {
  const attr = post?.getAttribute('comment-count');
  if (attr != null) return parseCount(attr);
  const labelled = Array.from(unit.querySelectorAll('[aria-label*="comment" i], [data-testid*="comment" i]'))
    .map((el) => el.getAttribute('aria-label') || el.textContent || '')
    .find((s) => /comment/i.test(s));
  const source = labelled || unit.textContent || '';
  const m = source.match(/([\d.,]+\s*[kmb]?)\s*comment/i);
  return m ? parseCount(m[1]) : 0;
}

/** Turn one rendered post unit into a stub, or null if it isn't a real thread. */
function readUnit(unit: Element): PostStub | null {
  const post = unit.matches('shreddit-post') ? unit : unit.querySelector('shreddit-post');

  let href = post?.getAttribute('permalink') || '';
  if (!href) {
    const a = unit.querySelector<HTMLAnchorElement>('a[data-testid="post-title"], a[slot="title"], a.search-title, a[href*="/comments/"]');
    href = a?.getAttribute('href') || '';
  }
  const url = absolute(href);
  if (!/\/comments\/[a-z0-9]+/i.test(url)) return null;

  const titleEl = unit.querySelector('[data-testid="post-title"], a[slot="title"], a.search-title, h3');
  const title = (post?.getAttribute('post-title') || titleEl?.getAttribute('aria-label') || titleEl?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();

  let subreddit = post?.getAttribute('subreddit-prefixed-name') || '';
  if (!subreddit) {
    const m = url.match(/\/r\/([^/]+)/i);
    if (m) subreddit = `r/${m[1]}`;
  }

  return {
    title: title || 'Untitled',
    url,
    numComments: commentCountFromUnit(unit, post),
    score: parseCount(post?.getAttribute('score')),
    author: post?.getAttribute('author') || '',
    subreddit,
  };
}

/** Rendered post units on the page, trying new-Reddit first, then old Reddit. */
function collectUnits(): Element[] {
  const selectors = [
    '[data-testid="search-post-unit"]', // new Reddit search results
    'shreddit-post', // new Reddit listing / feed
    '[data-testid="post-container"]',
    '.search-result-link', // old Reddit search
    '.thing.link', // old Reddit listing
  ];
  for (const sel of selectors) {
    const found = Array.from(document.querySelectorAll(sel));
    if (found.length) return found;
  }
  return [];
}

/**
 * Read the ranked post list straight off the page the user is looking at.
 * Auto-scrolls to load a candidate pool a bit larger than `want`, then returns
 * de-duplicated stubs in the page's displayed order (comment counts included so
 * the caller can rank by them). Using the DOM means results always match what
 * Reddit actually shows — far more relevant than the public search API.
 */
export async function scrapeRedditListDom(want: number, onProgress: Progress, shouldStop?: ShouldStop): Promise<PostStub[]> {
  const target = Math.min(Math.max(want * 2, want + 5), 50);
  const scroller = document.scrollingElement || document.documentElement;

  let units = collectUnits();
  let stalls = 0;
  for (let i = 0; i < 24 && units.length < target && stalls < 3; i++) {
    if (shouldStop?.()) break;
    const before = units.length;
    onProgress(`Loading posts… ${before} found`, Math.min(22, 6 + i * 2));
    window.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
    await sleep(700);
    units = collectUnits();
    stalls = units.length > before ? 0 : stalls + 1;
  }
  window.scrollTo({ top: 0, behavior: 'auto' });

  const seen = new Set<string>();
  const stubs: PostStub[] = [];
  for (const unit of units) {
    const stub = readUnit(unit);
    if (!stub || seen.has(stub.url)) continue;
    seen.add(stub.url);
    stubs.push(stub);
  }
  return stubs;
}
