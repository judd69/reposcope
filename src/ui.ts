import { timeAgo, formatDate, formatCompact, formatInt, formatBytes } from './format';
import { languageColor } from './colors';
import { bucketCommitsByWeek, topChangedFiles } from './buckets';
import { scoreReadme } from './readme-score';
import { donutChart, rhythmBars, rankedBars, scoreRing, countUp } from './charts';
import type { RepoAnalysis, RateLimitInfo } from './api';

export const ACCENT = 'linear-gradient(135deg, #22d3ee, #a3e635)';

/* ---------------- App shell ---------------- */

export function buildShell(onSubmit: (input: string) => void): HTMLElement {
  const app = document.createElement('div');
  app.className = 'app';

  const header = document.createElement('header');
  header.className = 'topbar';
  header.innerHTML = `
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
          <circle cx="11" cy="11" r="7" stroke="url(#g1)" stroke-width="2.4"/>
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#a3e635" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="11" cy="11" r="2.6" fill="#22d3ee"/>
          <defs><linearGradient id="g1" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a3e635"/>
          </linearGradient></defs>
        </svg>
      </span>
      <span class="brand-name">Repo<em>Scope</em></span>
    </div>
    <form class="searchbar" id="search-form" autocomplete="off">
      <input id="repo-input" type="text" spellcheck="false"
        placeholder="Paste a GitHub repo URL or owner/repo — e.g. facebook/react"
        aria-label="GitHub repository URL or owner/repo" />
      <button type="submit" class="scan-btn">X-ray it</button>
    </form>
    <div class="rate-pill" id="rate-pill" hidden></div>
  `;
  header.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = (header.querySelector('#repo-input') as HTMLInputElement).value;
    onSubmit(input);
  });

  const main = document.createElement('main');
  main.className = 'container';
  main.id = 'results';

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <span>RepoScope — live X-rays via the GitHub REST API · no data stored</span>
    <span class="footer-links">
      <a href="https://github.com/judd69/reposcope" target="_blank" rel="noopener">source</a>
      <a href="https://docs.github.com/en/rest" target="_blank" rel="noopener">github api</a>
    </span>
  `;

  app.append(header, main, footer);
  return app;
}

export function setInputValue(v: string): void {
  const el = document.querySelector<HTMLInputElement>('#repo-input');
  if (el) el.value = v;
}

/** Update the tiny rate-limit pill in the header (null hides it). */
export function setRatePill(rate: RateLimitInfo | null): void {
  const pill = document.querySelector<HTMLElement>('#rate-pill');
  if (!pill) return;
  if (!rate) {
    pill.setAttribute('hidden', '');
    return;
  }
  pill.removeAttribute('hidden');
  pill.className = `rate-pill ${rate.remaining < 10 ? 'low' : ''}`;
  pill.textContent = `API ${rate.remaining}/${rate.limit}`;
  pill.title = `GitHub API budget: ${rate.remaining} of ${rate.limit} requests remaining`;
}

/* ---------------- Skeletons ---------------- */

const SKELETON_SECTIONS: Array<{ id: string; title: string; wide?: boolean }> = [
  { id: 'vitals', title: 'Repo vitals' },
  { id: 'languages', title: 'Language breakdown' },
  { id: 'rhythm', title: 'Commit rhythm · last 12 weeks' },
  { id: 'contributors', title: 'Top contributors' },
  { id: 'files', title: 'Hottest files' },
  { id: 'readme', title: 'README quality score', wide: true },
];

export function renderSkeletons(container: HTMLElement, slug: string): void {
  container.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'repo-head shimmer-block';
  head.innerHTML = `<div class="shimmer-line big"></div><div class="shimmer-line"></div>`;
  container.appendChild(head);
  for (const s of SKELETON_SECTIONS) {
    const section = document.createElement('section');
    section.className = `card skeleton ${s.wide ? 'wide' : ''}`;
    section.id = `sec-${s.id}`;
    section.innerHTML = `
      <h2 class="card-title">${s.title}</h2>
      <div class="shimmer-line"></div><div class="shimmer-line"></div><div class="shimmer-line short"></div>`;
    container.appendChild(section);
  }
  container.setAttribute('data-loading', slug);
}

/* ---------------- Error / empty / rate-limit states ---------------- */

export function renderError(container: HTMLElement, slug: string, message: string, onRetry: () => void): void {
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'card error-panel';
  panel.innerHTML = `
    <div class="error-icon">⊘</div>
    <h2>Couldn't X-ray <code>${escapeHtml(slug)}</code></h2>
    <p>${escapeHtml(message)}</p>
    <button class="scan-btn" id="retry-btn">Retry</button>`;
  panel.querySelector('#retry-btn')!.addEventListener('click', onRetry);
  container.appendChild(panel);
}

export function renderRateLimit(container: HTMLElement, slug: string, resetAt: number, onRetry: () => void): void {
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'card error-panel rate-limited';
  panel.innerHTML = `
    <div class="error-icon">⏳</div>
    <h2>GitHub API rate limit hit</h2>
    <p>Unauthenticated requests get 60 per hour. Budget resets in
       <strong id="reset-countdown">…</strong>. Your scan of <code>${escapeHtml(slug)}</code> is paused.</p>
    <button class="scan-btn" id="retry-btn">Retry now</button>`;
  panel.querySelector('#retry-btn')!.addEventListener('click', onRetry);
  container.appendChild(panel);

  const el = panel.querySelector('#reset-countdown')!;
  const tick = () => {
    const secs = Math.max(0, Math.floor(resetAt - Date.now() / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    el.textContent = `${m}:${String(s).padStart(2, '0')}`;
  };
  tick();
  const iv = setInterval(tick, 1000);
  // Stop ticking if the panel is replaced.
  new MutationObserver(() => {
    if (!document.contains(panel)) clearInterval(iv);
  }).observe(document.body, { childList: true, subtree: true });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function emptyState(msg: string): string {
  return `<div class="empty-state"><span class="empty-icon">∅</span><p>${escapeHtml(msg)}</p></div>`;
}

/* ---------------- Section renderers ---------------- */

function sectionCard(container: HTMLElement, id: string, title: string, wide = false): HTMLElement {
  let el = container.querySelector<HTMLElement>(`#sec-${id}`);
  if (!el) {
    el = document.createElement('section');
    el.className = `card ${wide ? 'wide' : ''}`;
    el.id = `sec-${id}`;
    container.appendChild(el);
  } else {
    el.classList.remove('skeleton');
    el.innerHTML = '';
  }
  const h = document.createElement('h2');
  h.className = 'card-title';
  h.textContent = title;
  el.appendChild(h);
  return el;
}

