import type { Comment, Post, ScrapeOptions, ScrapeResult } from '@/shared/types';
import { sleep } from '@/shared/util';

type Progress = (message: string, percent: number) => void;
type ShouldStop = () => boolean;

/**
 * Google Maps renders reviews in a scrollable side-panel div (not window
 * scroll), with obfuscated, churning class names. Selectors use fallback
 * chains for resilience — keep them updated when Maps changes its DOM.
 */
const SEL = {
  scrollContainer: [
    '.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde',
    '.m6QErb.DxyBCb.kA9KIf.dS8AEf',
    '.m6QErb.DxyBCb.kA9KIf',
    '.m6QErb.DxyBCb',
    '.section-layout.section-scrollbox',
  ].join(', '),
  reviewCard: '.jftiEf.fontBodyMedium, .jftiEf',
  reviewerName: '.d4r55, button[data-review-id] .d4r55',
  starRating: '.kvMYJc, .DU9Pgb span[aria-label], [role="img"][aria-label*="star" i]',
  reviewDate: '.rsqaWe, .DU9Pgb span:not([aria-label])',
  reviewTextFull: '.MyEned',
  reviewTextShort: '.wiI7pd, .MyEned .wiI7pd',
  moreButton: '.w8nwRe.kyuRq, button.w8nwRe, .w8nwRe',
  reviewsTab: 'button[aria-label*="Reviews" i], .hh2c6[aria-label*="Reviews" i]',
  placeTitle: 'h1.DUwDvf, .DUwDvf, .lMbq3e h1, .qBF1Pd.fontHeadlineSmall',
  overallRating: '.F7nice span[aria-hidden="true"], .F7nice span, .fontDisplayLarge',
  ownerResponse: '.CDe7pd.fontBodyMedium, .CDe7pd',
  ownerResponseName: '.CDe7pd .d4r55, .CDe7pd span.d4r55',
  loadingSpinner: '.qjESne, .lXJj5c.Hk4XGb',
} as const;

const REVIEWS_TAB_TEXT =
  /reviews|maoni|reseñas|avis|bewertung|recension|recenzi|avaliaç|отзывы|レビュー|리뷰|评论|評論/i;

function textOf(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function visibleText(el: Element | null): string {
  return ((el as HTMLElement)?.innerText || el?.textContent || '').trim();
}

function detectLimitedView(): boolean {
  const t = visibleText(document.body);
  return /sign in to see reviews|limited view|you are seeing (?:only )?limited data/i.test(t);
}

/** Locate the scrollable reviews panel: direct selector, else walk up from a card. */
function findScrollContainer(): HTMLElement | null {
  const direct = document.querySelector<HTMLElement>(SEL.scrollContainer);
  if (direct && direct.scrollHeight > direct.clientHeight) return direct;

  const card = document.querySelector(SEL.reviewCard);
  let el = card?.parentElement ?? null;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    const overflow = style.overflow + style.overflowY;
    if ((overflow.includes('auto') || overflow.includes('scroll')) && el.scrollHeight > el.clientHeight + 50) {
      return el;
    }
    el = el.parentElement;
  }
  return direct;
}

function findReviewsTab(): HTMLElement | null {
  const direct = document.querySelector<HTMLElement>(SEL.reviewsTab);
  if (direct) return direct;
  for (const btn of document.querySelectorAll<HTMLElement>('button[role="tab"], [role="tab"], .hh2c6')) {
    const label = `${btn.getAttribute('aria-label') || ''} ${btn.textContent || ''}`;
    if (REVIEWS_TAB_TEXT.test(label)) return btn;
  }
  return null;
}

async function activateReviewsTab(): Promise<void> {
  const tab = findReviewsTab();
  if (tab && !tab.getAttribute('aria-selected')?.includes('true')) {
    tab.click();
    await sleep(1800);
  }
}

function reviewCards(): Element[] {
  return Array.from(document.querySelectorAll(SEL.reviewCard));
}

/** Scroll the reviews panel until it stops growing, the cap is hit, or Stop. */
async function loadReviews(
  maxReviews: number,
  budgetMs: number,
  onProgress: Progress,
  shouldStop?: ShouldStop,
): Promise<number> {
  await activateReviewsTab();
  let container = findScrollContainer();
  if (!container) {
    await sleep(1500);
    container = findScrollContainer();
  }
  if (!container) return reviewCards().length;

  container.scrollTop = container.scrollHeight;
  await sleep(1400);

  const start = Date.now();
  let maxSeen = reviewCards().length;
  let stale = 0;
  const MAX_STALE = 8;

  while (Date.now() - start < budgetMs) {
    if (shouldStop?.()) break;
    const count = reviewCards().length;
    if (count >= maxReviews) break;

    if (count > maxSeen) {
      maxSeen = count;
      stale = 0;
      onProgress(`Loading reviews… ${count} found`, Math.min(65, 25 + Math.round((count / maxReviews) * 40)));
    } else {
      stale++;
      if (stale >= MAX_STALE) break;
    }

    container.scrollTop = container.scrollHeight;
    await sleep(stale > 3 ? 1200 : 650);
    if (!document.querySelector(SEL.loadingSpinner) && stale >= 5) break;
  }
  return reviewCards().length;
}

