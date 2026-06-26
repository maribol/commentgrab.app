import type { AdAngle, AnalysisResult, Comment, Post, SentimentBreakdown, ThemeCount } from './types';
import { truncate } from './util';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODELS_URL = 'https://api.openai.com/v1/models';

/**
 * OpenAI keys are plain ASCII. Pasting one can drag in invisible or non-Latin1
 * characters (zero-width spaces, smart quotes, stray newlines) that make
 * `fetch` throw "String contains non ISO-8859-1 code point" when it builds the
 * Authorization header. Keep only printable ASCII so the header is always valid.
 */
export function sanitizeKey(raw: string): string {
  return (raw ?? '').replace(/[^\x21-\x7E]/g, '');
}

export interface AnalyzeOptions {
  apiKey: string;
  model: string;
  /** Max comments sampled into the prompt. */
  maxSamples?: number;
  /** Optional user guidance injected into the prompt (audience, tone, focus). */
  instructions?: string;
  signal?: AbortSignal;
}

const SYSTEM_PROMPT = `You are a senior direct-response copywriter and customer-research analyst.
You read raw public comments/reviews and extract the language, pains, and desires marketers can use.
Ground everything in the comments and never invent facts they do not support.
When you write hooks, write them as ready-to-run ad copy that speaks directly to the reader, not as summaries or restated comments.
Always reply with a single valid JSON object and nothing else.`;

function buildUserPrompt(sample: string, post: Post | null, instructions?: string): string {
  const context = post ? `Context — source: ${post.source || 'unknown'}; title: ${post.title || 'n/a'}.` : '';
  const custom = instructions?.trim()
    ? `\nUser instructions (follow these for focus, tone, and angle, but keep the EXACT JSON keys and structure below):\n${instructions.trim()}\n`
    : '';
  return `${context}${custom}

Analyze the following comments and return JSON with EXACTLY these keys:
{
  "summary": "3-5 sentence overview of what this audience cares about",
  "hooks": ["5-10 scroll-stopping ad hooks. Each is a FIRST line for an ad, written as persuasive copy aimed AT the audience in second person (you/your), built on a specific pain, desire, fear, or objection in the comments and using their own words. Do NOT restate, quote, or paraphrase a single comment. Lead with the emotion, then create tension or curiosity. Vary the angle across the set: pain-poke, bold promise, contrarian take, callout, and question. Keep each under ~15 words. Example transform: comment 'applied early May, still no response' becomes hook 'Still refreshing your inbox every morning? The wait is not your fault.'"],
  "objections": ["doubts/hesitations people raise before buying or acting"],
  "emotionalTriggers": ["recurring frustrations and desires"],
  "failedSolutions": ["things people tried that did not work"],
  "customerLanguage": ["exact phrases/words the audience uses, verbatim where possible"],
  "topThemes": [{"theme": "short label", "mentions": estimated_integer_count}],
  "sentiment": {"positive": int_percent, "neutral": int_percent, "negative": int_percent, "label": "one word"}
}
Percentages in "sentiment" must sum to 100. Keep every array between 3 and 12 concise items.

COMMENTS:
${sample}`;
}

function scoreNum(c: Comment): number {
  return typeof c.score === 'number' ? c.score : 0;
}

/** Pick the most informative comments and cap the total characters. */
export function sampleComments(comments: Comment[], maxSamples = 150, charBudget = 14000): string {
  const usable = comments.filter((c) => c.text && c.text.trim().length > 1);
  const ranked = [...usable].sort((a, b) => scoreNum(b) - scoreNum(a)).slice(0, maxSamples);
  const lines: string[] = [];
  let used = 0;
  for (let i = 0; i < ranked.length; i++) {
    const c = ranked[i];
    const score = c.score === 'Hidden' ? '' : ` (${c.score})`;
    const line = `${i + 1}.${score} ${truncate(c.text.replace(/\s+/g, ' '), 400)}`;
    if (used + line.length > charBudget) break;
    lines.push(line);
    used += line.length;
  }
  return lines.join('\n');
}

function asStringArray(value: unknown, limit = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v : v && typeof v === 'object' && 'text' in v ? String((v as any).text) : ''))
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function asThemes(value: unknown): ThemeCount[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (v && typeof v === 'object') {
        const theme = String((v as any).theme ?? (v as any).label ?? '').trim();
        const mentions = Number((v as any).mentions ?? (v as any).count ?? 0);
        return { theme, mentions: Number.isFinite(mentions) ? mentions : 0 };
      }
      return { theme: String(v).trim(), mentions: 0 };
    })
    .filter((t) => t.theme)
    .slice(0, 12);
}

