import type { PlatformId } from './types';

interface UrlParts {
  hostname: string;
  pathname: string;
  search: URLSearchParams;
}

function parts(url: string): UrlParts | null {
  try {
    const u = new URL(url);
    return { hostname: u.hostname.toLowerCase(), pathname: u.pathname, search: u.searchParams };
  } catch {
    return null;
  }
}

function hostIs(p: UrlParts, domain: string): boolean {
  return p.hostname === domain || p.hostname.endsWith(`.${domain}`);
}

/** Reddit comment thread, e.g. /r/x/comments/abc123/title/ */
function isRedditThread(p: UrlParts): boolean {
  return hostIs(p, 'reddit.com') && /\/comments\/[a-z0-9]{4,}/i.test(p.pathname);
}

/** Reddit user profile overview/comments/submitted. */
function isRedditProfile(p: UrlParts): boolean {
  if (!hostIs(p, 'reddit.com')) return false;
  if (/\/comments\/[a-z0-9]{4,}/i.test(p.pathname)) return false;
  return /\/u(?:ser)?\/[^/?#]+(?:\/(overview|comments|submitted))?\/?$/i.test(p.pathname);
}

function isYouTube(p: UrlParts): boolean {
  if (hostIs(p, 'youtube.com')) {
    if (p.pathname === '/watch') return /^[\w-]{6,}$/.test(p.search.get('v') || '');
    return /^\/shorts\/[\w-]{6,}\/?$/i.test(p.pathname);
  }
  return p.hostname === 'youtu.be' && /^\/[\w-]{6,}\/?$/i.test(p.pathname);
}

function isHackerNews(p: UrlParts): boolean {
  return hostIs(p, 'news.ycombinator.com') && p.pathname === '/item' && /^\d+$/.test(p.search.get('id') || '');
}

function isSteam(p: UrlParts): boolean {
  if (hostIs(p, 'store.steampowered.com')) return /^\/app\/\d+/.test(p.pathname);
  if (hostIs(p, 'steamcommunity.com')) return /\/recommended\/\d+\/?$/i.test(p.pathname);
  return false;
}

/** Bluesky post permalink, e.g. /profile/<handle-or-did>/post/<rkey> */
function isBluesky(p: UrlParts): boolean {
  return hostIs(p, 'bsky.app') && /^\/profile\/[^/]+\/post\/[^/]+/i.test(p.pathname);
}

/** GitHub issue or pull-request conversation. */
function isGitHub(p: UrlParts): boolean {
  return hostIs(p, 'github.com') && /^\/[^/]+\/[^/]+\/(?:issues|pull)\/\d+/i.test(p.pathname);
}

/** Stack Exchange network question page (Stack Overflow, Super User, *.stackexchange.com, …). */
const STACK_EXCHANGE_HOST = /(^|\.)(?:stackoverflow|serverfault|superuser|askubuntu|mathoverflow|stackexchange)\.(?:com|net)$/i;
function isStackExchange(p: UrlParts): boolean {
  return STACK_EXCHANGE_HOST.test(p.hostname) && /^\/questions\/\d+/i.test(p.pathname);
}

/** Instagram post, reel, or IGTV permalink, e.g. /p/<code>/, /reel/<code>/. */
function isInstagram(p: UrlParts): boolean {
  return hostIs(p, 'instagram.com') && /^\/(?:p|reel|tv)\/[A-Za-z0-9_-]+/i.test(p.pathname);
}

/** Google Maps place page with a reviews panel, e.g. /maps/place/<name>/… */
function isGoogleMaps(p: UrlParts): boolean {
  return hostIs(p, 'google.com') && /^\/maps\/place\//i.test(p.pathname);
}

/** Best-effort DOM platforms: reviews / Q&A pages we render a generic widget on. */
function isGenericReviewPage(p: UrlParts): boolean {
  if (/(^|\.)amazon\./i.test(p.hostname)) {
    return /\/(?:dp|product-reviews|gp\/product|gp\/aw\/(?:d|reviews))\/[A-Z0-9]{10}/i.test(p.pathname);
  }
  if (hostIs(p, 'trustpilot.com')) return /^\/review\/[^/?#]+/i.test(p.pathname);
  if (hostIs(p, 'producthunt.com')) return /^\/(?:posts|products)\/[^/?#]+/i.test(p.pathname);
  if (hostIs(p, 'etsy.com')) return /^\/listing\/\d+/.test(p.pathname);
  if (hostIs(p, 'quora.com')) return !p.pathname.startsWith('/search') && /^\/[A-Za-z]/.test(p.pathname);
  return false;
}

/** Returns the platform a URL can be scraped as, or null if not supported. */
export function detectPlatform(url: string | undefined | null): PlatformId | null {
  if (!url) return null;
  const p = parts(url);
  if (!p) return null;

  if (isRedditProfile(p)) return 'redditProfile';
  if (isRedditThread(p)) return 'reddit';
  if (isYouTube(p)) return 'youtube';
  if (isHackerNews(p)) return 'hackernews';
  if (isSteam(p)) return 'steam';
  if (isBluesky(p)) return 'bluesky';
  if (isGitHub(p)) return 'github';
  if (isStackExchange(p)) return 'stackexchange';
  if (isInstagram(p)) return 'instagram';
  if (isGoogleMaps(p)) return 'googlemaps';
  if (isGenericReviewPage(p)) return 'generic';
  return null;
}

export function isScrapeable(url: string | undefined | null): boolean {
  return detectPlatform(url) !== null;
}

/** Platforms whose data is fetched by the background service worker (CORS-free APIs). */
export function usesBackgroundFetch(platform: PlatformId): boolean {
  return (
    platform === 'reddit' ||
    platform === 'redditProfile' ||
    platform === 'hackernews' ||
    platform === 'steam' ||
    platform === 'bluesky' ||
    platform === 'github' ||
    platform === 'stackexchange' ||
    platform === 'instagram'
  );
}

/** Platforms scraped from the live DOM inside the content script. */
export function usesDomScrape(platform: PlatformId): boolean {
  return platform === 'youtube' || platform === 'googlemaps' || platform === 'generic';
}

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  /** Short verb-noun describing what gets pulled. */
  unit: string;
  color: string;
}

export const PLATFORM_META: Record<PlatformId, PlatformMeta> = {
  reddit: { id: 'reddit', label: 'Reddit', unit: 'comments', color: '#ff4500' },
  redditProfile: { id: 'redditProfile', label: 'Reddit Profile', unit: 'posts & comments', color: '#ff4500' },
  youtube: { id: 'youtube', label: 'YouTube', unit: 'comments', color: '#ff0033' },
  hackernews: { id: 'hackernews', label: 'Hacker News', unit: 'comments', color: '#ff6600' },
  steam: { id: 'steam', label: 'Steam', unit: 'reviews', color: '#1b6dc1' },
  bluesky: { id: 'bluesky', label: 'Bluesky', unit: 'replies', color: '#0085ff' },
  github: { id: 'github', label: 'GitHub', unit: 'comments', color: '#6e40c9' },
  stackexchange: { id: 'stackexchange', label: 'Stack Exchange', unit: 'answers', color: '#f48024' },
  instagram: { id: 'instagram', label: 'Instagram', unit: 'comments', color: '#e1306c' },
  googlemaps: { id: 'googlemaps', label: 'Google Maps', unit: 'reviews', color: '#ea4335' },
  generic: { id: 'generic', label: 'This page', unit: 'comments', color: '#7c3aed' },
};

export function platformLabel(platform: PlatformId): string {
  return PLATFORM_META[platform]?.label ?? 'This page';
}

export function platformColor(platform: PlatformId): string {
  return PLATFORM_META[platform]?.color ?? '#7c3aed';
}

/** A friendly source label derived from the URL for generic pages. */
export function deriveSource(url: string, platform: PlatformId): string {
  const p = parts(url);
  if (!p) return platformLabel(platform);
  if (platform === 'reddit' || platform === 'redditProfile') {
    const sub = p.pathname.match(/\/r\/([^/]+)/i);
    if (sub) return `r/${sub[1]}`;
    const user = p.pathname.match(/\/u(?:ser)?\/([^/]+)/i);
    if (user) return `u/${user[1]}`;
  }
  if (platform === 'bluesky') {
    const handle = p.pathname.match(/\/profile\/([^/]+)/i);
    if (handle) return `@${handle[1]}`;
  }
  if (platform === 'github') {
    const repo = p.pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (repo) return `${repo[1]}/${repo[2]}`;
  }
  return p.hostname.replace(/^www\./, '');
}
