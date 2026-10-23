import { describe, it, expect } from 'vitest';
import { formatCompact, formatInt, formatBytes, timeAgo, formatDate } from '../src/format';

describe('formatCompact', () => {
  it('passes through small numbers', () => {
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(950)).toBe('950');
  });
  it('compacts thousands', () => {
    expect(formatCompact(1250)).toBe('1.3k');
    expect(formatCompact(12000)).toBe('12k');
    expect(formatCompact(999499)).toBe('999k');
    expect(formatCompact(999500)).toBe('1M');
  });
  it('compacts millions and billions', () => {
    expect(formatCompact(2_300_000)).toBe('2.3M');
    expect(formatCompact(1_500_000_000)).toBe('1.5B');
  });
});

describe('formatInt', () => {
  it('adds locale commas', () => {
    expect(formatInt(1234567)).toBe('1,234,567');
  });
});

describe('formatBytes', () => {
  it('formats B / KB / MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2_500_000)).toBe('2.4 MB');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  it('handles just now and minutes', () => {
    expect(timeAgo('2026-10-23T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-10-23T11:55:00Z', now)).toBe('5 minutes ago');
    expect(timeAgo('2026-10-23T11:59:00Z', now)).toBe('1 minute ago');
  });
  it('handles hours, days, weeks', () => {
    expect(timeAgo('2026-10-23T09:00:00Z', now)).toBe('3 hours ago');
    expect(timeAgo('2026-10-20T12:00:00Z', now)).toBe('3 days ago');
    expect(timeAgo('2026-10-02T12:00:00Z', now)).toBe('3 weeks ago');
  });
  it('handles months and years', () => {
    expect(timeAgo('2026-08-23T12:00:00Z', now)).toBe('2 months ago');
    expect(timeAgo('2024-10-23T12:00:00Z', now)).toBe('2 years ago');
  });
  it('handles bad input', () => {
    expect(timeAgo('not-a-date', now)).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2026-10-23T12:00:00Z')).toBe('Oct 23, 2026');
  });
  it('handles bad input', () => {
    expect(formatDate('xyz')).toBe('—');
  });
});
