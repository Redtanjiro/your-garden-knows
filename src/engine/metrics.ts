import { addDays, daysBetween } from './dates';
import type { CheckIn, DayData, ImportRecord, Levels, MetricKey, Metrics, Profile, RawDay } from './types';
import { KEYS } from './types';

export const SWIPES_PER_MIN = 3;
export const SWIPE_M = 0.14;
export const STRIDE_M = 0.75;
export const HALF_LIFE_DAYS = 3;
export const WINDOW_DAYS = 14;

/** A normal of 0 is treated as this floor so scores never divide by zero. */
export const FLOOR: Metrics = { thumb: 5, headline: 0.5, forwards: 0.25, potato: 2, laugh: 4, seen: 5 };

export const DEFAULT_NORMAL: RawDay = {
  shortVideoMinutes: 45,
  steps: 6000,
  linksUnopened: 1,
  forwards: 0,
  laughPer10: 1,
  unread: 20,
};

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function potatoRatio(thumb: number, steps: number): number {
  const km = (steps * STRIDE_M) / 1000;
  return km > 0 ? thumb / km : thumb * 10;
}

/** Section 5.1: a check-in (or the normal) to the six metrics. */
export function rawToMetrics(r: RawDay): Metrics {
  const thumb = r.shortVideoMinutes * SWIPES_PER_MIN * SWIPE_M;
  return {
    thumb,
    headline: r.linksUnopened,
    forwards: r.forwards,
    potato: potatoRatio(thumb, r.steps),
    laugh: r.laughPer10 * 10,
    seen: r.unread,
  };
}

export function normalMetrics(normal: RawDay): Metrics {
  const m = rawToMetrics(normal);
  const out = {} as Metrics;
  for (const k of KEYS) out[k] = m[k] > 0 ? m[k] : FLOOR[k];
  return out;
}

/** Section 5.2: 0 at nothing, 0.5 at your normal, 1 at twice your normal. */
export function score(value: number, normal: number): number {
  return clamp(value / (2 * normal));
}

/**
 * Merge check-ins and imports into one value per metric per day.
 * Exports override check-in values for the days they cover, unless the
 * check-in was saved after the import.
 */
export function resolveDays(
  checkins: CheckIn[],
  imports: ImportRecord[],
  profile?: Pick<Profile, 'normal' | 'avgSteps'>,
): Map<string, DayData> {
  const days = new Map<string, DayData>();
  const get = (date: string) => {
    let d = days.get(date);
    if (!d) days.set(date, (d = { date, metrics: {}, sources: {} }));
    return d;
  };
  const byDate = new Map(checkins.map((c) => [c.date, c]));

  for (const c of checkins) {
    const d = get(c.date);
    d.raw = c;
    const m = rawToMetrics(c);
    for (const k of KEYS) {
      d.metrics[k] = m[k];
      d.sources[k] = 'checkin';
    }
  }

  const sorted = [...imports].sort((a, b) => a.importedAt.localeCompare(b.importedAt));
  for (const imp of sorted) {
    for (const [date, part] of Object.entries(imp.daily)) {
      const c = byDate.get(date);
      if (c && c.savedAt > imp.importedAt) continue; // newer check-in wins
      const d = get(date);
      for (const k of KEYS) {
        const v = part[k];
        if (v === undefined || !isFinite(v)) continue;
        d.metrics[k] = v;
        d.sources[k] = imp.kind;
      }
      // Potato follows the export's thumb, using that day's steps.
      if (part.thumb !== undefined) {
        const steps = c?.steps ?? profile?.avgSteps ?? profile?.normal.steps ?? DEFAULT_NORMAL.steps;
        d.metrics.potato = potatoRatio(part.thumb, steps);
        d.sources.potato = imp.kind;
      }
    }
  }
  return days;
}

/** Section 5.3: exponentially weighted average of the last 14 days, 3-day half-life. */
export function levelsAt(days: Map<string, DayData>, normal: Metrics, asOf: string): Levels {
  const out = {} as Levels;
  for (const k of KEYS) {
    let sw = 0;
    let s = 0;
    for (let age = 0; age < WINDOW_DAYS; age++) {
      const v = days.get(addDays(asOf, -age))?.metrics[k];
      if (v === undefined) continue; // days without data are skipped
      const w = Math.pow(0.5, age / HALF_LIFE_DAYS);
      sw += w;
      s += w * score(v, normal[k]);
    }
    out[k] = sw > 0 ? s / sw : 0;
  }
  return out;
}

export const ZERO_LEVELS: Levels = { thumb: 0, headline: 0, forwards: 0, potato: 0, laugh: 0, seen: 0 };

export function mess(levels: Levels): number {
  return KEYS.reduce((a, k) => a + levels[k], 0) / KEYS.length;
}

export type Tier = 'Immaculate' | 'Tidy' | 'Lived-in' | 'Unruly' | 'Feral';
export function tier(m: number): Tier {
  if (m < 0.2) return 'Immaculate';
  if (m < 0.4) return 'Tidy';
  if (m < 0.6) return 'Lived-in';
  if (m < 0.8) return 'Unruly';
  return 'Feral';
}

/** Section 5.4 prop counts. */
export interface PropCounts {
  grass: number;
  grassLength: number;
  vines: number;
  newspapers: number;
  seeds: number;
  weeds: boolean;
  potatoes: number;
  couch: boolean;
  kookaburras: number;
  flyers: number;
  extraLetters: boolean;
}
export function propCounts(l: Levels): PropCounts {
  return {
    grass: Math.round(l.thumb * 520),
    grassLength: 3 + l.thumb * 10,
    vines: Math.round(l.thumb * 36),
    newspapers: Math.round(l.headline * 12),
    seeds: Math.round(l.forwards * 40),
    weeds: l.forwards > 0.4,
    potatoes: Math.round(l.potato * 12),
    couch: l.potato > 0.85,
    kookaburras: Math.round(l.laugh * 10),
    flyers: Math.round(l.seen * 36),
    extraLetters: l.seen > 0.5,
  };
}

/** Levels as integers 0..10: the only thing a street ever sees. */
export function streetLevels(l: Levels): Levels {
  const out = {} as Levels;
  for (const k of KEYS) out[k] = Math.round(clamp(l[k]) * 10);
  return out;
}
export function fromStreetLevels(l: Levels): Levels {
  const out = {} as Levels;
  for (const k of KEYS) out[k] = clamp((l[k] ?? 0) / 10);
  return out;
}

/** Dates with any data, newest first. */
export function dataDates(days: Map<string, DayData>): string[] {
  return [...days.keys()].filter((d) => Object.keys(days.get(d)!.metrics).length).sort().reverse();
}

/** The latest day on or before `asOf` that has a value for k. */
export function latestValue(days: Map<string, DayData>, k: MetricKey, asOf: string, maxBack = 30) {
  for (let i = 0; i <= maxBack; i++) {
    const date = addDays(asOf, -i);
    const v = days.get(date)?.metrics[k];
    if (v !== undefined) return { date, value: v };
  }
  return null;
}

/** Garden reference date: today, or the pause date while paused. */
export function gardenDate(profile: Pick<Profile, 'paused' | 'pausedOn'> | undefined, todayStr: string) {
  if (profile?.paused && profile.pausedOn && daysBetween(profile.pausedOn, todayStr) > 0) return profile.pausedOn;
  return todayStr;
}
