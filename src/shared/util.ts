/** Compact unique id with an optional prefix. */
export function uid(prefix = 'c'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}

/** 1234 -> "1.2k", 1500000 -> "1.5M". */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trimZero(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trimZero(n / 1_000)}k`;
  return String(n);
}

function trimZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/** "3m ago", "5h ago", "2d ago", or a date for older entries. */
export function relativeTime(epochMs: number): string {
  if (!epochMs) return '';
  const diff = Date.now() - epochMs;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(epochMs);
}

export function formatDate(value: number | string): string {
  if (!value) return '';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(value: number | string): string {
  if (!value) return '';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Debounce a function by `wait` ms. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 200): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SUPPORT_EMAIL = 'sam@elasticfunnels.io';

/** The bug-report form on the website. Context travels in the URL fragment so it never reaches server logs. */
export const REPORT_PROBLEM_URL = 'https://commentgrab.app/report';

export type ReportWhere = 'popup' | 'widget' | 'dashboard';

/** A short browser + OS label such as "Chrome 141 / macOS" (never the full UA). */
export function shortBrowser(): string {
  if (typeof navigator === 'undefined') return '';
  const nav = navigator as Navigator & {
    userAgentData?: { brands?: Array<{ brand: string; version: string }>; platform?: string };
  };
  const ua = nav.userAgent || '';
  let browser = '';
  const brands = nav.userAgentData?.brands ?? [];
  const pick = brands.find((b) => !/not.?a.?brand|chromium/i.test(b.brand)) ?? brands.find((b) => /chromium/i.test(b.brand));
  if (pick) browser = `${pick.brand.replace(/^Google /, '')} ${pick.version}`;
  if (!browser) {
    const m =
      ua.match(/(Edg|OPR|Firefox|Chrome)\/(\d+)/) ?? ua.match(/Version\/(\d+).*Safari/);
    if (m) {
      const names: Record<string, string> = { Edg: 'Edge', OPR: 'Opera' };
      browser = m.length > 2 ? `${names[m[1]] ?? m[1]} ${m[2]}` : `Safari ${m[1]}`;
    }
  }
  let os = nav.userAgentData?.platform || '';
  if (!os) {
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/CrOS/.test(ua)) os = 'ChromeOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';
  }
  return [browser, os].filter(Boolean).join(' / ').slice(0, 60);
}

/**
 * Link to the website's report form, prefilled through the URL fragment
 * (#v=…&where=…&platform=…&error=…&page=…&ua=…). Opening it sends nothing;
 * only submitting the form on the site does.
 */
export function reportProblemUrl(opts: { where: ReportWhere; platform?: string; error?: string; page?: string }): string {
  const params = new URLSearchParams();
  let version = '';
  try {
    version = chrome.runtime.getManifest().version;
  } catch {
    /* not in an extension context */
  }
  if (version) params.set('v', version);
  params.set('where', opts.where);
  if (opts.platform) params.set('platform', opts.platform);
  if (opts.error) params.set('error', String(opts.error).trim().slice(0, 500));
  if (opts.page) params.set('page', opts.page.slice(0, 500));
  const ua = shortBrowser();
  if (ua) params.set('ua', ua);
  return `${REPORT_PROBLEM_URL}#${params.toString()}`;
}

/**
 * Favicon for a page URL, served by Google's public favicon endpoint so we
 * don't have to store or scrape icons. Returns '' for unusable URLs.
 */
export function faviconUrl(pageUrl?: string, size = 64): string {
  if (!pageUrl) return '';
  try {
    const host = new URL(pageUrl).hostname;
    if (!host) return '';
    return `https://www.google.com/s2/favicons?domain=${host}&sz=${size}`;
  } catch {
    return '';
  }
}
