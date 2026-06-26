import type { Comment, Post, ScrapeResult } from '@/shared/types';
import type { ProgressFn, ShouldStop } from './reddit';

const API = 'https://api.github.com';

/** Public REST API — unauthenticated reads work for public repos (60 req/hr/IP). */
function headers(): HeadersInit {
  return { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}

function extractLinks(md: string): string[] {
  const out = new Set<string>();
  const mdLink = /\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  const bare = /(?<![("])\bhttps?:\/\/[^\s)<>\]]+/g;
  let m: RegExpExecArray | null;
  while ((m = mdLink.exec(md || ''))) out.add(m[1]);
  while ((m = bare.exec(md || ''))) out.add(m[0]);
  return [...out];
}

interface GhComment {
  id: number;
  user?: { login?: string };
  body?: string;
  created_at?: string;
  html_url?: string;
  reactions?: { total_count?: number };
}

function fail(error: string, rateLimited = false): ScrapeResult {
  return { success: false, comments: [], post: null, platform: 'github', error, rateLimited };
}

export async function scrapeGitHub(url: string, progress: ProgressFn, shouldStop?: ShouldStop): Promise<ScrapeResult> {
  try {
    // Issues and PRs share the issue-comments endpoint for conversation comments.
    const m = new URL(url).pathname.match(/^\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)/i);
    if (!m) return fail('Not a GitHub issue or pull request URL.');
    const [, owner, repo, num] = m;
    const base = `${API}/repos/${owner}/${repo}/issues/${num}`;

    progress('Fetching thread…', 12);
    const issueRes = await fetch(base, { headers: headers() });
    if (issueRes.status === 403)
      return fail('GitHub rate-limited the request (60/hour unauthenticated). Try again later.', true);
    if (!issueRes.ok) return fail(`GitHub returned ${issueRes.status}.`);
    const issue = await issueRes.json();

    const post: Post = {
      title: issue?.title || `${owner}/${repo} #${num}`,
      body: issue?.body || '',
      url: issue?.html_url || url,
      source: `${owner}/${repo}`,
      author: issue?.user?.login || '',
      score: issue?.reactions?.total_count || 0,
      numComments: issue?.comments || 0,
    };

    const comments: Comment[] = [];
    let page = 1;
    for (;;) {
      if (shouldStop?.()) break;
      const res = await fetch(`${base}/comments?per_page=100&page=${page}`, { headers: headers() });
      if (res.status === 403) {
        if (comments.length) break; // keep what we have
        return fail('GitHub rate-limited the request (60/hour unauthenticated). Try again later.', true);
      }
      if (!res.ok) break;
      const batch: GhComment[] = await res.json();
      for (const c of batch) {
        comments.push({
          text: (c.body || '').trim(),
          author: c.user?.login || '',
          timestamp: c.created_at || '',
          permalink: c.html_url || '',
          links: extractLinks(c.body || ''),
          score: c.reactions?.total_count ?? 'Hidden',
          depth: 0,
          commentId: `gc_${c.id}`,
        });
      }
      progress(`Loading comments… ${comments.length} found`, Math.min(90, 20 + page * 10));
      if (batch.length < 100) break;
      page++;
    }

    progress(`Loaded ${comments.length} comments`, 96);
    return { success: true, comments, post, platform: 'github', method: 'json' };
  } catch (err) {
    return fail((err as Error).message);
  }
}
