import type { RepoRef } from './parse';

/* ---------------- Types ---------------- */

export interface GhRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count: number;
  created_at: string;
  pushed_at: string;
  license: { name: string; spdx_id: string } | null;
  language: string | null;
  default_branch: string;
  size: number; // KB
}

export interface GhCommitSummary {
  sha: string;
  commit: { author: { name: string; date: string } | null; message: string };
}

export interface GhCommitFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

export interface GhContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  /** Unix seconds at which the window resets. */
  reset: number;
}

export class RateLimitError extends Error {
  readonly resetAt: number; // unix seconds
  constructor(resetAt: number) {
    super('GitHub API rate limit exceeded');
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

export class RepoNotFoundError extends Error {
  constructor(slug: string) {
    super(`Repository "${slug}" was not found (it may be private or misspelled).`);
    this.name = 'RepoNotFoundError';
  }
}

/* ---------------- Rate-limit header parsing (pure, tested) ---------------- */

export function parseRateLimit(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  if (limit === null || remaining === null || reset === null) return null;
  const l = Number(limit);
  const r = Number(remaining);
  const rs = Number(reset);
  if (!Number.isFinite(l) || !Number.isFinite(r) || !Number.isFinite(rs)) return null;
  return { limit: l, remaining: r, reset: rs };
}

/**
 * True when the response means "you are rate limited": HTTP 403/429 with a
 * zero remaining budget, or a 403 whose body/message mentions rate limiting.
 */
export function isRateLimitResponse(status: number, headers: Headers): boolean {
  if (status !== 403 && status !== 429) return false;
  const info = parseRateLimit(headers);
  return info !== null && info.remaining === 0;
}

/* ---------------- Client ---------------- */

const API = 'https://api.github.com';

export interface FetchResult<T> {
  data: T;
  rate: RateLimitInfo | null;
}

/**
 * Low-level GET against the GitHub REST API. Tracks rate-limit headers via
 * the callback and throws RateLimitError / RepoNotFoundError on the
 * corresponding responses.
 */
export async function apiGet<T>(
  path: string,
  slug: string,
  signal: AbortSignal | undefined,
  onRate: (rate: RateLimitInfo) => void,
  accept?: string,
): Promise<FetchResult<T>> {
  const res = await fetch(`${API}${path}`, {
    signal,
    headers: {
      Accept: accept ?? 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  const rate = parseRateLimit(res.headers);
  if (rate) onRate(rate);

  if (res.status === 404) throw new RepoNotFoundError(slug);
  if (isRateLimitResponse(res.status, res.headers)) {
    throw new RateLimitError(rate?.reset ?? Math.floor(Date.now() / 1000) + 60);
  }
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} on ${path}`);
  }
  if (accept === 'application/vnd.github.raw') {
    return { data: (await res.text()) as unknown as T, rate };
  }
  return { data: (await res.json()) as T, rate };
}

export interface RepoAnalysis {
  repo: GhRepo;
  languages: Record<string, number>;
  commits: GhCommitSummary[];
  contributors: GhContributor[];
  /** File lists from the N most recent commits (for hottest-files). */
  recentFiles: string[][];
  readme: string | null;
  /** True when the hottest-files batch stopped early because of rate limits. */
  hottestTruncated: boolean;
}

/**
 * Fetch everything RepoScope needs for one repo. Commit-detail calls (for
 * hottest files) are capped: at most HOT_COMMITS detail fetches with a small
 * concurrency so we don't burn the unauthenticated 60 req/hr budget.
 */
export async function analyzeRepo(
  ref: RepoRef,
  signal: AbortSignal | undefined,
  onRate: (rate: RateLimitInfo) => void,
  hotCommits = 20,
  concurrency = 4,
): Promise<RepoAnalysis> {
  const slug = `${ref.owner}/${ref.repo}`;

  // Core calls in parallel.
  const [repoRes, langRes, commitRes, contribRes, readmeRes] = await Promise.all([
    apiGet<GhRepo>(`/repos/${ref.owner}/${ref.repo}`, slug, signal, onRate),
    apiGet<Record<string, number>>(`/repos/${ref.owner}/${ref.repo}/languages`, slug, signal, onRate),
    apiGet<GhCommitSummary[]>(`/repos/${ref.owner}/${ref.repo}/commits?per_page=100`, slug, signal, onRate),
    apiGet<GhContributor[]>(
      `/repos/${ref.owner}/${ref.repo}/contributors?per_page=12`,
      slug,
      signal,
      onRate,
    ),
    // README as raw text; 404 means "no README" which is a valid state.
    (async (): Promise<string | null> => {
      try {
        const r = await apiGet<string>(
          `/repos/${ref.owner}/${ref.repo}/readme`,
          slug,
          signal,
          onRate,
          'application/vnd.github.raw',
        );
        return r.data;
      } catch (e) {
        if (e instanceof RepoNotFoundError) return null;
        throw e;
      }
    })(),
  ]);

  // Hottest files: fetch details for the N most recent commits, bounded.
  const recentFiles: string[][] = [];
  let hottestTruncated = false;
  const targets = commitRes.data.slice(0, hotCommits);
  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (c) => {
        try {
          const r = await apiGet<{ files?: GhCommitFile[] }>(
            `/repos/${ref.owner}/${ref.repo}/commits/${c.sha}`,
            slug,
            signal,
            onRate,
          );
          return { files: (r.data.files ?? []).map((f) => f.filename), rateLimited: false };
        } catch (e) {
          if (e instanceof RateLimitError) return { files: [] as string[], rateLimited: true };
          // Individual commit fetches can 404 (force-pushed history etc.) — skip.
          return { files: [] as string[], rateLimited: false };
        }
      }),
    );
    for (const r of results) {
      if (r.rateLimited) hottestTruncated = true;
      recentFiles.push(r.files);
    }
    if (hottestTruncated) break;
  }

  return {
    repo: repoRes.data,
    languages: langRes.data ?? {},
    commits: commitRes.data ?? [],
    contributors: (contribRes.data ?? []).filter((c) => c.type === 'User'),
    recentFiles,
    readme: readmeRes,
    hottestTruncated,
  };
}
