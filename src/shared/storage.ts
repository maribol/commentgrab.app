import {
  type AppSettings,
  type SavedCollection,
  type HistoryEntry,
  type Comment,
  type Board,
  type Stats,
  DEFAULT_SETTINGS,
  DEFAULT_EXPORT_SETTINGS,
  EMPTY_STATS,
} from './types';
import { uid } from './util';

const KEYS = {
  settings: 'commentgrab:settings',
  stats: 'commentgrab:stats',
  collections: 'commentgrab:collections',
  history: 'commentgrab:history',
  boards: 'commentgrab:boards',
} as const;

/** Each collection's (potentially large) comment array lives under its own key. */
const COMMENTS_PREFIX = 'commentgrab:comments:';
const commentsKey = (id: string): string => `${COMMENTS_PREFIX}${id}`;

const HISTORY_LIMIT = 200;

async function getRaw<T>(key: string, fallback: T): Promise<T> {
  const out = await chrome.storage.local.get(key);
  return (out[key] as T) ?? fallback;
}

/**
 * Strip Vue reactive proxies (and any other non-cloneable wrappers) before
 * handing a value to chrome.storage. The structured-clone serializer Chrome
 * uses throws `DataCloneError` on a reactive Proxy, which silently corrupted
 * saves — e.g. a collection's comments array would persist as empty while its
 * commentCount survived ("No comment text stored for this scrape"). Every
 * payload we store is plain JSON data, so a JSON round-trip is lossless.
 */
function toPlain<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

async function setRaw(key: string, value: unknown): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: toPlain(value) });
  } catch (err) {
    // Surface quota errors so callers can tell the user instead of silently
    // dropping data (the old single-blob model hit the ~10MB local quota).
    throw new Error((err as Error)?.message || 'Local storage write failed (it may be full).');
  }
}

/* ------------------------------ Settings ------------------------------ */

export async function getSettings(): Promise<AppSettings> {
  const stored = await getRaw<Partial<AppSettings>>(KEYS.settings, {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    export: { ...DEFAULT_EXPORT_SETTINGS, ...(stored.export ?? {}) },
  };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    ...patch,
    export: { ...current.export, ...(patch.export ?? {}) },
  };
  await setRaw(KEYS.settings, next);
  return next;
}

/* ------------------------------- Stats -------------------------------- */

export async function getStats(): Promise<Stats> {
  const stored = await getRaw<Partial<Stats>>(KEYS.stats, {});
  return { ...EMPTY_STATS, ...stored };
}

export async function setStats(stats: Stats): Promise<void> {
  await setRaw(KEYS.stats, stats);
}

/* ---------------------------- Collections ----------------------------- */

/** Index entries carry metadata only; comments are stored per-collection. */
export async function listCollections(): Promise<SavedCollection[]> {
  const all = await getRaw<SavedCollection[]>(KEYS.collections, []);
  return all.sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return b.updatedAt - a.updatedAt;
  });
}

export async function getCollection(id: string): Promise<SavedCollection | undefined> {
  const all = await getRaw<SavedCollection[]>(KEYS.collections, []);
  const meta = all.find((c) => c.id === id);
  if (!meta) return undefined;
  // Legacy collections stored their comments inline; newer ones use a side key.
  if (Array.isArray(meta.comments) && meta.comments.length) return meta;
  const stored = await getRaw<Comment[]>(commentsKey(id), []);
  // Defend against historically corrupted entries so the UI/export never sees
  // a non-array here.
  return { ...meta, comments: Array.isArray(stored) ? stored : [] };
}

