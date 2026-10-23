import { describe, it, expect } from 'vitest';
import { scoreReadme } from '../src/readme-score';

const GOOD_README = `# RepoScope

[![CI](https://img.shields.io/github/actions/workflow/status/judd69/reposcope/ci.yml?branch=main)]
[![npm](https://img.shields.io/npm/v/reposcope.svg)]
[![Coverage](https://img.shields.io/codecov/c/github/judd69/reposcope.svg)]

Paste any public GitHub repo URL and get a live X-ray: vitals, languages, commit rhythm,
contributors, hottest files, and a README quality score — all from the live GitHub REST API.

## Table of Contents

- [Features](#features)
- [Quick start](#quick-start)
- [How the score works](#how-the-score-works)
- [License](#license)

## Features

Detailed feature list goes here, with many words describing everything the app does for
the user, how it fetches data live from the API, and why that matters for a real product.

## Quick start

\`\`\`bash
npm install
npm run dev
\`\`\`

\`\`\`ts
import { scan } from './src/main';
scan('facebook/react');
\`\`\`

\`\`\`bash
npm run build
\`\`\`

## How the score works

![demo screenshot](docs/demo.png)
![architecture diagram](docs/arch.png)

See the [live demo](https://judd69.github.io/reposcope/) and the
[GitHub REST docs](https://docs.github.com/en/rest) for more.

## License

MIT — see [LICENSE](LICENSE) for details.
`;

const BAD_README = `my cool project

does stuff. try it.`;

describe('scoreReadme', () => {
  it('scores a strong README highly with all factors near-max', () => {
    const s = scoreReadme(GOOD_README);
    expect(s.total).toBeGreaterThanOrEqual(80);
    const byId = Object.fromEntries(s.factors.map((f) => [f.id, f]));
    expect(byId.headings.earned).toBe(20);
    expect(byId.badges.earned).toBe(15);
    expect(byId.code.earned).toBe(15);
    expect(byId.structure.earned).toBe(10); // TOC + license
  });

  it('scores a thin README near zero', () => {
    const s = scoreReadme(BAD_README);
    expect(s.total).toBeLessThanOrEqual(15);
    expect(s.factors.find((f) => f.id === 'headings')!.earned).toBe(0);
    expect(s.factors.find((f) => f.id === 'code')!.earned).toBe(0);
    expect(s.factors.find((f) => f.id === 'badges')!.earned).toBe(0);
    expect(s.factors.find((f) => f.id === 'images')!.earned).toBe(0);
  });

  it('handles an empty README', () => {
    const s = scoreReadme('');
    expect(s.total).toBe(0);
    expect(s.wordCount).toBe(0);
  });

  it('does not double-count badges as images', () => {
    const md = '# T\n\n![build](https://img.shields.io/badge/build-passing-brightgreen)\n';
    const s = scoreReadme(md);
    expect(s.factors.find((f) => f.id === 'badges')!.earned).toBeGreaterThan(0);
    expect(s.factors.find((f) => f.id === 'images')!.earned).toBe(0);
  });

  it('detects a TOC from anchor links without a contents heading', () => {
    const md = `# T\n\n- [A](#a)\n- [B](#b)\n- [C](#c)\n\n## A\n## B\n## C\n`;
    const s = scoreReadme(md);
    expect(s.factors.find((f) => f.id === 'structure')!.earned).toBe(5); // TOC only, no license
  });

  it('detects license mentions in any case', () => {
    const md = `# T\n\nReleased under the MIT LICENCE. See file.\n`;
    const s = scoreReadme(md);
    expect(s.factors.find((f) => f.id === 'structure')!.earned).toBe(5);
  });

  it('total never exceeds 100 and factors sum to the total', () => {
    const s = scoreReadme(GOOD_README);
    expect(s.total).toBeLessThanOrEqual(100);
    expect(s.total).toBe(s.factors.reduce((n, f) => n + f.earned, 0));
  });

  it('scales length points with word count', () => {
    const words = (n: number) => `# T\n\n${'word '.repeat(n)}`;
    expect(scoreReadme(words(10)).factors.find((f) => f.id === 'length')!.earned).toBe(0);
    expect(scoreReadme(words(100)).factors.find((f) => f.id === 'length')!.earned).toBe(5);
    expect(scoreReadme(words(900)).factors.find((f) => f.id === 'length')!.earned).toBe(20);
  });
});
