export interface WeekBucket {
  /** ISO date (YYYY-MM-DD) of the Monday that starts the bucket. */
  weekStart: string;
  /** Short label, e.g. "Aug 3". */
  label: string;
  count: number;
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** Monday 00:00 UTC of the week containing `t`. */
function weekFloor(t: number): number {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

function shortLabel(t: number): string {
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function isoDay(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Bucket commits into `weeks` weekly buckets covering the last ~`weeks`
 * weeks. Buckets run oldest → newest; the newest bucket is the current week
 * (may be partial). Commits older than the window or in the future beyond
 * the current week are ignored.
 */
export function bucketCommitsByWeek(
  commitDates: string[],
  weeks = 12,
  now: number = Date.now(),
): WeekBucket[] {
  const currentWeek = weekFloor(now);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = currentWeek - i * WEEK_MS;
    buckets.push({ weekStart: isoDay(start), label: shortLabel(start), count: 0 });
  }

  for (const iso of commitDates) {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) continue;
    const w = weekFloor(t);
    const idx = weeks - 1 - Math.round((currentWeek - w) / WEEK_MS);
    if (idx >= 0 && idx < weeks) buckets[idx].count++;
  }
  return buckets;
}

export interface HotFile {
  path: string;
  changes: number;
}

/**
 * Aggregate file paths from commit file lists into the top `limit`
 * most-changed files, sorted by change count desc (path asc on ties).
 */
export function topChangedFiles(fileLists: string[][], limit = 10): HotFile[] {
  const counts = new Map<string, number>();
  for (const list of fileLists) {
    for (const f of list) {
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([path, changes]) => ({ path, changes }))
    .sort((a, b) => b.changes - a.changes || a.path.localeCompare(b.path))
    .slice(0, limit);
}
