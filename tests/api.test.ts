import { describe, it, expect } from 'vitest';
import { parseRateLimit, isRateLimitResponse } from '../src/api';
import { languageColor } from '../src/colors';

function headers(pairs: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(pairs)) h.set(k, v);
  return h;
}

describe('parseRateLimit', () => {
  it('parses all three headers', () => {
    const rate = parseRateLimit(
      headers({
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '42',
        'x-ratelimit-reset': '1761300000',
      }),
    );
    expect(rate).toEqual({ limit: 60, remaining: 42, reset: 1761300000 });
  });

  it('returns null when headers are missing', () => {
    expect(parseRateLimit(headers({}))).toBeNull();
  });

  it('returns null on non-numeric values', () => {
    expect(
      parseRateLimit(
        headers({
          'x-ratelimit-limit': 'many',
          'x-ratelimit-remaining': '42',
          'x-ratelimit-reset': '1761300000',
        }),
      ),
    ).toBeNull();
  });
});

describe('isRateLimitResponse', () => {
  it('flags 403/429 with zero remaining', () => {
    const h = headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '1761300000',
    });
    expect(isRateLimitResponse(403, h)).toBe(true);
    expect(isRateLimitResponse(429, h)).toBe(true);
  });

  it('does not flag 403 with remaining budget (e.g. a real permission error)', () => {
    const h = headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '59',
      'x-ratelimit-reset': '1761300000',
    });
    expect(isRateLimitResponse(403, h)).toBe(false);
  });

  it('does not flag 200s', () => {
    const h = headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '59',
      'x-ratelimit-reset': '1761300000',
    });
    expect(isRateLimitResponse(200, h)).toBe(false);
  });
});

describe('languageColor', () => {
  it('returns linguist colors for known languages', () => {
    expect(languageColor('TypeScript')).toBe('#3178c6');
    expect(languageColor('Python')).toBe('#3572A5');
  });

  it('returns a stable fallback hue for unknown languages', () => {
    const a = languageColor('Brainfuck');
    const b = languageColor('Brainfuck');
    expect(a).toBe(b);
    expect(a).toMatch(/^hsl\(\d+, 72%, 58%\)$/);
  });
});
