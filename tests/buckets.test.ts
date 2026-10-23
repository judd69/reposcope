import { describe, it, expect } from 'vitest';
import { bucketCommitsByWeek, topChangedFiles } from '../src/buckets';

// Fixed "now": Friday 2026-10-23T12:00:00Z. Weeks start Monday (UTC).
const NOW = Date.parse('2026-10-23T12:00:00Z');

describe('bucketCommitsByWeek', () => {
  it('buckets commits into 12 weekly buckets, newest last', () => {
    const dates = [
      '2026-10-23T10:00:00Z', // current week (Mon Oct 19)
      '2026-10-22T10:00:00Z', // current week
      '2026-10-15T10:00:00Z', // previous week (Mon Oct 12)
      '2026-06-01T10:00:00Z', // older than 12 weeks -> dropped
    ];
    const buckets = bucketCommitsByWeek(dates, 12, NOW);
    expect(buckets).toHaveLength(12);
    expect(buckets[11].count).toBe(2);
    expect(buckets[10].count).toBe(1);
    expect(buckets.slice(0, 10).every((b) => b.count === 0)).toBe(true);
  });

  it('labels the newest bucket with this week\'s Monday', () => {
    const buckets = bucketCommitsByWeek([], 12, NOW);
    expect(buckets[11].weekStart).toBe('2026-10-19');
    expect(buckets[11].label).toBe('Oct 19');
  });

  it('returns zeroed buckets for no commits', () => {
    const buckets = bucketCommitsByWeek([], 12, NOW);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it('ignores invalid dates and future commits', () => {
    const buckets = bucketCommitsByWeek(['garbage', '2027-05-01T00:00:00Z'], 12, NOW);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it('respects a custom week count', () => {
    expect(bucketCommitsByWeek(['2026-10-23T10:00:00Z'], 4, NOW)).toHaveLength(4);
  });
});

describe('topChangedFiles', () => {
  it('aggregates and ranks by change count', () => {
    const lists = [
      ['src/a.ts', 'src/b.ts'],
      ['src/a.ts', 'README.md'],
      ['src/a.ts'],
    ];
    const hot = topChangedFiles(lists, 10);
    expect(hot[0]).toEqual({ path: 'src/a.ts', changes: 3 });
    expect(hot).toHaveLength(3);
  });

  it('limits to the top N and breaks ties by path', () => {
    const lists = [['b.ts'], ['a.ts'], ['c.ts'], ['d.ts']];
    const hot = topChangedFiles(lists, 2);
    expect(hot).toEqual([
      { path: 'a.ts', changes: 1 },
      { path: 'b.ts', changes: 1 },
    ]);
  });

  it('returns empty for no input', () => {
    expect(topChangedFiles([], 10)).toEqual([]);
  });
});