export function renderVitals(container: HTMLElement, a: RepoAnalysis): void {
  const card = sectionCard(container, 'vitals', 'Repo vitals');
  const r = a.repo;
  card.classList.add('wide');

  const head = document.createElement('div');
  head.className = 'repo-head';
  head.innerHTML = `
    <h1 class="repo-name"><a href="${r.html_url}" target="_blank" rel="noopener">${escapeHtml(r.full_name)}</a></h1>
    <p class="repo-desc">${r.description ? escapeHtml(r.description) : '<em>No description</em>'}</p>
    <div class="repo-meta">
      <span>📄 ${escapeHtml(r.license?.name ?? 'No license')}</span>
      <span>🌿 ${escapeHtml(r.default_branch)}</span>
      <span>🎂 created ${formatDate(r.created_at)}</span>
      <span>⚡ pushed ${timeAgo(r.pushed_at)}</span>
      <span>💾 ${formatBytes(r.size * 1024)}</span>
    </div>`;
  container.prepend(head);

  const grid = document.createElement('div');
  grid.className = 'vitals-grid';
  const stats: Array<[string, number, (n: number) => string]> = [
    ['★ Stars', r.stargazers_count, formatCompact],
    ['⑂ Forks', r.forks_count, formatCompact],
    ['◉ Open issues', r.open_issues_count, formatCompact],
    ['👁 Watchers', r.subscribers_count, formatCompact],
  ];
  for (const [label, value, fmt] of stats) {
    const cell = document.createElement('div');
    cell.className = 'vital';
    const num = document.createElement('div');
    num.className = 'vital-num';
    num.textContent = '0';
    const lab = document.createElement('div');
    lab.className = 'vital-label';
    lab.textContent = label;
    cell.append(num, lab);
    grid.appendChild(cell);
    countUp(num, value, fmt);
  }
  card.appendChild(grid);

  const age = document.createElement('p');
  age.className = 'vitals-note';
  age.innerHTML = `Age: <strong>${timeAgo(r.created_at)}</strong> · last push <strong>${timeAgo(r.pushed_at)}</strong>`;
  card.appendChild(age);
}

export function renderLanguages(container: HTMLElement, a: RepoAnalysis): void {
  const card = sectionCard(container, 'languages', 'Language breakdown');
  const entries = Object.entries(a.languages).sort((x, y) => y[1] - x[1]);
  if (entries.length === 0) {
    card.innerHTML += emptyState('GitHub reports no language data for this repo.');
    return;
  }
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const slices = entries.slice(0, 8).map(([name, value]) => ({
    name,
    value,
    color: languageColor(name),
  }));
  // Fold the long tail into "Other".
  if (entries.length > 8) {
    const rest = entries.slice(8).reduce((s, [, v]) => s + v, 0);
    slices.push({ name: 'Other', value: rest, color: '#475569' });
  }

  const body = document.createElement('div');
  body.className = 'lang-body';
  body.appendChild(donutChart(slices));
  const list = document.createElement('div');
  list.className = 'lang-list';
  for (const s of slices) {
    const row = document.createElement('div');
    row.className = 'lang-row';
    row.innerHTML = `
      <span class="lang-dot" style="background:${s.color}"></span>
      <span class="lang-name">${escapeHtml(s.name)}</span>
      <span class="lang-pct">${((s.value / total) * 100).toFixed(1)}%</span>
      <span class="lang-bytes">${formatBytes(s.value)}</span>`;
    list.appendChild(row);
  }
  body.appendChild(list);
  card.appendChild(body);
}

