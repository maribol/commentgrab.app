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

/** A prefilled mailto link for bug reports, with a simple template + version. */
export function bugReportMailto(version = ''): string {
  const subject = `CommentGrab bug report${version ? ` (v${version})` : ''}`;
  const body = [
    'What happened:',
    '',
    '',
    'What you expected:',
    '',
    '',
    'Steps to reproduce:',
    '',
    '',
    '---',
    `CommentGrab${version ? ` v${version}` : ''}`,
    `Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
  ].join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
