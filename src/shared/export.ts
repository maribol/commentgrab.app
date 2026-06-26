import type { AnalysisResult, Comment, ExportFormat, ExportSettings, PlatformId, Post } from './types';

/* ------------------------------- CSV ---------------------------------- */

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildCsv(comments: Comment[], post: Post | null, settings: ExportSettings): string {
  const rows: string[] = [];

  if (settings.includePostInfo && post) {
    rows.push('=== POST ===');
    if (post.title) rows.push(`${csvCell('Title')},${csvCell(post.title)}`);
    if (post.source) rows.push(`${csvCell('Source')},${csvCell(post.source)}`);
    if (post.url) rows.push(`${csvCell('URL')},${csvCell(post.url)}`);
    if (post.body) rows.push(`${csvCell('Body')},${csvCell(post.body)}`);
    rows.push('');
    rows.push('=== COMMENTS ===');
  }

  const isProfile = comments.some((c) => c.subreddit || c.type === 'post');

  const header: string[] = [];
  if (settings.includeMetadata) header.push('Author', 'Time');
  if (isProfile) header.push('Subreddit', 'Type', 'Title');
  if (settings.includeScores) header.push('Score');
  if (settings.preserveThreads) header.push('Depth', 'Is Reply');
  header.push('Comment');
  if (settings.includePermalinks) header.push('Permalink');
  if (settings.includeLinks) header.push('Links');
  rows.push(header.map(csvCell).join(','));

  for (const c of comments) {
    const row: string[] = [];
    if (settings.includeMetadata) row.push(csvCell(c.author), csvCell(c.timestamp));
    if (isProfile) row.push(csvCell(c.subreddit ?? ''), csvCell(c.type ?? ''), csvCell(c.title ?? ''));
    if (settings.includeScores) row.push(csvCell(c.score));
    if (settings.preserveThreads) row.push(csvCell(c.depth), csvCell(c.depth > 0 ? 'Yes' : 'No'));
    row.push(csvCell(c.text));
    if (settings.includePermalinks) row.push(csvCell(c.permalink));
    if (settings.includeLinks) row.push(csvCell((c.links ?? []).join(' ; ')));
    rows.push(row.join(','));
  }

  // BOM + CRLF makes Excel open UTF-8 cleanly.
  return '\uFEFF' + rows.join('\r\n');
}

/* ------------------------------- JSON --------------------------------- */

export function buildJson(
  comments: Comment[],
  post: Post | null,
  settings: ExportSettings,
  platform: PlatformId,
): string {
  const processed = comments.map((c) => {
    const out: Record<string, unknown> = { text: c.text };
    if (settings.includeMetadata) {
      out.author = c.author;
      out.timestamp = c.timestamp;
    }
    if (c.subreddit) out.subreddit = c.subreddit;
    if (c.type) out.type = c.type;
    if (c.title) out.title = c.title;
    if (settings.includeScores) out.score = c.score;
    if (settings.preserveThreads) {
      out.depth = c.depth;
      out.isReply = c.depth > 0;
    }
    if (settings.includePermalinks && c.permalink) out.permalink = c.permalink;
    if (settings.includeLinks && c.links?.length) out.links = c.links;
    if (c.commentId) out.commentId = c.commentId;
    if (typeof c.replyCount === 'number') out.replyCount = c.replyCount;
    return out;
  });

  const payload: Record<string, unknown> = {
    exportedBy: 'CommentGrab',
    scrapedAt: new Date().toISOString(),
    platform,
    count: processed.length,
    comments: processed,
  };
  if (settings.includePostInfo && post) {
    payload.post = post;
  }
  return JSON.stringify(payload, null, 2);
}

/* ----------------------------- Markdown ------------------------------- */

export function buildMarkdown(comments: Comment[], post: Post | null, settings: ExportSettings): string {
  const lines: string[] = [];

  if (settings.includePostInfo && post) {
    lines.push(`# ${post.title || 'Comments'}`);
    if (post.source) lines.push(`**Source:** ${post.source}`);
    if (post.url) lines.push(`**URL:** ${post.url}`);
    if (post.body) lines.push('', post.body);
    lines.push('', '---', '');
  }

  comments.forEach((c, i) => {
    const indent = settings.preserveThreads ? '  '.repeat(Math.max(0, c.depth)) : '';
    const meta: string[] = [];
    if (settings.includeMetadata && c.author) meta.push(`**${c.author}**`);
    if (settings.includeScores && c.score !== 'Hidden') meta.push(`▲ ${c.score}`);
    if (settings.includeMetadata && c.timestamp) meta.push(c.timestamp);
    const header = meta.length ? `${indent}> ${meta.join(' · ')}` : `${indent}> Comment ${i + 1}`;
    lines.push(header);
    for (const textLine of c.text.split('\n')) {
      lines.push(`${indent}> ${textLine}`);
    }
    if (settings.includePermalinks && c.permalink) lines.push(`${indent}> [link](${c.permalink})`);
    lines.push('');
  });

  return lines.join('\n');
}

/* ---------------------------- Clipboard ------------------------------- */

export function buildClipboardText(comments: Comment[], post: Post | null, settings: ExportSettings): string {
  const lines: string[] = [];
  if (settings.includePostInfo && post?.title) {
    lines.push(post.title);
    if (post.url) lines.push(post.url);
    lines.push('');
  }
  comments.forEach((c, i) => {
    const indent = settings.preserveThreads ? '  '.repeat(Math.max(0, c.depth)) : '';
    const head: string[] = [`${i + 1}.`];
    if (settings.includeMetadata && c.author) head.push(c.author);
    if (settings.includeScores && c.score !== 'Hidden') head.push(`(${c.score})`);
    lines.push(`${indent}${head.join(' ')}`);
    lines.push(`${indent}${c.text}`);
    lines.push('');
  });
  return lines.join('\n');
}

