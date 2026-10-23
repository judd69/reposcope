/** 1250 -> "1.3k", 2_300_000 -> "2.3M", 950 -> "950". */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));
  const units: Array<[number, string]> = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'k'],
  ];
  for (let i = 0; i < units.length; i++) {
    const [div, suffix] = units[i];
    if (abs >= div) {
      const v = n / div;
      let rounded = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
      // Roll over to the next unit at boundaries: 999.5k -> 1M.
      if (rounded >= 1000 && i > 0) {
        const [nextDiv, nextSuffix] = units[i - 1];
        const nv = n / nextDiv;
        rounded = nv >= 100 ? Math.round(nv) : Math.round(nv * 10) / 10;
        return `${rounded}${nextSuffix}`;
      }
      return `${rounded}${suffix}`;
    }
  }
  return String(Math.round(n));
}

/** 1234567 -> "1,234,567". */
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 1536 -> "1.5 KB", 2_500_000 -> "2.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10} ${units[u]}`;
}

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** "2026-10-23T…" -> "just now" / "5 minutes ago" / "3 days ago" / "2 months ago". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  let diff = now - t;
  if (diff < 0) diff = 0;
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY);
    return `${d} day${d === 1 ? '' : 's'} ago`;
  }
  if (diff < MONTH) {
    const w = Math.floor(diff / WEEK);
    return `${w} week${w === 1 ? '' : 's'} ago`;
  }
  if (diff < YEAR) {
    const mo = Math.floor(diff / MONTH);
    return `${mo} month${mo === 1 ? '' : 's'} ago`;
  }
  const y = Math.floor(diff / YEAR);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

/** "2026-10-23T…" -> "Oct 23, 2026". */
export function formatDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
