import './styles.css';
import { parseRepoInput, repoSlug, type RepoRef } from './parse';
import { analyzeRepo, RateLimitError, RepoNotFoundError, type RateLimitInfo } from './api';
import {
  buildShell,
  setInputValue,
  setRatePill,
  renderSkeletons,
  renderError,
  renderRateLimit,
  renderVitals,
  renderLanguages,
  renderRhythm,
  renderContributors,
  renderFiles,
  renderReadme,
} from './ui';

const DEFAULT_REPO: RepoRef = { owner: 'facebook', repo: 'react' };

let currentController: AbortController | null = null;

function onRate(rate: RateLimitInfo): void {
  setRatePill(rate);
}

async function scan(input: string): Promise<void> {
  const ref = parseRepoInput(input);
  const container = document.querySelector<HTMLElement>('#results')!;
  if (!ref) {
    renderError(
      container,
      input.trim() || '(empty input)',
      'That doesn’t look like a GitHub repo. Try a full URL like https://github.com/facebook/react or just owner/repo.',
      () => scan(input),
    );
    return;
  }

  // Cancel any in-flight scan so rapid re-submits don’t interleave.
  currentController?.abort();
  const controller = new AbortController();
  currentController = controller;

  const slug = repoSlug(ref);
  setInputValue(slug);
  renderSkeletons(container, slug);
  history.replaceState(null, '', `?repo=${encodeURIComponent(slug)}`);

  try {
    const analysis = await analyzeRepo(ref, controller.signal, onRate);
    if (controller.signal.aborted) return;
    // Progressive render: vitals first (the headline), then everything else.
    renderVitals(container, analysis);
    renderLanguages(container, analysis);
    renderRhythm(container, analysis);
    renderContributors(container, analysis);
    renderFiles(container, analysis);
    renderReadme(container, analysis);
  } catch (e) {
    if (controller.signal.aborted) return;
    if (e instanceof RateLimitError) {
      renderRateLimit(container, slug, e.resetAt, () => scan(input));
    } else if (e instanceof RepoNotFoundError) {
      renderError(container, slug, e.message, () => scan(input));
    } else if (e instanceof DOMException && e.name === 'AbortError') {
      // superseded by a newer scan — stay quiet.
    } else {
      renderError(
        container,
        slug,
        e instanceof Error ? e.message : 'Something went wrong talking to the GitHub API.',
        () => scan(input),
      );
    }
  }
}

function boot(): void {
  document.querySelector('#app')!.appendChild(buildShell(scan));

  // Honor a shared ?repo= link, otherwise auto-load the default repo so
  // first paint is alive immediately.
  const params = new URLSearchParams(location.search);
  const shared = params.get('repo');
  const initial = shared && parseRepoInput(shared) ? shared : repoSlug(DEFAULT_REPO);
  scan(initial);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