/** Most recent saved collection whose URL matches (ignoring hash/query/trailing slash). */
export async function findCollectionByUrl(url: string): Promise<SavedCollection | undefined> {
  if (!url) return undefined;
  const norm = (u: string): string => (u || '').replace(/[#?].*$/, '').replace(/\/+$/, '');
  const target = norm(url);
  if (!target) return undefined;
  const all = await getRaw<SavedCollection[]>(KEYS.collections, []);
  return [...all].sort((a, b) => b.updatedAt - a.updatedAt).find((c) => norm(c.url) === target);
}

/** Insert or replace a collection by id. Comments are written to their own key. */
export async function upsertCollection(collection: SavedCollection): Promise<void> {
  const { comments, ...rest } = collection;
  const meta: SavedCollection = { ...rest, comments: [], commentCount: comments?.length ?? collection.commentCount };
  // Write the heavy payload first so a quota failure aborts before the index is touched.
  await setRaw(commentsKey(collection.id), comments ?? []);
  const all = await getRaw<SavedCollection[]>(KEYS.collections, []);
  const idx = all.findIndex((c) => c.id === collection.id);
  if (idx >= 0) all[idx] = meta;
  else all.unshift(meta);
  await setRaw(KEYS.collections, all);
}

export async function updateCollection(
  id: string,
  patch: Partial<SavedCollection>,
): Promise<SavedCollection | undefined> {
  const all = await getRaw<SavedCollection[]>(KEYS.collections, []);
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  const existing = all[idx];
  const { comments, ...metaPatch } = patch;
  if (comments !== undefined) {
    await setRaw(commentsKey(id), comments);
  } else if (Array.isArray(existing.comments) && existing.comments.length) {
    // Legacy collection kept comments inline — move them to the side key so
    // clearing them from the index below doesn't lose them.
    await setRaw(commentsKey(id), existing.comments);
  }
  all[idx] = { ...existing, ...metaPatch, comments: [], updatedAt: Date.now() };
  await setRaw(KEYS.collections, all);
  return getCollection(id);
}

export async function deleteCollection(id: string): Promise<void> {
  const all = await getRaw<SavedCollection[]>(KEYS.collections, []);
  await setRaw(
    KEYS.collections,
    all.filter((c) => c.id !== id),
  );
  await chrome.storage.local.remove(commentsKey(id)).catch(() => {});
}

/* ------------------------------ History ------------------------------- */

export async function listHistory(): Promise<HistoryEntry[]> {
  const all = await getRaw<HistoryEntry[]>(KEYS.history, []);
  return all.sort((a, b) => b.scrapedAt - a.scrapedAt);
}

export async function addHistory(entry: HistoryEntry): Promise<void> {
  const all = await getRaw<HistoryEntry[]>(KEYS.history, []);
  all.unshift(entry);
  await setRaw(KEYS.history, all.slice(0, HISTORY_LIMIT));
}

/** Patch a history entry by id (e.g. to backfill the saved collection link). */
export async function updateHistory(
  id: string,
  patch: Partial<HistoryEntry>,
): Promise<void> {
  const all = await getRaw<HistoryEntry[]>(KEYS.history, []);
  const idx = all.findIndex((h) => h.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch };
  await setRaw(KEYS.history, all);
}

export async function removeHistory(id: string): Promise<void> {
  const all = await getRaw<HistoryEntry[]>(KEYS.history, []);
  await setRaw(
    KEYS.history,
    all.filter((h) => h.id !== id),
  );
}

export async function clearHistory(): Promise<void> {
  await setRaw(KEYS.history, []);
}

/* ------------------------------- Misc --------------------------------- */

export async function clearAllData(): Promise<void> {
  const all = await getRaw<SavedCollection[]>(KEYS.collections, []);
  const commentKeys = all.map((c) => commentsKey(c.id));
  await chrome.storage.local.remove([KEYS.collections, KEYS.history, KEYS.stats, ...commentKeys]);
}

export async function estimateUsage(): Promise<{ bytes: number; quota: number }> {
  const bytes = await chrome.storage.local.getBytesInUse(null);
  // With the `unlimitedStorage` permission, chrome.storage.local is no longer
  // capped at the old ~10MB default — it's bounded by the browser's per-origin
  // quota (typically a large share of free disk). Ask the Storage API for the
  // real number; fall back to a generous estimate if it's unavailable.
  let quota = 0;
  try {
    const est = await navigator.storage?.estimate?.();
    if (est?.quota) quota = est.quota;
  } catch {
    /* navigator.storage unavailable — fall through to the fallback below */
  }
  return { bytes, quota: quota || bytes * 50 || 1024 * 1024 * 1024 };
}

/* ------------------------------- Boards ------------------------------- */

export async function listBoards(): Promise<Board[]> {
  const all = await getRaw<Board[]>(KEYS.boards, []);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

/** Create a board, or return the existing one with the same name (case-insensitive). */
export async function createBoard(name: string): Promise<Board> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Board name is required.');
  const all = await getRaw<Board[]>(KEYS.boards, []);
  const existing = all.find((b) => b.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  const board: Board = { id: uid('board'), name: trimmed, createdAt: Date.now() };
  all.push(board);
  await setRaw(KEYS.boards, all);
  return board;
}

export async function renameBoard(id: string, name: string): Promise<void> {
  const all = await getRaw<Board[]>(KEYS.boards, []);
  const b = all.find((x) => x.id === id);
  if (!b) return;
  b.name = name.trim() || b.name;
  await setRaw(KEYS.boards, all);
}

/** Delete a board and unfile it from every collection. */
export async function deleteBoard(id: string): Promise<void> {
  const all = await getRaw<Board[]>(KEYS.boards, []);
  await setRaw(KEYS.boards, all.filter((b) => b.id !== id));
  const cols = await getRaw<SavedCollection[]>(KEYS.collections, []);
  let changed = false;
  for (const c of cols) {
    if (c.boardIds?.includes(id)) {
      c.boardIds = c.boardIds.filter((x) => x !== id);
      changed = true;
    }
  }
  if (changed) await setRaw(KEYS.collections, cols);
}

/* --------------------------- Auto-analyze ----------------------------- */

const AUTO_ANALYZE_KEY = 'commentgrab:autoAnalyze';

/** Flag a collection to be analyzed automatically when the dashboard opens it. */
export async function setAutoAnalyze(id: string): Promise<void> {
  await setRaw(AUTO_ANALYZE_KEY, id);
}

/** Read and clear the auto-analyze flag (one-shot). */
export async function takeAutoAnalyze(): Promise<string> {
  const id = await getRaw<string>(AUTO_ANALYZE_KEY, '');
  if (id) await chrome.storage.local.remove(AUTO_ANALYZE_KEY).catch(() => {});
  return id;
}

/* ------------------------------- Promo -------------------------------- */

const PROMO_KEY = 'commentgrab:promoDismissed';

/** The extension version a promo (e.g. Product Hunt banner) was last dismissed at. */
export async function getPromoDismissed(): Promise<string> {
  return getRaw<string>(PROMO_KEY, '');
}

export async function setPromoDismissed(version: string): Promise<void> {
  await setRaw(PROMO_KEY, version);
}

/** Subscribe to local storage changes; returns an unsubscribe fn. */
export function onStorageChanged(cb: (keys: string[]) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local') return;
    cb(Object.keys(changes));
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export const STORAGE_KEYS = KEYS;