/* ----------------------------- Analysis ------------------------------- */

export interface AnalysisMeta {
  title?: string;
  platform?: PlatformId;
  url?: string;
  /** Total comments in the collection (analyzed count lives on the result). */
  commentCount?: number;
}

/** Render an AI analysis result as a clean Markdown report. */
export function buildAnalysisMarkdown(a: AnalysisResult, meta: AnalysisMeta = {}): string {
  const lines: string[] = [];
  lines.push(`# ${meta.title?.trim() || 'Comment analysis'}`, '');

  const facts: string[] = [];
  if (meta.platform) facts.push(`**Platform:** ${meta.platform}`);
  if (a.commentsAnalyzed) {
    facts.push(
      `**Comments analyzed:** ${a.commentsAnalyzed.toLocaleString()}` +
        (meta.commentCount ? ` of ${meta.commentCount.toLocaleString()}` : ''),
    );
  }
  if (a.model) facts.push(`**Model:** ${a.model}`);
  if (a.createdAt) facts.push(`**Date:** ${new Date(a.createdAt).toLocaleString()}`);
  if (a.tokensIn || a.tokensOut) {
    facts.push(`**Tokens:** ${(a.tokensIn ?? 0).toLocaleString()} in / ${(a.tokensOut ?? 0).toLocaleString()} out`);
  }
  if (meta.url) facts.push(`**Source:** ${meta.url}`);
  if (facts.length) lines.push(...facts, '');

  if (a.summary) lines.push('## Summary', '', a.summary, '');

  if (a.sentiment) {
    const s = a.sentiment;
    lines.push('## Sentiment', '', `${s.label}. Positive ${s.positive}%, Neutral ${s.neutral}%, Negative ${s.negative}%.`, '');
  }

  const numbered = (heading: string, items: string[]): void => {
    if (!items?.length) return;
    lines.push(`## ${heading}`, '');
    items.forEach((it, i) => lines.push(`${i + 1}. ${it}`));
    lines.push('');
  };
  const bulleted = (heading: string, items: string[], quote = false): void => {
    if (!items?.length) return;
    lines.push(`## ${heading}`, '');
    items.forEach((it) => lines.push(quote ? `- "${it}"` : `- ${it}`));
    lines.push('');
  };

  numbered('Hooks', a.hooks);
  bulleted('Objections', a.objections);
  bulleted('Emotional triggers', a.emotionalTriggers);
  bulleted('Failed solutions', a.failedSolutions);
  bulleted('Customer language', a.customerLanguage, true);

  if (a.topThemes?.length) {
    lines.push('## Top themes', '');
    a.topThemes.forEach((t) => lines.push(`- ${t.theme} (${t.mentions})`));
    lines.push('');
  }

  if (a.adAngles?.length) {
    lines.push('## Ad angles', '');
    a.adAngles.forEach((ang, i) => {
      lines.push(`${i + 1}. **${ang.angle}**${ang.description ? ` — ${ang.description}` : ''}`);
    });
    lines.push('');
  }

  lines.push('---', '', 'Generated by CommentGrab.app');
  return lines.join('\n');
}

export async function exportAnalysis(
  format: 'markdown' | 'clipboard',
  analysis: AnalysisResult,
  meta: AnalysisMeta = {},
): Promise<ExportOutcome> {
  const md = buildAnalysisMarkdown(analysis, meta);
  if (format === 'clipboard') {
    const ok = await copyText(md);
    return { ok, format: 'clipboard', count: 1 };
  }
  const filename = buildFilename(
    { title: `${meta.title || 'comments'} analysis`, body: '', url: meta.url || '', source: '' },
    meta.platform || 'generic',
    'md',
  );
  downloadBlob(md, filename, 'text/markdown;charset=utf-8;');
  return { ok: true, format: 'markdown', filename, count: 1 };
}

/* ----------------------------- Filename ------------------------------- */

export function buildFilename(post: Post | null, platform: PlatformId, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = (post?.title || post?.source || platform || 'comments')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 70);
  return `commentgrab_${base || 'comments'}_${date}.${ext}`;
}

/* --------------------------- Orchestration ---------------------------- */

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for restrictive contexts.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export interface ExportOutcome {
  ok: boolean;
  format: ExportFormat;
  filename?: string;
  count: number;
}

/**
 * Build the chosen format and either download a file or copy to clipboard.
 * Must run from a context with DOM access (popup, dashboard, content script).
 */
export async function exportComments(
  format: ExportFormat,
  comments: Comment[],
  post: Post | null,
  settings: ExportSettings,
  platform: PlatformId,
): Promise<ExportOutcome> {
  // Tolerate a collection that lost its comments array (legacy/corrupted data)
  // so the export buttons degrade gracefully instead of throwing.
  comments = Array.isArray(comments) ? comments : [];
  const count = comments.length;
  if (format === 'clipboard') {
    const ok = await copyText(buildClipboardText(comments, post, settings));
    return { ok, format, count };
  }
  if (format === 'csv') {
    const filename = buildFilename(post, platform, 'csv');
    downloadBlob(buildCsv(comments, post, settings), filename, 'text/csv;charset=utf-8;');
    return { ok: true, format, filename, count };
  }
  if (format === 'markdown') {
    const filename = buildFilename(post, platform, 'md');
    downloadBlob(buildMarkdown(comments, post, settings), filename, 'text/markdown;charset=utf-8;');
    return { ok: true, format, filename, count };
  }
  const filename = buildFilename(post, platform, 'json');
  downloadBlob(buildJson(comments, post, settings, platform), filename, 'application/json');
  return { ok: true, format, filename, count };
}
