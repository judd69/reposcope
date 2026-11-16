# Contributing to RepoScope

Thanks for wanting to improve RepoScope — the tool that X-rays any public
GitHub repo live, right in the browser. This guide covers the setup,
workflow, and conventions that keep contributions landing cleanly.

## Quick start

**Prerequisites:** Node.js 20.19+ or 22.12+ (required by Vite 7) and npm.

```bash
git clone https://github.com/judd69/reposcope.git
cd reposcope
npm install
npm run dev      # dev server with hot reload
npm test         # vitest suite — run before every PR
npm run build    # typecheck (tsc) + production build into docs/
```

## How the project is laid out

- `src/` — TypeScript source, zero runtime dependencies:
  - `api.ts` — GitHub REST API calls (`/repos/{owner}/{repo}`, languages,
    commits, contributors, README)
  - `parse.ts` — parsing repo URLs and `owner/repo` input
  - `buckets.ts` — commit rhythm: weekly buckets over the last 12 weeks
  - `charts.ts` / `colors.ts` — hand-rolled animated SVG charts, linguist colors
  - `readme-score.ts` — the 0–100 README quality score (headings, length,
    code blocks, badges, images, links, structure)
  - `format.ts` / `ui.ts` / `main.ts` / `styles.css` — formatting, DOM
    rendering, entry point, styling
- `tests/` — Vitest tests, one file per `src` module
  (`api.test.ts`, `buckets.test.ts`, `format.test.ts`, `parse.test.ts`,
  `readme-score.test.ts`, `ui.test.ts`)
- `index.html` — dev entry point; `docs/` is the production build output

## Rules that matter

- **Never hand-edit `docs/`.** It is the production build output served by
  GitHub Pages. `npm run build` regenerates it (`vite.config.ts` sets
  `outDir: 'docs'` with `emptyOutDir: true`), so any manual edit there is
  wiped on the next build. Change `src/` or `index.html` instead.
- **Keep the zero-runtime-dependency rule.** RepoScope ships no runtime
  dependencies — charts are hand-rolled SVG, the DOM is vanilla. New
  features should stay that way; dev dependencies are fine if justified.
- **TypeScript is strict.** `tsconfig.json` enables `strict`,
  `noUnusedLocals`, and `noUnusedParameters` — `npm run build` typechecks,
  so unused imports and parameters will fail the build.
- **Respect the API budget.** RepoScope uses the **unauthenticated** GitHub
  REST API: 60 requests/hour per IP. A full scan uses ~25 requests (repo,
  languages, commits, contributors, README, plus up to 20 commit-detail
  fetches for hottest files, with a concurrency cap of 4). New features
  should not add requests per scan without a good reason — cache where you
  can, and keep the header pill's remaining-budget display accurate.

## Making a change

1. Fork the repo and create a branch from `main`
   (`git checkout -b fix/short-description`).
2. Keep the change focused — one fix or feature per pull request.
3. Add or update tests in `tests/` for any behaviour change. New scoring
   factors in `readme-score.ts` need a test in `readme-score.test.ts`;
   new parsing rules need one in `parse.test.ts`.
4. Run `npm test` and `npm run build` — both must pass before you open the PR.
5. In the PR description, say **what** changed and **why**, and note any
   change in API requests per scan or in the README score behaviour.

## Reporting issues

Open an issue with the repo you were scanning (`owner/repo` or the full
URL), what you expected to see, and what you saw instead. Screenshots of
the scan page help. If the header pill showed your API budget hitting zero,
mention the reset countdown it displayed.

## License

By contributing, you agree your contributions are licensed under the same
MIT License as the project — Copyright (c) 2026 Jude Davies, see
[LICENSE](LICENSE).
