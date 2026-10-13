/**
 * "Rate CommentGrab" prompt: when to ask, and remembering the answer.
 *
 * Chrome Web Store policy: a plain request only. Nothing is offered in
 * exchange, no rating is suggested, and no feature waits on it.
 *
 * Rules
 *  - Ask after the 3rd engaged action (successful export, or a finished
 *    analysis when a surface reports one), never on the first day after install.
 *  - "Leave a review" and "Don't ask again" end it for good.
 *  - "Not now" snoozes for 14 days AND 5 more actions (both must pass).
 *  - A prompt that is shown and ignored waits 3 days and 1 more action.
 *  - At most 3 asks ever.
 *
 * State lives in chrome.storage.local under its own key. This module has no
 * Vue dependency so stats.ts (also bundled into the content script) stays light.
 */

export const REVIEW_URL = 'https://chromewebstore.google.com/detail/lbgkamikahfmdelplfmkmbcjonofnmhd/reviews';

const KEY = 'commentgrab:review';
/** Written by the service worker on a fresh install. */
const INSTALLED_AT_KEY = 'commentgrab:installedAt';

const DAY = 24 * 60 * 60 * 1000;
export const REVIEW_RULES = {
  minActions: 3,
  minAgeMs: DAY,
  snoozeMs: 14 * DAY,
  snoozeActions: 5,
  ignoredMs: 3 * DAY,
  ignoredActions: 1,
  maxAsks: 3,
} as const;

export interface ReviewState {
  /** Engaged actions counted so far (exports, finished analyses). */
  actions: number;
  /** First time this module ran, used when installedAt is missing (ms). */
  firstSeenAt: number;
  /** Times the card was shown. */
  asks: number;
  lastAskedAt: number;
  /** Do not ask before this time (ms)... */
  snoozeUntil: number;
  /** ...and before `actions` reaches this. */
  snoozeUntilActions: number;
  /** Set once the user reviewed or said never. */
  done: false | 'reviewed' | 'never';
}

function fresh(now = Date.now()): ReviewState {
  return { actions: 0, firstSeenAt: now, asks: 0, lastAskedAt: 0, snoozeUntil: 0, snoozeUntilActions: 0, done: false };
}

function hasStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

export async function getReviewState(): Promise<ReviewState> {
  if (!hasStorage()) return fresh();
  try {
    const got = await chrome.storage.local.get(KEY);
    const raw = got[KEY] as Partial<ReviewState> | undefined;
    if (raw && typeof raw === 'object') return { ...fresh(), ...raw };
  } catch {
    /* fall through */
  }
  const state = fresh();
  await saveReviewState(state);
  return state;
}

async function saveReviewState(state: ReviewState): Promise<void> {
  if (!hasStorage()) return;
  try {
    await chrome.storage.local.set({ [KEY]: state });
  } catch {
    /* storage full or context gone: the prompt is optional */
  }
}

async function installedAt(state: ReviewState): Promise<number> {
  try {
    const got = await chrome.storage.local.get(INSTALLED_AT_KEY);
    const v = got[INSTALLED_AT_KEY];
    if (typeof v === 'number' && v > 0) return v;
  } catch {
    /* ignore */
  }
  return state.firstSeenAt;
}

/** Pure eligibility check, exported for tests. */
export function isEligible(state: ReviewState, installed: number, now = Date.now()): boolean {
  if (state.done) return false;
  if (state.asks >= REVIEW_RULES.maxAsks) return false;
  if (state.actions < REVIEW_RULES.minActions) return false;
  if (now - installed < REVIEW_RULES.minAgeMs) return false;
  if (now < state.snoozeUntil) return false;
  if (state.actions < state.snoozeUntilActions) return false;
  return true;
}

/* ------------------------- in-page notification ------------------------- */

type Listener = () => void;
const listeners = new Set<Listener>();

/** Called when an action in THIS page made the prompt due. Returns an unsubscribe. */
export function onReviewDue(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Count one engaged action (call after a successful export or analysis).
 * If the prompt is now due, records the ask and notifies listeners in this
 * page so a mounted <ReviewPrompt> can appear right where the action happened.
 * Never throws.
 */
export async function noteEngagedAction(): Promise<boolean> {
  if (!hasStorage()) return false;
  try {
    const state = await getReviewState();
    state.actions += 1;
    const now = Date.now();
    const due = listeners.size > 0 && isEligible(state, await installedAt(state), now);
    if (due) {
      state.asks += 1;
      state.lastAskedAt = now;
      // If it is ignored (surface closed without an answer), wait a little.
      state.snoozeUntil = Math.max(state.snoozeUntil, now + REVIEW_RULES.ignoredMs);
      state.snoozeUntilActions = Math.max(state.snoozeUntilActions, state.actions + REVIEW_RULES.ignoredActions);
    }
    await saveReviewState(state);
    if (due) listeners.forEach((fn) => fn());
    return due;
  } catch {
    return false;
  }
}

/** "Leave a review": never ask again. */
export async function markReviewed(): Promise<void> {
  const state = await getReviewState();
  state.done = 'reviewed';
  await saveReviewState(state);
}

/** "Don't ask again". */
export async function markNeverAsk(): Promise<void> {
  const state = await getReviewState();
  state.done = 'never';
  await saveReviewState(state);
}

/** "Not now": 14 days and 5 more actions, both required. */
export async function snoozeReview(): Promise<void> {
  const state = await getReviewState();
  state.snoozeUntil = Date.now() + REVIEW_RULES.snoozeMs;
  state.snoozeUntilActions = state.actions + REVIEW_RULES.snoozeActions;
  await saveReviewState(state);
}
