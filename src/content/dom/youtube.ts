import type { Comment, Post, ScrapeOptions, ScrapeResult } from '@/shared/types';
import { sleep } from '@/shared/util';

type Progress = (message: string, percent: number) => void;
type ShouldStop = () => boolean;

const SEL = {
  thread: 'ytd-comment-thread-renderer',
  comment: 'ytd-comment-view-model, ytd-comment-renderer',
  text: '#content-text',
  author: '#author-text',
  likes: '#vote-count-middle',
  timeLink: '.published-time-text a, #published-time-text a',
  replies: 'ytd-comment-replies-renderer',
  moreReplies: 'ytd-comment-replies-renderer #more-replies button, ytd-comment-replies-renderer tp-yt-paper-button#more-replies',
  countHeader: 'ytd-comments-header-renderer #count, #count .count-text',
  videoTitle: 'h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string',
  shortsTitle: 'ytd-reel-video-renderer[is-active] yt-formatted-string.title',
  channel: 'ytd-channel-name #text a, #owner #channel-name a',
  disabled: 'ytd-message-renderer',
};

function isShorts(): boolean {
  return location.pathname.startsWith('/shorts/');
}

function parseCount(text: string): number {
  if (!text) return 0;
  const t = text.trim().replace(/,/g, '');
  const m = t.match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] ?? 1;
  return Math.round(n * mult);
}

function commentsDisabled(): boolean {
  const msg = document.querySelector(SEL.disabled);
  return !!msg && /comments are turned off/i.test(msg.textContent || '');
}

async function scrollToComments(): Promise<void> {
  window.scrollTo({ top: Math.round(window.innerHeight * 1.4), behavior: 'auto' });
  await sleep(700);
}

function getThreads(): Element[] {
  return Array.from(document.querySelectorAll(SEL.thread));
}

async function loadComments(maxComments: number, budgetMs: number, onProgress: Progress, shouldStop?: ShouldStop): Promise<number> {
  const start = Date.now();
  let last = 0;
  let stagnant = 0;

  while (Date.now() - start < budgetMs) {
    if (shouldStop?.()) break; // user pressed Stop
    const count = getThreads().length;
    if (count >= maxComments) break;
    if (count === last) {
      stagnant++;
      if (stagnant >= 6) break; // reached the end (give lazy-loading more chances)
    } else {
      stagnant = 0;
      onProgress(`Loading comments… ${count} found`, Math.min(60, 25 + Math.round((count / maxComments) * 35)));
    }
    last = count;
    const scroller = document.scrollingElement || document.documentElement;
    window.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
    await sleep(550);
  }
  return getThreads().length;
}

async function expandReplies(budgetMs: number, onProgress: Progress, shouldStop?: ShouldStop): Promise<void> {
  const start = Date.now();
  let pass = 0;
  while (Date.now() - start < budgetMs) {
    if (shouldStop?.()) break;
    const buttons = Array.from(document.querySelectorAll<HTMLElement>(SEL.moreReplies)).filter(
      (b) => b.offsetParent !== null,
    );
    if (!buttons.length) break;
    onProgress(`Expanding ${buttons.length} reply threads…`, 70);
    for (const btn of buttons.slice(0, 40)) {
      btn.click();
      await sleep(80);
    }
    pass++;
    await sleep(700);
    if (pass > 8) break;
  }
}

function textOf(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function extractComment(el: Element, depth: number, index: number): Comment | null {
  const text = textOf(el.querySelector(SEL.text));
  if (!text) return null;
  const timeAnchor = el.querySelector<HTMLAnchorElement>(SEL.timeLink);
  const links = Array.from(el.querySelectorAll<HTMLAnchorElement>(`${SEL.text} a[href]`))
    .map((a) => a.href)
    .filter((h) => h && !h.startsWith('javascript:'));
  // YouTube view-models rarely expose a stable id, so fall back to the
  // comment permalink and finally a positional id to keep keys unique.
  const commentId = el.getAttribute('id') || timeAnchor?.href || `yt_${index}`;
  return {
    text,
    author: textOf(el.querySelector(SEL.author)).replace(/^@/, ''),
    timestamp: textOf(timeAnchor),
    permalink: timeAnchor?.href ?? '',
    links,
    score: parseCount(textOf(el.querySelector(SEL.likes))),
    depth,
    commentId,
  };
}

function extractAll(): Comment[] {
  const out: Comment[] = [];
  let index = 0;
  for (const thread of getThreads()) {
    const main = thread.querySelector(`#comment ${SEL.comment}, ${SEL.comment}`);
    if (main) {
      const c = extractComment(main, 0, index++);
      if (c) out.push(c);
    }
    const replyRoot = thread.querySelector(SEL.replies);
    if (replyRoot) {
      for (const r of replyRoot.querySelectorAll(SEL.comment)) {
        const c = extractComment(r, 1, index++);
        if (c) out.push(c);
      }
    }
  }
  return out;
}

function videoMeta(): Post {
  const titleEl = isShorts()
    ? document.querySelector(SEL.shortsTitle) || document.querySelector(SEL.videoTitle)
    : document.querySelector(SEL.videoTitle);
  const channel = textOf(document.querySelector(SEL.channel));
  return {
    title: textOf(titleEl) || document.title.replace(/\s*-\s*YouTube\s*$/, '').trim(),
    body: '',
    url: location.href,
    source: channel || 'YouTube',
  };
}

export async function scrapeYouTube(options: ScrapeOptions, onProgress: Progress, shouldStop?: ShouldStop): Promise<ScrapeResult> {
  try {
    if (commentsDisabled()) {
      return { success: false, comments: [], post: videoMeta(), platform: 'youtube', error: 'Comments are turned off for this video.' };
    }

    const maxComments = options.maxComments && options.maxComments > 0 ? options.maxComments : 800;
    const expand = options.expandReplies !== false;

    onProgress('Opening comments…', 15);
    await scrollToComments();

    const headerCount = parseCount(textOf(document.querySelector(SEL.countHeader)));
    const target = headerCount ? Math.min(maxComments, headerCount + 20) : maxComments;

    const loaded = await loadComments(target, 45000, onProgress, shouldStop);
    if (loaded === 0) {
      return { success: false, comments: [], post: videoMeta(), platform: 'youtube', error: 'No comments found yet. Scroll the page and try again.' };
    }

    if (expand && !shouldStop?.()) await expandReplies(12000, onProgress, shouldStop);

    onProgress('Extracting comments…', 88);
    const comments = extractAll();

    return { success: true, comments, post: videoMeta(), platform: 'youtube', method: 'dom' };
  } catch (err) {
    return { success: false, comments: [], post: null, platform: 'youtube', error: (err as Error).message };
  }
}
