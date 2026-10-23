export interface ReadmeFactor {
  id: string;
  name: string;
  earned: number;
  max: number;
  detail: string;
}

export interface ReadmeScore {
  total: number;
  factors: ReadmeFactor[];
  wordCount: number;
}

function countMatches(md: string, re: RegExp): number {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const g = new RegExp(re.source, flags);
  let n = 0;
  while (g.exec(md) !== null) n++;
  return n;
}

/**
 * Score a README's quality 0–100 across seven factors. Weights:
 * headings 20 · length 20 · code blocks 15 · badges 15 · images 10 ·
 * links 10 · structure bonus (TOC + license mention) 10.
 */
export function scoreReadme(md: string): ReadmeScore {
  const factors: ReadmeFactor[] = [];

  // --- Headings (20): # / ## / ... lines, at most one leading level jump allowed.
  const headings = md.split('\n').filter((l) => /^#{1,6}\s+\S/.test(l.trim())).length;
  const headingsPts = headings >= 6 ? 20 : headings >= 3 ? 16 : headings >= 1 ? 10 : 0;
  factors.push({
    id: 'headings',
    name: 'Section headings',
    earned: headingsPts,
    max: 20,
    detail:
      headings === 0
        ? 'No markdown headings — readers can’t scan the doc'
        : `${headings} heading${headings === 1 ? '' : 's'} structure the doc`,
  });

  // --- Length (20): word count.
  const words = (md.match(/[A-Za-z0-9_'-]+/g) ?? []).length;
  const lengthPts =
    words >= 800 ? 20 : words >= 400 ? 15 : words >= 150 ? 10 : words >= 50 ? 5 : 0;
  factors.push({
    id: 'length',
    name: 'Length & depth',
    earned: lengthPts,
    max: 20,
    detail:
      words === 0
        ? 'README is empty'
        : `${words.toLocaleString('en-US')} words — ${
            words >= 800 ? 'comprehensive' : words >= 400 ? 'solid' : words >= 150 ? 'decent' : 'thin'
          }`,
  });

  // --- Code blocks (15): fenced ``` pairs.
  const fences = countMatches(md, /```/g);
  const blocks = Math.floor(fences / 2);
  const blocksPts = blocks >= 3 ? 15 : blocks === 2 ? 11 : blocks === 1 ? 7 : 0;
  factors.push({
    id: 'code',
    name: 'Code examples',
    earned: blocksPts,
    max: 15,
    detail:
      blocks === 0
        ? 'No fenced code blocks — show, don’t just tell'
        : `${blocks} fenced code block${blocks === 1 ? '' : 's'}`,
  });

  // --- Badges (15): shields.io / badge-like svg images.
  const badgeRe =
    /!\[[^\]]*\]\((?:[^)]*shields\.io[^)]*|[^)]*\.svg[^)]*)\)|<img[^>]*(?:shields\.io|badge)[^>]*>/gi;
  const badges = countMatches(md, badgeRe);
  const badgePts = badges >= 3 ? 15 : badges === 2 ? 11 : badges === 1 ? 7 : 0;
  factors.push({
    id: 'badges',
    name: 'Badges',
    earned: badgePts,
    max: 15,
    detail:
      badges === 0
        ? 'No status badges (CI, version, coverage… )'
        : `${badges} badge${badges === 1 ? '' : 's'} at a glance`,
  });

  // --- Images (10): markdown images / <img> excluding badges.
  const mdWithoutBadges = md.replace(new RegExp(badgeRe.source, 'gi'), '');
  const images =
    countMatches(mdWithoutBadges, /!\[[^\]]*\]\([^)]+\)/g) +
    countMatches(mdWithoutBadges, /<img[^>]*>/gi);
  const imagePts = images >= 3 ? 10 : images === 2 ? 8 : images === 1 ? 5 : 0;
  factors.push({
    id: 'images',
    name: 'Images & screenshots',
    earned: imagePts,
    max: 10,
    detail:
      images === 0
        ? 'No screenshots or diagrams'
        : `${images} image${images === 1 ? '' : 's'} show the project off`,
  });

  // --- Links (10): markdown links and <a href>.
  const links =
    countMatches(md, /\[[^\]]+\]\([^)]+\)/g) + countMatches(md, /<a\s[^>]*href=/gi);
  const linkPts = links >= 6 ? 10 : links >= 3 ? 7 : links >= 1 ? 4 : 0;
  factors.push({
    id: 'links',
    name: 'Links & references',
    earned: linkPts,
    max: 10,
    detail:
      links === 0
        ? 'No links to docs, demos or related work'
        : `${links} link${links === 1 ? '' : 's'} to docs / demos / sources`,
  });

  // --- Structure bonus (10): table of contents (5) + license section mention (5).
  const hasTocHeading = /^#{1,3}\s*(?:table of |)contents?\b/im.test(md);
  const anchorLinks = countMatches(md, /\[[^\]]+\]\(#[^)]+\)/g);
  const toc = hasTocHeading || anchorLinks >= 3;
  const license = /licen[sc]e/i.test(md);
  const structurePts = (toc ? 5 : 0) + (license ? 5 : 0);
  factors.push({
    id: 'structure',
    name: 'Structure bonus',
    earned: structurePts,
    max: 10,
    detail: [
      toc ? 'has a table of contents' : 'no table of contents',
      license ? 'mentions licensing' : 'no license mention',
    ].join(' · '),
  });

  const total = factors.reduce((s, f) => s + f.earned, 0);
  return { total: Math.min(100, total), factors, wordCount: words };
}
