import { reactive } from 'vue';
import bundledFeed from '../../announcements.json';

/**
 * "What's new" announcements and blog posts.
 *
 * The primary feed is https://commentgrab.app/feed.json, built by the site from its
 * changelog, blog posts and hand-written announcements. The fallback is a static JSON
 * file in the public GitHub repo, fetched from raw.githubusercontent.com. Both answer
 * with `Access-Control-Allow-Origin: *`, so extension pages can read them without a
 * host permission (adding one would disable the extension on update until the
 * user re-approves it). The same file is bundled into the build as the offline
 * fallback, so the panel works with no network and before the file exists on
 * the repo's main branch.
 *
 * This is DATA, never code: items are validated strictly, every string is
 * rendered as plain text (never v-html), and links are limited to https URLs
 * on a short allowlist. That keeps it inside the Chrome Web Store MV3 rule
 * against remotely hosted code.
 */

/** Tried in order; the first that answers with a valid feed wins. */
export const FEED_URLS = [
  'https://commentgrab.app/feed.json',
  'https://raw.githubusercontent.com/maribol/commentgrab.app/main/announcements.json',
];
export const CHANGELOG_URL = 'https://commentgrab.app/changelog';

export type AnnouncementTag = 'release' | 'news' | 'tip' | 'post';

export interface Announcement {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
  tag: AnnouncementTag;
  minVersion?: string;
  maxVersion?: string;
  url?: string;
  cta?: { label: string; url: string };
  /** Cover image for blog posts; https on the site or its CDN only. */
  image?: string;
  modal?: boolean;
  draft?: boolean;
}

export interface SeenState {
  /** Ids the user has seen (opened the panel or dismissed the modal). */
  ids: string[];
  /** Last time the panel was opened / everything was marked seen (ms). */
  lastSeenAt: number;
  /** Items dated before this (YYYY-MM-DD) never count as unread. */
  since: string;
}

interface FeedCache {
  /** Last successful fetch (ms). */
  fetchedAt: number;
  /** Last attempt, successful or not (ms), so offline users are not refetched on every open. */
  attemptAt: number;
  items: Announcement[];
}

const KEYS = {
  cache: 'commentgrab:announcements:cache',
  seen: 'commentgrab:announcements:seen',
  /** Written by the service worker on a fresh install (see onInstalled). */
  installedAt: 'commentgrab:installedAt',
  /** Modal items already shown once (chrome.storage.sync, local as fallback). */
  modalShown: 'commentgrab:announcements:modalShown',
  /** Set once this device has seeded modalShown (fresh installs skip current modals). */
  modalSeeded: 'commentgrab:announcements:modalSeeded',
  /** Ids whose sidebar card the user closed (local only). */
  cardDismissed: 'commentgrab:announcements:cardDismissed',
} as const;

const TTL_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 5000;
const MAX_FEED_BYTES = 200_000;
const MAX_ITEMS = 50;
const MAX_SEEN_IDS = 300;
const MAX_MODAL_IDS = 50;
const MAX_DISMISSED_IDS = 50;
/**
 * The day this feature shipped. Users updating from a build without it start
 * with everything older already read, so they see only news from here on.
 */
const INTRO_DATE = '2026-10-01';

const TAGS: AnnouncementTag[] = ['release', 'news', 'tip', 'post'];
const LIMITS = { id: 80, title: 120, body: 2000, ctaLabel: 40, url: 500 };

/* ------------------------------ validation ------------------------------ */

const ALLOWED_HOSTS = new Set(['commentgrab.app', 'www.commentgrab.app', 'chromewebstore.google.com']);

/** Only https links to our own site, our GitHub, or the Chrome Web Store. */
/** Images may come from the site or the ElasticFunnels CDN that hosts its assets. */
export function safeImage(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value || value.length > LIMITS.url) return undefined;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return undefined;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return undefined;
  const host = u.hostname.toLowerCase();
  const ok =
    host === 'commentgrab.app' ||
    host === 'elasticfunnels.b-cdn.net' ||
    (host === 'storage.googleapis.com' && u.pathname.startsWith('/elasticfunnels/'));
  return ok && /\.(webp|png|jpe?g|avif)$/i.test(u.pathname) ? u.href : undefined;
}

export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value || value.length > LIMITS.url) return undefined;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return undefined;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return undefined;
  const host = u.hostname.toLowerCase();
  const ok =
    ALLOWED_HOSTS.has(host) ||
    (host === 'github.com' && (u.pathname === '/maribol' || u.pathname.startsWith('/maribol/')));
  return ok ? u.href : undefined;
}

