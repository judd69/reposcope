# RepoScope 🔬

**X-ray any public GitHub repo — live.** Paste a repo URL (or `owner/repo`) and RepoScope
fetches it *right now* through the GitHub REST API and renders a full X-ray: vitals,
language breakdown, commit rhythm, top contributors, hottest files, and a README quality
score — all animated, all from real data.

Live demo: **https://judd69.github.io/reposcope/**

## What it shows

| Section | Source | Visual |
|---|---|---|
| Repo vitals | `GET /repos/{o}/{r}` | Stars, forks, open issues, watchers (count-up), age, last push, license, description |
| Language breakdown | `GET /repos/{o}/{r}/languages` | Animated donut + ranked bars with linguist colors |
| Commit rhythm | `GET /repos/{o}/{r}/commits?per_page=100` | Weekly buckets over the last 12 weeks, animated bar chart |
| Top contributors | `GET /repos/{o}/{r}/contributors` | Avatar cards with rank bars |
| Hottest files | Details of the ~20 most recent commits | Top-10 most-changed files, animated bars |
| README quality score | `GET /repos/{o}/{r}/readme` (raw) | 0–100 animated ring + per-factor breakdown |

The page pre-loads `facebook/react` on first paint so it's alive immediately, and any scan
is shareable via `?repo=owner/repo`.

## README quality score

Computed entirely in the browser from the raw README markdown:

| Factor | Max | What earns it |
|---|---|---|
| Section headings | 20 | Markdown `#`/`##` headings (6+ → full marks) |
| Length & depth | 20 | Word count (800+ → full marks) |
| Code examples | 15 | Fenced ` ``` ` code blocks (3+ → full marks) |
| Badges | 15 | shields.io / badge SVGs (3+ → full marks) |
| Images & screenshots | 10 | Images excluding badges (3+ → full marks) |
| Links & references | 10 | Markdown / HTML links (6+ → full marks) |
| Structure bonus | 10 | Table of contents (5) + license mention (5) |

## Run locally

```bash
npm install
npm run dev      # dev server with hot reload
npm test         # vitest suite
npm run build    # typecheck + production build into docs/
```

## Rate limits

RepoScope uses the **unauthenticated** GitHub REST API (60 requests/hour per IP, CORS
works fine from the browser). A full scan uses ~25 requests (repo, languages, commits,
contributors, README + up to 20 commit-detail fetches for hottest files, fetched with a
concurrency cap of 4). The header pill shows your remaining budget live; when it hits
zero you get a notice with the exact reset countdown and a retry button instead of a
broken page.

## Tech

TypeScript + Vite + vanilla TS/DOM. All charts are hand-rolled animated SVG — zero
runtime dependencies. Tests with Vitest.

## License

MIT — see [LICENSE](LICENSE).