export function renderRhythm(container: HTMLElement, a: RepoAnalysis): void {
  const card = sectionCard(container, 'rhythm', 'Commit rhythm · last 12 weeks');
  const dates = a.commits
    .map((c) => c.commit.author?.date)
    .filter((d): d is string => !!d);
  const buckets = bucketCommitsByWeek(dates, 12);
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const note = document.createElement('p');
  note.className = 'rhythm-total';
  note.innerHTML = `<strong>${formatInt(total)}</strong> commits in the last 12 weeks <span class="dim">(from the 100 most recent)</span>`;
  card.appendChild(note);
  if (total === 0) {
    card.innerHTML += emptyState('No commits in the last 12 weeks — quiet repo.');
    return;
  }
  card.appendChild(rhythmBars(buckets, ACCENT));
}

export function renderContributors(container: HTMLElement, a: RepoAnalysis): void {
  const card = sectionCard(container, 'contributors', 'Top contributors');
  if (a.contributors.length === 0) {
    card.innerHTML += emptyState('No contributor data available.');
    return;
  }
  const list = document.createElement('div');
  list.className = 'contrib-list';
  for (const c of a.contributors.slice(0, 12)) {
    const row = document.createElement('a');
    row.className = 'contrib';
    row.href = c.html_url;
    row.target = '_blank';
    row.rel = 'noopener';
    row.innerHTML = `
      <img class="contrib-avatar" src="${c.avatar_url}&s=96" alt="${escapeHtml(c.login)}'s avatar" loading="lazy" />
      <div class="contrib-info">
        <span class="contrib-login">${escapeHtml(c.login)}</span>
        <div class="contrib-track"><div class="contrib-fill" style="--w:${Math.max((c.contributions / Math.max(a.contributors[0].contributions, 1)) * 100, 2)}%"></div></div>
      </div>
      <span class="contrib-count">${formatCompact(c.contributions)}</span>`;
    list.appendChild(row);
  }
  card.appendChild(list);
}

export function renderFiles(container: HTMLElement, a: RepoAnalysis): void {
  const card = sectionCard(container, 'files', 'Hottest files');
  const hot = topChangedFiles(a.recentFiles, 10);
  if (hot.length === 0) {
    card.innerHTML += emptyState('No file-change data in the recent commits sampled.');
    return;
  }
  card.appendChild(
    rankedBars(
      hot.map((h) => ({ label: h.path, value: h.changes, color: '#22d3ee' })),
      (v) => `${v}×`,
      ACCENT,
    ),
  );
  if (a.hottestTruncated) {
    const note = document.createElement('p');
    note.className = 'dim-note';
    note.textContent = 'Stopped early: API rate budget ran low while sampling commits.';
    card.appendChild(note);
  }
}

export function renderReadme(container: HTMLElement, a: RepoAnalysis): void {
  const card = sectionCard(container, 'readme', 'README quality score', true);
  if (!a.readme) {
    card.innerHTML += emptyState('This repo has no README — automatic 0. Add one!');
    return;
  }
  const score = scoreReadme(a.readme);
  const verdict =
    score.total >= 80 ? 'Excellent' : score.total >= 60 ? 'Solid' : score.total >= 40 ? 'Needs work' : 'Bare bones';

  const body = document.createElement('div');
  body.className = 'readme-body';
  const ringWrap = document.createElement('div');
  ringWrap.className = 'readme-ring';
  ringWrap.appendChild(scoreRing(score.total));
  const v = document.createElement('div');
  v.className = 'readme-verdict';
  v.textContent = verdict;
  ringWrap.appendChild(v);

  const table = document.createElement('div');
  table.className = 'factor-table';
  for (const f of score.factors) {
    const row = document.createElement('div');
    row.className = 'factor-row';
    row.innerHTML = `
      <span class="factor-name">${escapeHtml(f.name)}</span>
      <div class="factor-track"><div class="factor-fill" style="--w:${(f.earned / f.max) * 100}%"></div></div>
      <span class="factor-score">${f.earned}/${f.max}</span>
      <span class="factor-detail">${escapeHtml(f.detail)}</span>`;
    table.appendChild(row);
  }
  body.append(ringWrap, table);
  card.appendChild(body);
}
