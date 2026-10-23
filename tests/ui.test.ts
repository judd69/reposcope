// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';

// jsdom lacks requestAnimationFrame — install a permanent stub on the global
// (module scope, not vi.stubGlobal, so animation chains survive test teardown
// without throwing once vitest restores stubbed globals).
const frameTimers = new Map<number, ReturnType<typeof setTimeout>>();
{
  let id = 0;
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => {
    id++;
    frameTimers.set(id, setTimeout(() => cb(performance.now()), 0));
    return id;
  };
  (globalThis as Record<string, unknown>).cancelAnimationFrame = (handle: number) => {
    const t = frameTimers.get(handle);
    if (t) clearTimeout(t);
    frameTimers.delete(handle);
  };
}

// Kill any pending animation frames after each test so chains from
// countUp/scoreRing don't outlive the jsdom environment.
afterEach(() => {
  for (const t of frameTimers.values()) clearTimeout(t);
  frameTimers.clear();
});

import { donutChart, rhythmBars, rankedBars, scoreRing, countUp } from '../src/charts';
import {
  buildShell,
  renderSkeletons,
  renderError,
  renderRateLimit,
  renderVitals,
  renderLanguages,
  renderRhythm,
  renderContributors,
  renderFiles,
  renderReadme,
} from '../src/ui';
import type { RepoAnalysis } from '../src/api';

function fakeAnalysis(): RepoAnalysis {
  return {
    repo: {
      full_name: 'facebook/react',
      html_url: 'https://github.com/facebook/react',
      description: 'The library for web and native user interfaces.',
      stargazers_count: 238000,
      forks_count: 49000,
      open_issues_count: 1200,
      subscribers_count: 6700,
      created_at: '2013-05-24T16:15:54Z',
      pushed_at: '2026-10-23T08:00:00Z',
      license: { name: 'MIT License', spdx_id: 'MIT' },
      language: 'JavaScript',
      default_branch: 'main',
      size: 180000,
    },
    languages: { JavaScript: 8_000_000, TypeScript: 2_000_000, HTML: 500_000 },
    commits: [
      { sha: 'a', commit: { author: { name: 'x', date: '2026-10-23T10:00:00Z' }, message: 'fix' } },
      { sha: 'b', commit: { author: { name: 'y', date: '2026-10-15T10:00:00Z' }, message: 'feat' } },
    ],
    contributors: [
      { login: 'gaearon', avatar_url: 'https://avatars.example/1', html_url: 'https://github.com/gaearon', contributions: 1500, type: 'User' },
      { login: 'acdlite', avatar_url: 'https://avatars.example/2', html_url: 'https://github.com/acdlite', contributions: 1200, type: 'User' },
    ],
    recentFiles: [['packages/react/src/a.js'], ['packages/react/src/a.js'], ['packages/react/src/b.js']],
    readme: '# React\n\nA JavaScript library.\n\n## Install\n\n```bash\nnpm i react\n```\n',
    hottestTruncated: false,
  };
}

describe('charts', () => {
  it('donutChart renders one segment per slice plus center labels', () => {
    const svg = donutChart([
      { name: 'JS', value: 80, color: '#f1e05a' },
      { name: 'TS', value: 20, color: '#3178c6' },
    ]);
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.querySelectorAll('.donut-seg')).toHaveLength(2);
    expect(svg.querySelector('.donut-total')?.textContent).toContain('B');
  });

  it('rhythmBars renders 12 columns', () => {
    const el = rhythmBars(
      Array.from({ length: 12 }, (_, i) => ({ label: `W${i}`, count: i })),
      'red',
    );
    expect(el.querySelectorAll('.rhythm-col')).toHaveLength(12);
  });

  it('rankedBars renders rows with labels and values', () => {
    const el = rankedBars(
      [{ label: 'a.ts', value: 5 }, { label: 'b.ts', value: 2 }],
      (v) => `${v}×`,
      'red',
    );
    const rows = el.querySelectorAll('.hbar-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('a.ts');
    expect(rows[0].textContent).toContain('5×');
  });

  it('scoreRing renders an arc and starts counting', () => {
    const svg = scoreRing(85);
    expect(svg.querySelector('.score-arc')).toBeTruthy();
    expect(svg.querySelector('.score-num')).toBeTruthy();
  });

  it('countUp resolves to the formatted target', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    countUp(el, 1250, (n) => String(Math.round(n)));
    await new Promise((r) => setTimeout(r, 50));
    expect(Number(el.textContent)).toBeGreaterThan(0); // animating
    await new Promise((r) => setTimeout(r, 1400));
    expect(el.textContent).toBe('1250'); // landed
    el.remove();
  });
});

