import { describe, expect, it } from 'vitest';
import { ZERO_LEVELS } from '../engine/metrics';
import type { Levels } from '../engine/types';
import { muralCounts, muralShapes } from './Mural';

const FULL: Levels = { thumb: 1, headline: 1, forwards: 1, potato: 1, laugh: 1, seen: 1 };
const count = (l: Levels, m: string, prefix = m) => muralShapes(l).filter((s) => s.metric === m && s.key.startsWith(prefix) && /\d$/.test(s.key)).length;

describe('garden mural', () => {
  it('follows the count rules at level 0', () => {
    expect(muralCounts(ZERO_LEVELS)).toEqual({ thumb: 2, headline: 0, forwards: 0, potato: 0, laugh: 0, seen: 1 });
  });
  it('follows the count rules at level 1', () => {
    expect(muralCounts(FULL)).toEqual({ thumb: 16, headline: 8, forwards: 18, potato: 6, laugh: 6, seen: 11 });
  });
  it('draws as many shapes as the counts say', () => {
    const l: Levels = { thumb: 0.5, headline: 0.25, forwards: 0.5, potato: 0.5, laugh: 0.5, seen: 0.3 };
    const n = muralCounts(l);
    expect(count(l, 'thumb')).toBe(n.thumb);
    expect(count(l, 'headline')).toBe(n.headline);
    expect(count(l, 'forwards')).toBe(n.forwards);
    expect(count(l, 'potato')).toBe(n.potato);
    expect(count(l, 'laugh')).toBe(n.laugh);
    expect(count(l, 'seen')).toBe(n.seen - 1); // the letterbox itself plus spilled letters
  });
  it('more mess means more shapes', () => {
    expect(muralShapes(FULL).length).toBeGreaterThan(muralShapes(ZERO_LEVELS).length);
  });
  it('the same seed gives the same layout, so shapes never jump', () => {
    const l: Levels = { thumb: 0.7, headline: 0.4, forwards: 0.2, potato: 0.6, laugh: 0.3, seen: 0.8 };
    expect(muralShapes(l, 7)).toEqual(muralShapes(l, 7));
    expect(muralShapes(l, 7)).not.toEqual(muralShapes(l, 8));
  });
  it('existing shapes keep their place when levels rise', () => {
    const lo = muralShapes({ ...ZERO_LEVELS, headline: 0.25 });
    const hi = muralShapes({ ...ZERO_LEVELS, headline: 0.75 });
    const a = lo.find((s) => s.key === 'headline0')!;
    const b = hi.find((s) => s.key === 'headline0')!;
    expect(b).toEqual(a);
  });
});
