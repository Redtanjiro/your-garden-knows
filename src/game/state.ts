// Pure game logic. Uses the real metric engine so the game and the app agree.
import { landmark } from '../engine/meta';
import { mess, normalMetrics, rawToMetrics, score, tier, type Tier } from '../engine/metrics';
import type { Levels, MetricKey, Metrics, RawDay } from '../engine/types';
import { KEYS } from '../engine/types';
import { CHAPTERS, START_TALLY, type Buzz, type Choice, type Tally } from './content';

/** "An ordinary day" in the game. Twice this is maximum mess, as in the app. */
export const GAME_NORMAL: RawDay = {
  shortVideoMinutes: 45,
  steps: 6000,
  linksUnopened: 1,
  forwards: 1,
  laughPer10: 2,
  unread: 20,
};
export const NORMAL_M: Metrics = normalMetrics(GAME_NORMAL);

export interface Pick {
  buzz: string;
  phone: boolean;
  label: string;
}

export interface Day {
  tally: Tally;
  clock: number; // minutes after midnight
  picks: Pick[];
}

export const newDay = (): Day => ({ tally: { ...START_TALLY }, clock: CHAPTERS[0].start, picks: [] });

export function applyChoice(day: Day, buzz: Buzz, c: Choice): Day {
  const t = { ...day.tally };
  const { setUnread, ...rest } = c.delta;
  for (const [k, v] of Object.entries(rest)) (t as any)[k] += v as number;
  if (setUnread !== undefined) t.unread = setUnread;
  if (c.phone && !c.delta.videoMin) t.chatMin += Math.max(1, c.minutes);
  return { tally: t, clock: day.clock + c.minutes, picks: [...day.picks, { buzz: buzz.id, phone: c.phone, label: c.label }] };
}

/** Jump the clock to a chapter start, unless your phone already ate past it. */
export function enterChapter(day: Day, chapterIdx: number): { day: Day; late: boolean } {
  const start = CHAPTERS[chapterIdx].start;
  if (day.clock > start + 5) return { day, late: true };
  return { day: { ...day, clock: Math.max(day.clock, start) }, late: false };
}

export function rawOf(t: Tally): RawDay {
  return {
    shortVideoMinutes: t.videoMin,
    steps: t.steps,
    linksUnopened: t.links,
    forwards: t.forwards,
    laughPer10: t.msgs > 0 ? Math.min(10, (t.laughs / t.msgs) * 10) : 0,
    unread: t.unread,
  };
}

export const metricsOf = (t: Tally): Metrics => rawToMetrics(rawOf(t));

/** One day, so no smoothing: each level is the day's score against an ordinary day. */
export function levelsOf(t: Tally): Levels {
  const m = metricsOf(t);
  const out = {} as Levels;
  for (const k of KEYS) out[k] = score(m[k], NORMAL_M[k]);
  return out;
}

export function tierOf(t: Tally): Tier {
  return tier(mess(levelsOf(t)));
}

export const phoneMinutes = (t: Tally) => t.videoMin + t.chatMin;

export function clockText(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

export function durText(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function thumbText(t: Tally): string {
  const m = metricsOf(t).thumb;
  if (m < 1) return '0 m';
  return `${Math.round(m)} m`;
}
export function thumbLandmark(t: Tally): string | null {
  const m = metricsOf(t).thumb;
  return m >= 20 ? landmark(m) : null;
}

/** Which buzzes fed a metric, for the receipt. */
export const FEEDS: Record<MetricKey, (keyof Tally)[]> = {
  thumb: ['videoMin'],
  headline: ['links'],
  forwards: ['forwards'],
  potato: ['videoMin', 'steps'],
  laugh: ['laughs'],
  seen: ['unread'],
};

export function picksFor(k: MetricKey, picks: Pick[]): Pick[] {
  const buzzes = CHAPTERS.flatMap((c) => c.buzzes);
  return picks.filter((p) => {
    const ch = buzzes.find((b) => b.id === p.buzz)?.choices.find((c) => c.label === p.label);
    if (!ch) return false;
    return FEEDS[k].some((f) => (ch.delta as Record<string, number>)[f] || (f === 'unread' && ch.delta.setUnread !== undefined));
  });
}

/** Only ever stored in this browser: the last day's tier, for "you vs you". */
const KEY = 'ygk-game-last';
export interface LastDay {
  tier: Tier;
  mess: number;
  at: string;
}
export function loadLast(): LastDay | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as LastDay) : null;
  } catch {
    return null;
  }
}
export function saveLast(t: Tally) {
  try {
    const v: LastDay = { tier: tierOf(t), mess: mess(levelsOf(t)), at: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage blocked: the game still works */
  }
}
