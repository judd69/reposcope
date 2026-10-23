export interface RepoRef {
  owner: string;
  repo: string;
}

const REPO_NAME_RE = /^[A-Za-z0-9_.-]+$/;
const OWNER_NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

/**
 * Accepts a full GitHub URL (https://github.com/facebook/react,
 * https://github.com/facebook/react/tree/main, with or without .git),
 * a bare host path (github.com/facebook/react) or plain "owner/repo".
 * Returns the owner/repo pair, or null when the input is not parseable
 * as a public GitHub repo reference.
 */
export function parseRepoInput(input: string): RepoRef | null {
  const raw = input.trim();
  if (!raw) return null;

  let pathPart = raw;

  // Strip scheme if present.
  const schemeIdx = raw.indexOf('://');
  if (schemeIdx !== -1) {
    pathPart = raw.slice(schemeIdx + 3);
  }

  // Strip a github.com host prefix when present.
  if (/^github\.com(?=[/:?#]|$)/i.test(pathPart)) {
    pathPart = pathPart.slice('github.com'.length);
  } else if (/^www\.github\.com(?=[/:?#]|$)/i.test(pathPart)) {
    pathPart = pathPart.slice('www.github.com'.length);
  } else if (schemeIdx !== -1) {
    // A URL was given but the host is not github.com — reject it.
    return null;
  }

  // Strip query string / fragment.
  const cut = pathPart.search(/[?#]/);
  if (cut !== -1) pathPart = pathPart.slice(0, cut);

  // Trim slashes and take the first two path segments (ignore /tree/..., /issues, etc).
  const segments = pathPart
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  if (segments.length < 2) return null;

  let owner = segments[0];
  let repo = segments[1];
  // Strip a trailing ".git".
  if (repo.toLowerCase().endsWith('.git')) {
    repo = repo.slice(0, -4);
  }
  if (!owner || !repo) return null;
  if (!OWNER_NAME_RE.test(owner) || !REPO_NAME_RE.test(repo)) return null;

  return { owner, repo };
}

/** Canonical "owner/repo" slug. */
export function repoSlug(ref: RepoRef): string {
  return `${ref.owner}/${ref.repo}`;
}