describe('ui shell', () => {
  it('buildShell wires the form submit to onSubmit', () => {
    const seen: string[] = [];
    const app = buildShell((v) => seen.push(v));
    document.body.appendChild(app);
    const input = app.querySelector<HTMLInputElement>('#repo-input')!;
    input.value = 'facebook/react';
    app.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(seen).toEqual(['facebook/react']);
    app.remove();
  });

  it('renderSkeletons creates all six section placeholders', () => {
    const c = document.createElement('div');
    renderSkeletons(c, 'facebook/react');
    expect(c.querySelectorAll('.card.skeleton')).toHaveLength(6);
  });

  it('renderError shows the slug and a working retry button', () => {
    const c = document.createElement('div');
    let retried = 0;
    renderError(c, 'foo/bar', 'not found', () => retried++);
    expect(c.textContent).toContain('foo/bar');
    c.querySelector<HTMLButtonElement>('#retry-btn')!.click();
    expect(retried).toBe(1);
  });

  it('renderRateLimit shows a countdown and retry', () => {
    const c = document.createElement('div');
    let retried = 0;
    renderRateLimit(c, 'foo/bar', Math.floor(Date.now() / 1000) + 90, () => retried++);
    expect(c.querySelector('#reset-countdown')).toBeTruthy();
    c.querySelector<HTMLButtonElement>('#retry-btn')!.click();
    expect(retried).toBe(1);
  });
});

describe('section renderers', () => {
  it('renderVitals shows repo name and four animated vitals', () => {
    const c = document.createElement('div');
    renderVitals(c, fakeAnalysis());
    expect(c.textContent).toContain('facebook/react');
    expect(c.querySelectorAll('.vital')).toHaveLength(4);
  });

  it('renderLanguages shows a donut and the language list', () => {
    const c = document.createElement('div');
    renderLanguages(c, fakeAnalysis());
    expect(c.querySelector('svg.donut')).toBeTruthy();
    expect(c.textContent).toContain('JavaScript');
  });

  it('renderLanguages shows an empty state for no language data', () => {
    const c = document.createElement('div');
    const a = fakeAnalysis();
    a.languages = {};
    renderLanguages(c, a);
    expect(c.querySelector('.empty-state')).toBeTruthy();
  });

  it('renderRhythm shows the heartbeat chart', () => {
    const c = document.createElement('div');
    renderRhythm(c, fakeAnalysis());
    expect(c.querySelector('.rhythm')).toBeTruthy();
  });

  it('renderContributors shows avatar cards with links', () => {
    const c = document.createElement('div');
    renderContributors(c, fakeAnalysis());
    const cards = c.querySelectorAll('.contrib');
    expect(cards).toHaveLength(2);
    expect((cards[0] as HTMLAnchorElement).href).toContain('gaearon');
  });

  it('renderFiles ranks the hottest files', () => {
    const c = document.createElement('div');
    renderFiles(c, fakeAnalysis());
    expect(c.textContent).toContain('packages/react/src/a.js');
  });

  it('renderReadme shows the score ring and factor table', () => {
    const c = document.createElement('div');
    renderReadme(c, fakeAnalysis());
    expect(c.querySelector('svg.score-ring')).toBeTruthy();
    expect(c.querySelectorAll('.factor-row').length).toBeGreaterThan(0);
  });

  it('renderReadme shows an empty state without a README', () => {
    const c = document.createElement('div');
    const a = fakeAnalysis();
    a.readme = null;
    renderReadme(c, a);
    expect(c.querySelector('.empty-state')).toBeTruthy();
  });
});
