import { describe, expect, it } from 'vitest';
import { levelsAt, mess, normalMetrics, resolveDays, tier } from '../engine/metrics';
import { walkthroughData } from './walkthrough';

const w = walkthroughData('2026-11-22');
const days = resolveDays(w.checkins, [], w.profile);
const normal = normalMetrics(w.profile.normal);
const tierOn = (d: number) => tier(mess(levelsAt(days, normal, w.dateOf(d))));

describe("Mia's month", () => {
  it('has 28 check-ins ending today', () => {
    expect(w.checkins).toHaveLength(28);
    expect(w.checkins[27].date).toBe('2026-11-22');
    expect(w.profile.gardenName).toBe('Mia’s backyard');
  });
  it('settles in tidy', () => expect(tierOn(7)).toBe('Tidy'));
  it('is unruly by the end of exam week', () => expect(tierOn(14)).toBe('Unruly'));
  it('is unruly or feral in the group-chat drama', () => expect(['Unruly', 'Feral']).toContain(tierOn(16)));
  it('eases back to lived-in after the tidy-up', () => expect(tierOn(24)).toBe('Lived-in'));
  it('ends tidy', () => expect(tierOn(28)).toBe('Tidy'));
  it('is the same every time', () => expect(walkthroughData('2026-11-22').checkins).toEqual(w.checkins));
});
