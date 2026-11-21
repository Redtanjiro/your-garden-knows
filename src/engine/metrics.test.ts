import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import {
  DEFAULT_NORMAL,
  FLOOR,
  levelsAt,
  normalMetrics,
  propCounts,
  rawToMetrics,
  resolveDays,
  score,
  streetLevels,
  tier,
} from './metrics';
import { changeList, projectChallenge, reportStories, weekStart } from './stories';
import type { CheckIn, DayData, ImportRecord, Metrics } from './types';
import { KEYS } from './types';

const day = (date: string, over: Partial<CheckIn> = {}): CheckIn => ({
  ...DEFAULT_NORMAL,
  date,
  source: 'checkin',
  savedAt: `${date}T20:00:00.000Z`,
  ...over,
});

describe('section 13 engine examples', () => {
  it('normal 45 min → thumb 18.9 m; a 70 min day scores 0.78', () => {
    const n = normalMetrics({ ...DEFAULT_NORMAL, shortVideoMinutes: 45 });
    expect(n.thumb).toBeCloseTo(18.9, 5);
    const m = rawToMetrics({ ...DEFAULT_NORMAL, shortVideoMinutes: 70 });
    expect(m.thumb).toBeCloseTo(29.4, 5);
    expect(score(m.thumb, n.thumb)).toBeCloseTo(0.78, 2);
  });

  it('laughPer10 3.5 → 35 per 100; normal 1 → 10; score clamps to 1', () => {
    expect(rawToMetrics({ ...DEFAULT_NORMAL, laughPer10: 3.5 }).laugh).toBe(35);
    const n = normalMetrics({ ...DEFAULT_NORMAL, laughPer10: 1 });
    expect(n.laugh).toBe(10);
    expect(score(35, n.laugh)).toBe(1);
  });

  it('steps 0 and thumb 20 → potato 200 (guarded); score clamps to 1', () => {
    // 20 m of thumb = 20 / 0.42 minutes
    const m = rawToMetrics({ ...DEFAULT_NORMAL, shortVideoMinutes: 20 / 0.42, steps: 0 });
    expect(m.potato).toBeCloseTo(200, 5);
    expect(score(m.potato, normalMetrics(DEFAULT_NORMAL).potato)).toBe(1);
  });

  it('one day at score 1 after six days at 0.5 → level ≈ 0.63', () => {
    const normal: Metrics = { thumb: 10, headline: 10, forwards: 10, potato: 10, laugh: 10, seen: 10 };
    const days = new Map<string, DayData>();
    const t = '2026-11-21';
    for (let age = 0; age < 7; age++) {
      const v = age === 0 ? 20 : 10; // 20 = 2× normal → score 1; 10 = normal → 0.5
      const metrics = {} as Metrics;
      for (const k of KEYS) metrics[k] = v;
      days.set(addDays(t, -age), { date: addDays(t, -age), metrics, sources: {} });
    }
    const l = levelsAt(days, normal, t);
    for (const k of KEYS) expect(l[k]).toBeCloseTo(0.63, 2);
  });
});

