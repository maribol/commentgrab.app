import type { ExportFormat, PlatformId, Stats } from './types';
import { getStats, setStats } from './storage';

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Record a successful scrape against the running totals + monthly buckets. */
export async function recordScrape(platform: PlatformId, commentCount: number): Promise<Stats> {
  const stats = await getStats();
  const now = Date.now();
  const key = monthKey();

  stats.totalScrapes += 1;
  stats.totalComments += commentCount;
  stats.scrapesByPlatform[platform] = (stats.scrapesByPlatform[platform] ?? 0) + 1;
  stats.commentsByPlatform[platform] = (stats.commentsByPlatform[platform] ?? 0) + commentCount;

  const bucket = stats.monthly[key] ?? { scrapes: 0, comments: 0 };
  bucket.scrapes += 1;
  bucket.comments += commentCount;
  stats.monthly[key] = bucket;

  if (!stats.firstUseAt) stats.firstUseAt = now;
  stats.lastActivity = now;

  await setStats(stats);
  return stats;
}

export async function recordExport(format: ExportFormat, count = 1): Promise<Stats> {
  const stats = await getStats();
  stats.totalExports += count;
  stats.exportsByFormat[format] = (stats.exportsByFormat[format] ?? 0) + count;
  const key = monthKey();
  const bucket = stats.monthly[key] ?? { scrapes: 0, comments: 0 };
  bucket.exports = (bucket.exports ?? 0) + count;
  stats.monthly[key] = bucket;
  stats.lastActivity = Date.now();
  await setStats(stats);
  return stats;
}

/** Reverse a recorded scrape (e.g. when a history entry is deleted). */
export async function unrecordScrape(platform: PlatformId, commentCount: number, scrapedAt = Date.now()): Promise<Stats> {
  const stats = await getStats();
  const clamp = (n: number): number => Math.max(0, n);
  stats.totalScrapes = clamp(stats.totalScrapes - 1);
  stats.totalComments = clamp(stats.totalComments - commentCount);
  if (stats.scrapesByPlatform[platform] != null) stats.scrapesByPlatform[platform] = clamp(stats.scrapesByPlatform[platform] - 1);
  if (stats.commentsByPlatform[platform] != null) stats.commentsByPlatform[platform] = clamp(stats.commentsByPlatform[platform] - commentCount);
  const bucket = stats.monthly[monthKey(new Date(scrapedAt))];
  if (bucket) {
    bucket.scrapes = clamp(bucket.scrapes - 1);
    bucket.comments = clamp(bucket.comments - commentCount);
  }
  await setStats(stats);
  return stats;
}

export interface MonthlyPoint {
  key: string;
  label: string;
  scrapes: number;
  comments: number;
  exports: number;
}

/** Last `n` months (oldest first), zero-filled, ready for the dashboard chart. */
export function lastNMonths(stats: Stats, n = 6): MonthlyPoint[] {
  const out: MonthlyPoint[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const key = monthKey(d);
    const bucket = stats.monthly[key] ?? { scrapes: 0, comments: 0 };
    out.push({
      key,
      label: d.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
      scrapes: bucket.scrapes,
      comments: bucket.comments,
      exports: bucket.exports ?? 0,
    });
  }
  return out;
}