/** Plain text only: strip control characters (keep \n), normalise line endings, cap length. */
function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .trim();
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max).trimEnd() : s;
}

const VERSION_RE = /^\d+(\.\d+){0,3}$/;

function cleanVersion(value: unknown): string | undefined {
  return typeof value === 'string' && VERSION_RE.test(value) ? value : undefined;
}

function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Validate one raw item; returns null when it is malformed. */
export function validateItem(raw: unknown): Announcement | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === 'string' && r.id.length <= LIMITS.id && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(r.id) ? r.id : null;
  const date = typeof r.date === 'string' && isRealDate(r.date) ? r.date : null;
  const title = cleanText(r.title, LIMITS.title);
  const body = cleanText(r.body, LIMITS.body);
  if (!id || !date || !title || !body) return null;
  if (r.tag !== undefined && typeof r.tag !== 'string') return null;
  // Unknown future tags degrade to "news" so older builds still show the item.
  const tag: AnnouncementTag = TAGS.includes(r.tag as AnnouncementTag) ? (r.tag as AnnouncementTag) : 'news';

  const item: Announcement = { id, date, title, body, tag };

  if (r.minVersion !== undefined) {
    const v = cleanVersion(r.minVersion);
    if (!v) return null; // a bad range must not widen the audience
    item.minVersion = v;
  }
  if (r.maxVersion !== undefined) {
    const v = cleanVersion(r.maxVersion);
    if (!v) return null;
    item.maxVersion = v;
  }

  const url = safeUrl(r.url);
  if (url) item.url = url;

  const image = safeImage(r.image);
  if (image) item.image = image;

  if (r.cta && typeof r.cta === 'object' && !Array.isArray(r.cta)) {
    const c = r.cta as Record<string, unknown>;
    const label = cleanText(c.label, LIMITS.ctaLabel);
    const ctaUrl = safeUrl(c.url);
    if (label && ctaUrl) item.cta = { label, url: ctaUrl };
  }

  if (r.modal === true) item.modal = true;
  if (r.draft === true) item.draft = true;
  return item;
}

/** Validate a whole feed document. Throws when the envelope itself is wrong. */
export function validateFeed(raw: unknown): Announcement[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('feed: not an object');
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) throw new Error('feed: unsupported version');
  if (!Array.isArray(r.items)) throw new Error('feed: items missing');
  const out: Announcement[] = [];
  const ids = new Set<string>();
  for (const it of r.items.slice(0, MAX_ITEMS * 2)) {
    const v = validateItem(it);
    if (!v || ids.has(v.id)) continue;
    ids.add(v.id);
    out.push(v);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

/* ------------------------------ filtering ------------------------------ */

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

function currentVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return '0.0.0';
  }
}

function visible(items: Announcement[], version = currentVersion()): Announcement[] {
  return items.filter(
    (i) =>
      !i.draft &&
      (!i.minVersion || compareVersions(version, i.minVersion) >= 0) &&
      (!i.maxVersion || compareVersions(version, i.maxVersion) <= 0),
  );
}

/** Remote wins by id; newest first (ties keep a stable order by id). */
function merge(remote: Announcement[], bundled: Announcement[]): Announcement[] {
  const byId = new Map<string, Announcement>();
  for (const i of bundled) byId.set(i.id, i);
  for (const i of remote) byId.set(i.id, i);
  return [...byId.values()].sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
}

let bundledCache: Announcement[] | null = null;
function bundled(): Announcement[] {
  if (!bundledCache) {
    try {
      bundledCache = validateFeed(bundledFeed);
    } catch {
      bundledCache = [];
    }
  }
  return bundledCache;
}

/* -------------------------------- storage ------------------------------- */

async function readKey<T>(key: string): Promise<T | undefined> {
  try {
    const out = await chrome.storage.local.get(key);
    return out[key] as T | undefined;
  } catch {
    return undefined;
  }
}

async function writeKey(key: string, value: unknown): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: JSON.parse(JSON.stringify(value)) });
  } catch {
    /* non-critical */
  }
}

async function readCache(): Promise<FeedCache | undefined> {
  const c = await readKey<FeedCache>(KEYS.cache);
  if (!c || typeof c !== 'object' || !Array.isArray(c.items)) return undefined;
  // Re-validate what we stored, in case an older build wrote a looser shape.
  const items = c.items.map(validateItem).filter((x): x is Announcement => !!x);
  return { fetchedAt: Number(c.fetchedAt) || 0, attemptAt: Number(c.attemptAt) || 0, items };
}

