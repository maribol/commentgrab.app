import type { Comment, Post, ScrapeResult } from '@/shared/types';
import type { ProgressFn, ShouldStop } from './reddit';

/** Single public API host serves the whole Stack Exchange network, no key needed. */
const API = 'https://api.stackexchange.com/2.3';

/** Service workers have no DOM, so strip SE's HTML bodies with regex. */
function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<p>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/&#(?:47|x2F);/gi, '/')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function linksFromHtml(html: string): string[] {
  const out = new Set<string>();
  const rx = /href="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html || ''))) if (!m[1].startsWith('javascript:')) out.add(m[1]);
  return [...out];
}

/** Map a Stack Exchange site hostname to its API `site` parameter. */
function siteParam(host: string): string {
  const h = host.replace(/^www\./, '');
  const direct: Record<string, string> = {
    'stackoverflow.com': 'stackoverflow',
    'serverfault.com': 'serverfault',
    'superuser.com': 'superuser',
    'askubuntu.com': 'askubuntu',
    'mathoverflow.net': 'mathoverflow',
    'meta.stackoverflow.com': 'meta.stackoverflow',
    'meta.serverfault.com': 'meta.serverfault',
    'meta.superuser.com': 'meta.superuser',
    'meta.askubuntu.com': 'meta.askubuntu',
    'meta.stackexchange.com': 'meta.stackexchange',
  };
  if (direct[h]) return direct[h];
  const sub = h.match(/^([a-z0-9-]+)\.stackexchange\.com$/i);
  if (sub) return sub[1];
  const metaSub = h.match(/^([a-z0-9-]+)\.meta\.stackexchange\.com$/i);
  if (metaSub) return metaSub[1];
  return h.replace(/\.(com|net|org)$/, '');
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error_message || `Stack Exchange returned ${res.status}.`);
  return data;
}

function fail(error: string): ScrapeResult {
  return { success: false, comments: [], post: null, platform: 'stackexchange', error };
}

export async function scrapeStackExchange(
  url: string,
  progress: ProgressFn,
  shouldStop?: ShouldStop,
): Promise<ScrapeResult> {
  try {
    const u = new URL(url);
    const id = u.pathname.match(/^\/questions\/(\d+)/i)?.[1];
    if (!id) return fail('Not a Stack Exchange question URL.');
    const host = u.hostname.replace(/^www\./, '');
    const site = siteParam(u.hostname);

    progress('Fetching question…', 12);
    const q = await getJson(`${API}/questions/${id}?site=${site}&filter=withbody`);
    const question = q?.items?.[0];
    if (!question) return fail('Question not found.');

    const post: Post = {
      title: htmlToText(question.title || ''),
      body: htmlToText(question.body || ''),
      url: question.link || url,
      source: host,
      author: question.owner?.display_name || '',
      score: question.score || 0,
      numComments: question.answer_count || 0,
    };

    const comments: Comment[] = [];

    // Answers are the primary content — paginate, highest-voted first.
    let page = 1;
    for (;;) {
      if (shouldStop?.()) break;
      const a = await getJson(
        `${API}/questions/${id}/answers?site=${site}&filter=withbody&pagesize=100&page=${page}&order=desc&sort=votes`,
      );
      for (const ans of a?.items ?? []) {
        comments.push({
          text: htmlToText(ans.body || ''),
          author: ans.owner?.display_name || '',
          timestamp: ans.creation_date ? new Date(ans.creation_date * 1000).toISOString() : '',
          permalink: `https://${host}/a/${ans.answer_id}`,
          links: linksFromHtml(ans.body || ''),
          score: typeof ans.score === 'number' ? ans.score : 'Hidden',
          depth: 0,
          commentId: `a_${ans.answer_id}`,
        });
      }
      progress(`Loading answers… ${comments.length} found`, Math.min(80, 20 + page * 15));
      if (!a?.has_more || page >= 10) break;
      page++;
    }

    // Question comments as a discussion layer under the question.
    if (!shouldStop?.()) {
      try {
        const c = await getJson(
          `${API}/questions/${id}/comments?site=${site}&filter=withbody&pagesize=100&order=asc&sort=creation`,
        );
        for (const cm of c?.items ?? []) {
          comments.push({
            text: htmlToText(cm.body || ''),
            author: cm.owner?.display_name || '',
            timestamp: cm.creation_date ? new Date(cm.creation_date * 1000).toISOString() : '',
            permalink: cm.link || '',
            links: linksFromHtml(cm.body || ''),
            score: typeof cm.score === 'number' ? cm.score : 'Hidden',
            depth: 1,
            commentId: `c_${cm.comment_id}`,
          });
        }
      } catch {
        // Comments are a bonus — never fail the whole scrape over them.
      }
    }

    progress(`Loaded ${comments.length} items`, 96);
    return { success: true, comments, post, platform: 'stackexchange', method: 'json' };
  } catch (err) {
    return fail((err as Error).message);
  }
}
