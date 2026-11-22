import { describe, expect, it } from 'vitest';
import { mess } from '../engine/metrics';
import { ALL_BUZZES, CHAPTERS } from './content';
import { applyChoice, enterChapter, levelsOf, newDay, tierOf, type Day } from './state';

function play(pickPhone: (i: number) => boolean): Day {
  let d = newDay();
  let i = 0;
  CHAPTERS.forEach((ch, ci) => {
    d = enterChapter(d, ci).day;
    for (const b of ch.buzzes) d = applyChoice(d, b, b.choices[pickPhone(i++) ? 0 : 1]);
  });
  return d;
}

describe('a day in the game', () => {
  it('has 12 buzzes with two answers each, phone answer first', () => {
    expect(ALL_BUZZES).toHaveLength(12);
    for (const b of ALL_BUZZES) {
      expect(b.choices[0].phone).toBe(true);
      expect(b.choices[1].phone).toBe(false);
    }
  });
  it('every phone answer goes to Feral', () => {
    const d = play(() => true);
    expect(tierOf(d.tally)).toBe('Feral');
    expect(d.clock).toBeGreaterThan(24 * 60); // the phone eats the night
  });
  it('every life answer stays Immaculate', () => {
    expect(tierOf(play(() => false).tally)).toBe('Immaculate');
  });
  it('half and half lands in the middle', () => {
    const t = tierOf(play((i) => i % 2 === 0).tally);
    expect(['Tidy', 'Lived-in', 'Unruly']).toContain(t);
  });
  it('a fresh morning is tidy', () => {
    expect(mess(levelsOf(newDay().tally))).toBeLessThan(0.2);
  });
  it('the scrolling makes you late for lunch', () => {
    let d = newDay();
    for (const b of CHAPTERS[0].buzzes) d = applyChoice(d, b, b.choices[0]);
    expect(enterChapter(d, 1).late).toBe(false); // morning alone fits
    for (let ci = 1; ci < 3; ci++) {
      d = enterChapter(d, ci).day;
      for (const b of CHAPTERS[ci].buzzes) d = applyChoice(d, b, b.choices[0]);
    }
    expect(d.clock).toBeGreaterThan(CHAPTERS[2].start);
  });
});

describe('receipts', () => {
  it('only list the answers that fed that measure', async () => {
    const { picksFor } = await import('./state');
    let d = newDay();
    const walk = ALL_BUZZES.find((b) => b.id === 'walk')!;
    const bed = ALL_BUZZES.find((b) => b.id === 'alarm')!;
    d = applyChoice(d, bed, bed.choices[0]);
    d = applyChoice(d, walk, walk.choices[1]);
    expect(picksFor('thumb', d.picks).map((p) => p.label)).toEqual(['Check it in bed']);
    expect(picksFor('potato', d.picks).map((p) => p.label)).toEqual(['Check it in bed', 'Go for a walk']);
  });
});