async function fetchRemote(): Promise<Announcement[]> {
  let lastError: unknown;
  for (const url of FEED_URLS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit', redirect: 'error' });
      if (!res.ok) throw new Error(`feed: HTTP ${res.status}`);
      const text = await res.text();
      if (text.length > MAX_FEED_BYTES) throw new Error('feed: too large');
      return validateFeed(JSON.parse(text));
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error('feed: unavailable');
}

/**
 * Announcements to show on this build: remote (cached for 6h) merged over the
 * bundled copy, drafts and out-of-range versions removed, newest first.
 * `cachedOnly` never touches the network (use it in the popup).
 */
export async function fetchAnnouncements(opts: { force?: boolean; cachedOnly?: boolean } = {}): Promise<Announcement[]> {
  const cache = await readCache();
  let remote = cache?.items ?? [];
  const now = Date.now();
  const stale = !cache || now - cache.fetchedAt > TTL_MS;
  const mayRetry = !cache || now - cache.attemptAt > RETRY_MS;

  if (!opts.cachedOnly && (opts.force || (stale && mayRetry))) {
    try {
      remote = await fetchRemote();
      await writeKey(KEYS.cache, { fetchedAt: now, attemptAt: now, items: remote } satisfies FeedCache);
    } catch {
      // Offline, 404 before the file lands on main, or a bad document: keep
      // the last good copy and try again after RETRY_MS.
      await writeKey(KEYS.cache, { fetchedAt: cache?.fetchedAt ?? 0, attemptAt: now, items: remote } satisfies FeedCache);
    }
  }
  return visible(merge(remote, bundled()));
}

/* ------------------------------ seen state ------------------------------ */

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function cleanSeen(raw: unknown): SeenState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.ids) || typeof r.since !== 'string') return null;
  return {
    ids: r.ids.filter((x): x is string => typeof x === 'string').slice(-MAX_SEEN_IDS),
    lastSeenAt: Number(r.lastSeenAt) || 0,
    since: r.since,
  };
}

export async function getSeenState(): Promise<SeenState | null> {
  return cleanSeen(await readKey(KEYS.seen));
}

async function saveSeen(s: SeenState): Promise<void> {
  s.ids = [...new Set(s.ids)].slice(-MAX_SEEN_IDS);
  await writeKey(KEYS.seen, s);
  store.seen = { ...s };
}

/**
 * First run of this feature. A fresh install (the service worker stamped
 * installedAt) marks everything current as seen, so new users are not greeted
 * by old news. An update from a build without the feature marks everything
 * before INTRO_DATE as seen, so they get only what is new since.
 */
export async function ensureSeeded(items: Announcement[]): Promise<SeenState> {
  const existing = await getSeenState();
  if (existing) return existing;
  const freshInstall = !!(await readKey<number>(KEYS.installedAt));
  const since = freshInstall ? today() : INTRO_DATE;
  const state: SeenState = {
    ids: freshInstall ? items.map((i) => i.id) : items.filter((i) => i.date < since).map((i) => i.id),
    lastSeenAt: freshInstall ? Date.now() : 0,
    since,
  };
  await saveSeen(state);
  return state;
}

export function isUnread(item: Announcement, seen: SeenState | null): boolean {
  if (!seen) return false; // not seeded yet: show nothing rather than everything
  return item.date >= seen.since && !seen.ids.includes(item.id);
}

export async function unreadCount(items?: Announcement[], opts: { cachedOnly?: boolean } = {}): Promise<number> {
  const list = items ?? (await fetchAnnouncements({ cachedOnly: opts.cachedOnly ?? true }));
  const seen = await getSeenState();
  return list.filter((i) => isUnread(i, seen)).length;
}

export async function markSeen(id: string): Promise<void> {
  const s = (await getSeenState()) ?? { ids: [], lastSeenAt: 0, since: INTRO_DATE };
  if (s.ids.includes(id)) return;
  s.ids.push(id);
  await saveSeen(s);
}

export async function markAllSeen(items: Announcement[]): Promise<void> {
  const s = (await getSeenState()) ?? { ids: [], lastSeenAt: 0, since: INTRO_DATE };
  s.ids.push(...items.map((i) => i.id));
  s.lastSeenAt = Date.now();
  await saveSeen(s);
}

/* ------------------------------ modal shown ------------------------------ */

