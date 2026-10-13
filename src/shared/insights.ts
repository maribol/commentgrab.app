import type { Comment, Post, SavedCollection } from './types';

/** What an insights view analyzes. `instructions` is context placed before the user's own. */
export interface InsightsSource {
  comments: Comment[];
  post: Post | null;
  instructions?: string;
}

/**
 * Combined insights: one AI analysis over several collections (a board or a
 * batch). `analyzeComments` ranks its input by score and stops at a character
 * budget, so feeding it a raw merge would let one busy thread with high-scored
 * comments fill the whole prompt. Instead we pick a per-thread quota (weighted
 * by the square root of its size, so big threads get more but never all of
 * it), take each thread's best comments, interleave them round-robin, and
 * strip the scores so the downstream sort keeps that fair order.
 */
export function mergeForCombined(collections: SavedCollection[], budget = 150): Comment[] {
  const pools = collections
    .map((c) =>
      (Array.isArray(c.comments) ? c.comments : [])
        .filter((x) => x.text && x.text.trim().length > 1)
        .sort((a, b) => num(b.score) - num(a.score)),
    )
    .filter((p) => p.length);
  if (!pools.length) return [];

  const weights = pools.map((p) => Math.sqrt(p.length));
  const total = weights.reduce((a, b) => a + b, 0);
  const quotas = pools.map((p, i) => Math.min(p.length, Math.max(3, Math.round((weights[i] / total) * budget))));

  const picked = pools.map((p, i) => p.slice(0, quotas[i]));
  const out: Comment[] = [];
  for (let round = 0; out.length < budget; round++) {
    let added = false;
    for (const list of picked) {
      if (round < list.length) {
        out.push({ ...list[round], score: 'Hidden' });
        added = true;
        if (out.length >= budget) break;
      }
    }
    if (!added) break;
  }
  return out;
}

/** Context line placed before the user's own analysis instructions. */
export function combinedInstructions(label: string, threads: number): string {
  return `These comments come from ${threads} different threads grouped under "${label}". Treat them as one audience and look for what repeats across threads.`;
}

/** Load full collections (comments included) and build a fair combined source. */
export async function combinedSource(
  label: string,
  ids: string[],
  getCollection: (id: string) => Promise<SavedCollection | undefined>,
): Promise<InsightsSource> {
  const loaded = (await Promise.all(ids.map((id) => getCollection(id)))).filter((c): c is SavedCollection => !!c);
  return { comments: mergeForCombined(loaded), post: null, instructions: combinedInstructions(label, loaded.length) };
}

function num(s: Comment['score']): number {
  return typeof s === 'number' ? s : 0;
}