/** Click "More" expanders so truncated review bodies parse in full. */
async function expandTruncated(shouldStop?: ShouldStop): Promise<void> {
  const MAX_CLICKS = 160;
  let clicked = 0;
  for (let round = 0; round < 2; round++) {
    if (shouldStop?.()) break;
    let thisRound = 0;
    for (const btn of document.querySelectorAll<HTMLElement>(SEL.moreButton)) {
      if (clicked >= MAX_CLICKS) break;
      if (btn.offsetParent === null) continue; // hidden
      btn.click();
      clicked++;
      thisRound++;
      if (thisRound % 20 === 0) await sleep(100);
    }
    if (thisRound === 0) break;
    await sleep(450);
  }
}

function reviewId(el: Element): string {
  return (
    el.getAttribute('data-review-id') ||
    el.querySelector('[data-review-id]')?.getAttribute('data-review-id') ||
    ''
  );
}

function starRating(el: Element): number {
  const r = el.querySelector(SEL.starRating);
  const label = r?.getAttribute('aria-label') || '';
  const m = label.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Math.round(parseFloat(m[1].replace(',', '.'))) : 0;
}

function reviewText(el: Element): string {
  return textOf(el.querySelector(SEL.reviewTextFull)) || textOf(el.querySelector(SEL.reviewTextShort));
}

function parseCard(el: Element, index: number, seen: Set<string>): Comment[] {
  const out: Comment[] = [];
  const text = reviewText(el);
  const author = textOf(el.querySelector(SEL.reviewerName));
  const rating = starRating(el);
  if (!text && !author && !rating) return out;

  const id = reviewId(el) || `gm_${index}`;
  if (seen.has(id)) return out;
  seen.add(id);

  const profile = el.querySelector<HTMLAnchorElement>('a[href*="contrib"]');
  out.push({
    text: text || '(Rating only — no text)',
    author,
    timestamp: textOf(el.querySelector(SEL.reviewDate)),
    permalink: profile?.href || (reviewId(el) ? `#review-${reviewId(el)}` : ''),
    links: [],
    score: rating || 'Hidden',
    depth: 0,
    commentId: id,
    type: 'review',
  });

  // Owner / business response renders inside the same card.
  const respEl = el.querySelector(SEL.ownerResponse);
  const respText = textOf(respEl);
  if (respText && respText.length > 2) {
    const owner = textOf(el.querySelector(SEL.ownerResponseName)) || 'Owner';
    out.push({
      text: respText,
      author: `(Owner) ${owner}`,
      timestamp: '',
      permalink: '',
      links: [],
      score: 'Hidden',
      depth: 1,
      commentId: `${id}:owner`,
      type: 'review',
    });
  }
  return out;
}

function extractAll(): Comment[] {
  const out: Comment[] = [];
  const seen = new Set<string>();
  reviewCards().forEach((card, i) => out.push(...parseCard(card, i, seen)));
  return out;
}

function placeMeta(): Post {
  const title = textOf(document.querySelector(SEL.placeTitle)) || document.title.replace(/ - Google Maps$/, '').trim();
  const rating = textOf(document.querySelector(SEL.overallRating));
  return {
    title,
    body: rating ? `Overall rating: ${rating}` : '',
    url: location.href,
    source: title ? `${title} · Google Maps` : 'Google Maps',
  };
}

export async function scrapeGoogleMaps(
  options: ScrapeOptions,
  onProgress: Progress,
  shouldStop?: ShouldStop,
): Promise<ScrapeResult> {
  try {
    const maxReviews = options.maxComments && options.maxComments > 0 ? options.maxComments : 1000;

    onProgress('Opening reviews…', 15);
    const loaded = await loadReviews(maxReviews, 60000, onProgress, shouldStop);

    if (loaded === 0) {
      const limited = detectLimitedView();
      return {
        success: false,
        comments: [],
        post: placeMeta(),
        platform: 'googlemaps',
        error: limited
          ? 'Google Maps is showing a "Limited View" for signed-out users. Sign in to your Google account and try again.'
          : 'No reviews found. Open the place\'s Reviews tab and try again.',
      };
    }

    if (!shouldStop?.()) await expandTruncated(shouldStop);

    onProgress('Extracting reviews…', 88);
    const comments = extractAll();

    return { success: true, comments, post: placeMeta(), platform: 'googlemaps', method: 'dom' };
  } catch (err) {
    return { success: false, comments: [], post: null, platform: 'googlemaps', error: (err as Error).message };
  }
}