describe('normal guard and scoring', () => {
  it('a normal of 0 uses the floor', () => {
    const n = normalMetrics({ shortVideoMinutes: 0, steps: 0, linksUnopened: 0, forwards: 0, laughPer10: 0, unread: 0 });
    expect(n).toEqual(FLOOR);
  });
  it('at your normal every level is 0.5 (lived-in)', () => {
    const t = '2026-11-21';
    const days = resolveDays([day(t)], []);
    const l = levelsAt(days, normalMetrics(DEFAULT_NORMAL), t);
    // Default normal has 0 forwards (floored to 0.25), so 0 forwards scores 0.
    for (const k of KEYS) expect(l[k]).toBeCloseTo(k === 'forwards' ? 0 : 0.5, 5);
    expect(tier(0.5)).toBe('Lived-in');
  });
  it('days without data are skipped, not counted as tidy', () => {
    const t = '2026-11-21';
    const days = resolveDays([day(addDays(t, -5), { linksUnopened: 2 })], []);
    expect(levelsAt(days, normalMetrics(DEFAULT_NORMAL), t).headline).toBe(1);
  });
  it('tier words', () => {
    expect([0.1, 0.3, 0.5, 0.7, 0.9].map(tier)).toEqual(['Immaculate', 'Tidy', 'Lived-in', 'Unruly', 'Feral']);
  });
  it('street levels are integers 0..10', () => {
    expect(streetLevels({ thumb: 0.63, headline: 1, forwards: 0, potato: 0.05, laugh: 0.5, seen: 0.94 })).toEqual({
      thumb: 6, headline: 10, forwards: 0, potato: 1, laugh: 5, seen: 9,
    });
  });
  it('prop counts follow section 5.4', () => {
    const c = propCounts({ thumb: 0.5, headline: 0.25, forwards: 0.5, potato: 0.9, laugh: 0.3, seen: 0.6 });
    expect(c).toMatchObject({ grass: 260, vines: 18, newspapers: 3, seeds: 20, weeds: true, potatoes: 11, couch: true, kookaburras: 3, flyers: 22, extraLetters: true });
  });
});

describe('exports vs check-ins', () => {
  const imp = (importedAt: string): ImportRecord => ({
    id: 'wa',
    kind: 'whatsapp',
    fileName: 'chat.txt',
    coverage: { from: '2026-11-20', to: '2026-11-20' },
    daily: { '2026-11-20': { headline: 7 } },
    importedAt,
  });
  it('exports override check-ins saved before the import', () => {
    const d = resolveDays([day('2026-11-20', { savedAt: '2026-11-20T10:00:00Z' })], [imp('2026-11-21T10:00:00Z')]);
    expect(d.get('2026-11-20')!.metrics.headline).toBe(7);
    expect(d.get('2026-11-20')!.sources.headline).toBe('whatsapp');
    expect(d.get('2026-11-20')!.sources.thumb).toBe('checkin');
  });
  it('a check-in saved after the import wins', () => {
    const d = resolveDays([day('2026-11-20', { savedAt: '2026-11-22T10:00:00Z' })], [imp('2026-11-21T10:00:00Z')]);
    expect(d.get('2026-11-20')!.metrics.headline).toBe(1);
  });
});

describe('stories', () => {
  it('preview change list reports new newspapers and no new seeds', () => {
    const before = { thumb: 0.5, headline: 0.5, forwards: 0, potato: 0.5, laugh: 0.5, seen: 0.5 };
    const after = { ...before, headline: 0.7 };
    const list = changeList(before, after).map((c) => c.text);
    expect(list).toContain('+2 newspapers on the lawn');
    expect(list).toContain('No new seeds');
  });
  it('challenge projection lowers the target metric only', () => {
    const t = '2026-11-21';
    const days = resolveDays([day(t, { linksUnopened: 3 })], []);
    const p = projectChallenge(days, DEFAULT_NORMAL, 'open-before-share', t);
    expect(p.after.headline).toBeLessThan(p.now.headline);
    expect(p.after.seen).toBeCloseTo(p.now.seen, 5);
  });
  it('week starts on the previous Sunday', () => {
    expect(weekStart('2026-11-21')).toBe('2026-11-15'); // Saturday → Sunday 15
    expect(weekStart('2026-11-22')).toBe('2026-11-15'); // Sunday → last Sunday
  });
  it('report finds a grower, a tidy-up and a silly stat', () => {
    const cs: CheckIn[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays('2026-11-15', i);
      cs.push(day(date, { laughPer10: 1 + i * 0.5, linksUnopened: Math.max(0, 6 - i) }));
    }
    const s = reportStories(resolveDays(cs, []), normalMetrics(DEFAULT_NORMAL), '2026-11-15', '2026-11-21');
    expect(s[0].title).toBe('Kookaburras moved in.');
    expect(s[1].title).toBe('The lawn is clearing.');
    expect(s[2].kind).toBe('silly');
  });
});
