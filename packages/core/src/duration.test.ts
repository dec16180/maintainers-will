import { describe, expect, it } from 'vitest';
import { parseDuration, parsePercentage } from './duration.js';

describe('parseDuration', () => {
  it('parses days, weeks and months into milliseconds', () => {
    expect(parseDuration('1d')).toBe(86_400_000);
    expect(parseDuration('2w')).toBe(2 * 7 * 86_400_000);
    expect(parseDuration('1m')).toBe(30 * 86_400_000);
  });

  it('throws on an unknown suffix', () => {
    expect(() => parseDuration('1y')).toThrow();
  });
});

describe('parsePercentage', () => {
  it('parses a percentage into a fraction', () => {
    expect(parsePercentage('50%')).toBe(0.5);
    expect(parsePercentage('100%')).toBe(1);
  });
});