/**
 * The one-time modal is decided only by this list, never by unread state: an
 * id is recorded the moment its modal is SHOWN, so closing the tab, Esc, an
 * outside click or any button all count and it never opens again. It lives in
 * chrome.storage.sync so it follows the user across Chrome profiles/devices;
 * chrome.storage.local is the fallback, and reads take the union of both.
 */
function cleanIds(raw: unknown, max: number): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').slice(-max) : [];
}

export async function getModalShown(): Promise<string[]> {
  let synced: unknown;
  try {
    synced = (await chrome.storage.sync.get(KEYS.modalShown))[KEYS.modalShown];
  } catch {
    /* sync unavailable */
  }
  const local = await readKey<unknown>(KEYS.modalShown);
  return [...new Set([...cleanIds(local, MAX_MODAL_IDS), ...cleanIds(synced, MAX_MODAL_IDS)])];
}

export async function addModalShown(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const next = [...new Set([...(await getModalShown()), ...ids])].slice(-MAX_MODAL_IDS);
  store.modalShown = next;
  try {
    await chrome.storage.sync.set({ [KEYS.modalShown]: next });
  } catch {
    await writeKey(KEYS.modalShown, next);
  }
}

/**
 * First run of the modal store on this device. A fresh install records every
 * current modal item as shown, so new users are not greeted by old news.
 */
async function ensureModalSeeded(items: Announcement[]): Promise<void> {
  if (await readKey<boolean>(KEYS.modalSeeded)) return;
  if (await readKey<number>(KEYS.installedAt)) {
    await addModalShown(items.filter((i) => i.modal).map((i) => i.id));
  }
  await writeKey(KEYS.modalSeeded, true);
}

/**
 * The modal item to show now: the newest modal item not shown yet. Every
 * older unshown modal item is recorded together with it, so only one ever
 * appears. Returns null when there is nothing to show.
 */
export async function takeModalItem(items: Announcement[]): Promise<Announcement | null> {
  const shown = new Set(await getModalShown());
  const pending = items.filter((i) => i.modal && !shown.has(i.id)); // newest first
  if (!pending.length) return null;
  await addModalShown(pending.map((i) => i.id).reverse()); // oldest first so the newest survives the cap
  return pending[0];
}

/* ---------------------------- sidebar card state ---------------------------- */

export async function getCardDismissed(): Promise<string[]> {
  return cleanIds(await readKey<unknown>(KEYS.cardDismissed), MAX_DISMISSED_IDS);
}

export async function dismissCard(id: string): Promise<void> {
  const next = [...new Set([...(await getCardDismissed()), id])].slice(-MAX_DISMISSED_IDS);
  store.cardDismissed = next;
  await writeKey(KEYS.cardDismissed, next);
}

/* --------------------------- shared reactive store --------------------------- */

/** One store per page so the sidebar button, panel, modal and card agree. */
export const store = reactive<{
  items: Announcement[];
  seen: SeenState | null;
  loaded: boolean;
  /** Set after the network round and the modal-store seeding. */
  ready: boolean;
  modalShown: string[];
  cardDismissed: string[];
  /** The What's new panel; set it to true from anywhere to open it. */
  panelOpen: boolean;
}>({
  items: [],
  seen: null,
  loaded: false,
  ready: false,
  modalShown: [],
  cardDismissed: [],
  panelOpen: false,
});

let loading: Promise<void> | null = null;

/** Load (bundled + cache instantly, then the network if stale) and seed seen state. */
export function loadAnnouncements(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    // Paint from cache/bundle first so the badge does not wait on the network.
    store.items = await fetchAnnouncements({ cachedOnly: true });
    store.seen = await ensureSeeded(store.items);
    store.cardDismissed = await getCardDismissed();
    store.loaded = true;
    store.items = await fetchAnnouncements();
    store.seen = await getSeenState();
    await ensureModalSeeded(store.items);
    store.modalShown = await getModalShown();
    store.ready = true;
  })().finally(() => {
    loading = null;
  });
  return loading;
}

// Keep tabs in sync: marking seen in one dashboard tab clears the badge in others.
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEYS.seen]) store.seen = cleanSeen(changes[KEYS.seen].newValue);
    if (area === 'local' && changes[KEYS.cardDismissed]) {
      store.cardDismissed = cleanIds(changes[KEYS.cardDismissed].newValue, MAX_DISMISSED_IDS);
    }
    if ((area === 'sync' || area === 'local') && changes[KEYS.modalShown]) {
      void getModalShown().then((ids) => (store.modalShown = ids));
    }
  });
} catch {
  /* not in an extension context */
}

export const INSTALLED_AT_KEY = KEYS.installedAt;
