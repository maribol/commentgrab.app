import type { AnalysisResult, Comment, Post } from './types';
import {
  SYSTEM_PROMPT, ANGLES_SYSTEM, buildUserPrompt, buildAnglesPrompt, buildHooksPrompt, sampleComments,
} from './openai';

/**
 * Local, pre-flight estimate of an OpenAI call: built from the SAME sample and
 * prompt builders the real request uses, so what the confirm dialog shows is
 * what gets sent. Token counts use ~4 characters per token (close to cl100k /
 * o200k for English prose) plus a small per-message overhead.
 */

export type EstimateKind = 'analysis' | 'angles' | 'hooks';

export interface RunEstimate {
  kind: EstimateKind;
  model: string;
  /** Comments that make it into the prompt after sampling. */
  sent: number;
  /** Comments available before sampling. */
  total: number;
  inputTokens: number;
  outputTokens: number;
  /** True when `outputTokens` is a hard cap (max_tokens); false when it is a typical figure. */
  outputIsCap: boolean;
  /** USD, or null when the model has no known price. */
  cost: number | null;
  /** Number of API requests this covers (bulk runs sum several). */
  requests: number;
}

/**
 * USD per 1M tokens, standard (non-batch) tier. Taken from OpenAI's pricing page
 * (developers.openai.com/api/docs/pricing) on 2026-10-13. Keys are model ids;
 * a dated snapshot (e.g. gpt-4o-2024-08-06) matches its base id, longest key first.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1': { input: 2, output: 8 },
  'o4-mini': { input: 1.1, output: 4.4 },
  o3: { input: 2, output: 8 },
  'gpt-5-nano': { input: 0.05, output: 0.4 },
  'gpt-5-mini': { input: 0.25, output: 2 },
  'gpt-5': { input: 1.25, output: 10 },
  'gpt-5.1': { input: 1.25, output: 10 },
  'gpt-5.2': { input: 1.75, output: 14 },
  'gpt-5.4-nano': { input: 0.2, output: 1.25 },
  'gpt-5.4-mini': { input: 0.75, output: 4.5 },
  'gpt-5.4': { input: 2.5, output: 15 },
  'gpt-5.5': { input: 5, output: 30 },
};

/** Typical completion size per action. None of the calls set max_tokens, so these are "about" figures. */
const TYPICAL_OUTPUT: Record<EstimateKind, number> = { analysis: 1500, angles: 800, hooks: 500 };

export function priceFor(model: string): { input: number; output: number } | null {
  const id = (model || '').trim().toLowerCase();
  const key = Object.keys(PRICES)
    .sort((a, b) => b.length - a.length)
    .find((k) => id === k || id.startsWith(`${k}-`));
  return key ? PRICES[key] : null;
}

export function costOf(model: string, inputTokens: number, outputTokens: number): number | null {
  const p = priceFor(model);
  if (!p) return null;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function approxTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}

/** "$0.002", "$0.14", "$1.20" (callers word amounts under $0.001 themselves). */
export function formatUsd(n: number): string {
  if (n < 0.01) return `$${n.toFixed(3)}`;
  if (n < 1) return `$${n.toFixed(n < 0.1 ? 3 : 2)}`;
  return `$${n.toFixed(2)}`;
}

export function estimateRun(
  kind: EstimateKind,
  comments: Comment[],
  post: Post | null,
  opts: { model: string; instructions?: string; prior?: AnalysisResult | null; maxSamples?: number; /** Comments before any pre-sampling (combined reports). */ total?: number },
): RunEstimate {
  const model = opts.model || 'gpt-4o-mini';
  const sample = sampleComments(comments, opts.maxSamples ?? 150);
  const sent = sample ? sample.split('\n').filter(Boolean).length : 0;
  let system = SYSTEM_PROMPT;
  let user: string;
  if (kind === 'angles') {
    system = ANGLES_SYSTEM;
    user = buildAnglesPrompt(sample, post, opts.prior ?? null, opts.instructions);
  } else if (kind === 'hooks') {
    user = buildHooksPrompt(sample, post, opts.prior ?? null, opts.instructions);
  } else {
    user = buildUserPrompt(sample, post, opts.instructions);
  }
  const inputTokens = approxTokens(system) + approxTokens(user) + 12;
  const outputTokens = TYPICAL_OUTPUT[kind];
  return {
    kind,
    model,
    sent,
    total: opts.total ?? comments.filter((c) => c.text && c.text.trim().length > 1).length,
    inputTokens,
    outputTokens,
    outputIsCap: false,
    cost: costOf(model, inputTokens, outputTokens),
    requests: 1,
  };
}

/** Sum several estimates (bulk "Analyze selected"). */
export function sumEstimates(list: RunEstimate[]): RunEstimate | null {
  if (!list.length) return null;
  const costs = list.map((e) => e.cost);
  return {
    kind: list[0].kind,
    model: list[0].model,
    sent: list.reduce((n, e) => n + e.sent, 0),
    total: list.reduce((n, e) => n + e.total, 0),
    inputTokens: list.reduce((n, e) => n + e.inputTokens, 0),
    outputTokens: list.reduce((n, e) => n + e.outputTokens, 0),
    outputIsCap: list.every((e) => e.outputIsCap),
    cost: costs.some((c) => c === null) ? null : (costs as number[]).reduce((a, b) => a + b, 0),
    requests: list.reduce((n, e) => n + e.requests, 0),
  };
}