function asSentiment(value: unknown): SentimentBreakdown {
  const v = (value ?? {}) as Record<string, unknown>;
  let positive = clampPct(Number(v.positive));
  let neutral = clampPct(Number(v.neutral));
  let negative = clampPct(Number(v.negative));
  const total = positive + neutral + negative;
  if (total === 0) {
    positive = 33;
    neutral = 34;
    negative = 33;
  } else if (total !== 100) {
    positive = Math.round((positive / total) * 100);
    neutral = Math.round((neutral / total) * 100);
    negative = 100 - positive - neutral;
  }
  const label =
    typeof v.label === 'string' && v.label.trim()
      ? v.label.trim()
      : positive >= negative && positive >= neutral
        ? 'Positive'
        : negative >= neutral
          ? 'Negative'
          : 'Mixed';
  return { positive, neutral, negative, label };
}

function clampPct(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100, Math.round(n));
}

function friendlyError(status: number): string {
  if (status === 401) return 'Invalid OpenAI API key. Check it in Settings.';
  if (status === 403) return 'This OpenAI key is not authorized for that model.';
  if (status === 404) return 'Model not found. Pick a different model in Settings.';
  if (status === 429) return 'OpenAI rate limit / quota reached. Try again shortly.';
  if (status >= 500) return 'OpenAI is having issues right now. Try again in a moment.';
  return `OpenAI request failed (HTTP ${status}).`;
}

/** Lightweight key check used by Settings. */
export async function testApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const key = sanitizeKey(apiKey);
  if (!key) return { ok: false, error: 'No API key provided.' };
  try {
    const res = await fetch(MODELS_URL, { headers: { Authorization: `Bearer ${key}` } });
    if (res.ok) return { ok: true };
    return { ok: false, error: friendlyError(res.status) };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'Network error reaching OpenAI.' };
  }
}

/** Send a sampled set of comments to OpenAI and parse the structured result. */
export async function analyzeComments(
  comments: Comment[],
  post: Post | null,
  opts: AnalyzeOptions,
): Promise<AnalysisResult> {
  const apiKey = sanitizeKey(opts.apiKey);
  if (!apiKey) throw new Error('Add your OpenAI API key in Settings first.');
  if (!comments.length) throw new Error('There are no comments to analyze.');

  const sample = sampleComments(comments, opts.maxSamples ?? 150);
  const body = {
    model: opts.model || 'gpt-4o-mini',
    temperature: 0.5,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: buildUserPrompt(sample, post, opts.instructions) },
    ],
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e) {
    throw new Error((e as Error).message || 'Could not reach OpenAI.');
  }

  if (!res.ok) throw new Error(friendlyError(res.status));

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OpenAI returned an unexpected response. Try again.');
  }

  const sampledCount = sample ? sample.split('\n').filter(Boolean).length : 0;
  const usage = (data?.usage ?? {}) as Record<string, unknown>;
  return {
    model: body.model,
    createdAt: Date.now(),
    commentsAnalyzed: sampledCount,
    tokensIn: Number(usage.prompt_tokens) || 0,
    tokensOut: Number(usage.completion_tokens) || 0,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    hooks: asStringArray(parsed.hooks),
    objections: asStringArray(parsed.objections),
    emotionalTriggers: asStringArray(parsed.emotionalTriggers),
    failedSolutions: asStringArray(parsed.failedSolutions),
    customerLanguage: asStringArray(parsed.customerLanguage),
    topThemes: asThemes(parsed.topThemes),
    sentiment: asSentiment(parsed.sentiment),
  };
}

/* ----------------------------- Ad angles ----------------------------- */

const ANGLES_SYSTEM = `You are a world-class direct-response copywriter in the lineage of Gary Halbert, Eugene Schwartz, and Joe Sugarman.
You turn raw customer comments into visceral ad angles a marketer can run today.
Write every angle AS copy, inside the audience's world: second person, a specific moment or emotion, concrete and a little raw. Never describe strategy ("highlight", "emphasize", "focus on", "tap into", "showcase"). Show the actual angle, do not advise it.
Ground every angle in the real pains, desires, and exact words in the comments. Make each one meaningfully different.
Always reply with a single valid JSON object and nothing else.`;

function buildAnglesPrompt(sample: string, post: Post | null, prior: AnalysisResult | null, instructions?: string): string {
  const context = post ? `Context — source: ${post.source || 'unknown'}; title: ${post.title || 'n/a'}.` : '';
  const custom = instructions?.trim() ? `\nUser instructions (apply for focus, tone, and angle):\n${instructions.trim()}\n` : '';
  const priorBlock = prior
    ? `\nWhat we already learned from the analysis:\nSummary: ${prior.summary}\nObjections: ${(prior.objections ?? []).join('; ')}\nEmotional triggers: ${(prior.emotionalTriggers ?? []).join('; ')}\nCustomer language: ${(prior.customerLanguage ?? []).join('; ')}\n`
    : '';
  return `${context}${custom}${priorBlock}
Write 5 to 8 distinct AD ANGLES for this audience. Each angle is a usable starting point, not advice.

For each angle:
- "angle": a short, punchy concept name (3-6 words).
- "description": 1-2 sentences of ACTUAL ad copy a marketer could paste straight into an ad. Direct-response voice: second person, a specific moment or emotion pulled from the comments, concrete and visceral. No strategy talk, no "highlight/emphasize/focus on/tap into", no explaining why it works.

Each angle must hit a different emotion or entry point (fear, status, relief, anger, hope, belonging, FOMO).

BAD (never write like this): "Emphasize the supportive community to alleviate anxiety and foster encouragement."
GOOD (write like this): "Everyone in that thread is quietly losing it over the wait. You don't have to refresh your inbox alone at 2am. This is where the people going through it actually talk."

Return JSON with EXACTLY this shape:
{ "angles": [ { "angle": "concept name", "description": "real direct-response copy, ready to paste" } ] }

COMMENTS:
${sample}`;
}

function asAngles(value: unknown): AdAngle[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (v && typeof v === 'object') {
        const angle = String((v as any).angle ?? (v as any).name ?? (v as any).title ?? '').trim();
        const description = String((v as any).description ?? (v as any).rationale ?? (v as any).detail ?? '').trim();
        return { angle, description };
      }
      return { angle: String(v).trim(), description: '' };
    })
    .filter((a) => a.angle)
    .slice(0, 10);
}

export interface AdAnglesResult {
  adAngles: AdAngle[];
  tokensIn: number;
  tokensOut: number;
}

/** Generate ad angles on demand. Returns the angles plus token usage to add on. */
export async function generateAdAngles(
  comments: Comment[],
  post: Post | null,
  prior: AnalysisResult | null,
  opts: AnalyzeOptions,
): Promise<AdAnglesResult> {
  const apiKey = sanitizeKey(opts.apiKey);
  if (!apiKey) throw new Error('Add your OpenAI API key in Settings first.');
  if (!comments.length) throw new Error('There are no comments to work from.');

  const sample = sampleComments(comments, opts.maxSamples ?? 150);
  const body = {
    model: opts.model || 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system' as const, content: ANGLES_SYSTEM },
      { role: 'user' as const, content: buildAnglesPrompt(sample, post, prior, opts.instructions) },
    ],
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e) {
    throw new Error((e as Error).message || 'Could not reach OpenAI.');
  }
  if (!res.ok) throw new Error(friendlyError(res.status));

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OpenAI returned an unexpected response. Try again.');
  }
  const usage = (data?.usage ?? {}) as Record<string, unknown>;
  return {
    adAngles: asAngles(parsed.angles ?? parsed.adAngles ?? (parsed as any).ad_angles),
    tokensIn: Number(usage.prompt_tokens) || 0,
    tokensOut: Number(usage.completion_tokens) || 0,
  };
}

/* ------------------------------- Hooks -------------------------------- */

export interface HooksResult {
  hooks: string[];
  tokensIn: number;
  tokensOut: number;
}

function buildHooksPrompt(sample: string, post: Post | null, prior: AnalysisResult | null, instructions?: string): string {
  const context = post ? `Context — source: ${post.source || 'unknown'}; title: ${post.title || 'n/a'}.` : '';
  const custom = instructions?.trim() ? `\nUser instructions (apply for focus, tone, and angle):\n${instructions.trim()}\n` : '';
  const priorBlock = prior
    ? `\nWhat we already learned:\nSummary: ${prior.summary}\nObjections: ${(prior.objections ?? []).join('; ')}\nEmotional triggers: ${(prior.emotionalTriggers ?? []).join('; ')}\n`
    : '';
  return `${context}${custom}${priorBlock}
Write 8 to 12 scroll-stopping ad HOOKS for this audience. Each is a FIRST line for an ad, written as persuasive copy aimed AT the audience in second person (you/your), built on a specific pain, desire, fear, or objection in the comments and using their own words. Do NOT restate, quote, or paraphrase a single comment. Lead with the emotion, then create tension or curiosity. Vary the angle: pain-poke, bold promise, contrarian take, callout, question. Keep each under ~15 words.

Return JSON with EXACTLY this shape:
{ "hooks": ["hook one", "hook two"] }

COMMENTS:
${sample}`;
}

/** Regenerate just the hooks on demand. Returns hooks plus token usage to add on. */
export async function generateHooks(
  comments: Comment[],
  post: Post | null,
  prior: AnalysisResult | null,
  opts: AnalyzeOptions,
): Promise<HooksResult> {
  const apiKey = sanitizeKey(opts.apiKey);
  if (!apiKey) throw new Error('Add your OpenAI API key in Settings first.');
  if (!comments.length) throw new Error('There are no comments to work from.');

  const sample = sampleComments(comments, opts.maxSamples ?? 150);
  const body = {
    model: opts.model || 'gpt-4o-mini',
    temperature: 0.8,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: buildHooksPrompt(sample, post, prior, opts.instructions) },
    ],
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e) {
    throw new Error((e as Error).message || 'Could not reach OpenAI.');
  }
  if (!res.ok) throw new Error(friendlyError(res.status));

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OpenAI returned an unexpected response. Try again.');
  }
  const usage = (data?.usage ?? {}) as Record<string, unknown>;
  return {
    hooks: asStringArray(parsed.hooks),
    tokensIn: Number(usage.prompt_tokens) || 0,
    tokensOut: Number(usage.completion_tokens) || 0,
  };
}
