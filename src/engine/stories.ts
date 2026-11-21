import { addDays } from './dates';
import { challengeMeta, fmt, landmark, META, valueText } from './meta';
import {
  DEFAULT_NORMAL,
  latestValue,
  levelsAt,
  normalMetrics,
  potatoRatio,
  propCounts,
  rawToMetrics,
  SWIPE_M,
  SWIPES_PER_MIN,
} from './metrics';
import type { ChallengeType, DayData, Levels, MetricKey, Metrics, RawDay } from './types';
import { KEYS } from './types';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
export const countWord = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

/* ---------- live preview change list (screen 8) ---------- */
export interface Change {
  text: string;
  tone: 'grow' | 'shrink' | 'same';
}
const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);

export function changeList(before: Levels, after: Levels): Change[] {
  const a = propCounts(before);
  const b = propCounts(after);
  const out: Change[] = [];
  const dn = b.newspapers - a.newspapers;
  if (dn) out.push({ text: `${signed(dn)} ${Math.abs(dn) === 1 ? 'newspaper' : 'newspapers'} on the lawn`, tone: dn > 0 ? 'grow' : 'shrink' });
  const dg = b.grass - a.grass;
  if (dg > 100) out.push({ text: 'Grass much longer', tone: 'grow' });
  else if (dg > 10) out.push({ text: 'Grass a little longer', tone: 'grow' });
  else if (dg < -100) out.push({ text: 'Grass much shorter', tone: 'shrink' });
  else if (dg < -10) out.push({ text: 'Grass a little shorter', tone: 'shrink' });
  const dp = b.potatoes - a.potatoes;
  if (dp) out.push({ text: `${signed(dp)} ${Math.abs(dp) === 1 ? 'potato' : 'potatoes'} in the bed`, tone: dp > 0 ? 'grow' : 'shrink' });
  if (b.couch && !a.couch) out.push({ text: 'A couch appears on the lawn', tone: 'grow' });
  if (!b.couch && a.couch) out.push({ text: 'The couch goes back inside', tone: 'shrink' });
  const dk = b.kookaburras - a.kookaburras;
  if (dk) out.push({ text: `${signed(dk)} ${Math.abs(dk) === 1 ? 'kookaburra' : 'kookaburras'} on the fence`, tone: dk > 0 ? 'grow' : 'shrink' });
  const df = b.flyers - a.flyers;
  if (df > 1) out.push({ text: df > 8 ? 'Letterbox much fuller' : 'Letterbox a bit fuller', tone: 'grow' });
  else if (df < -1) out.push({ text: df < -8 ? 'Letterbox much emptier' : 'Letterbox a bit emptier', tone: 'shrink' });
  const ds = b.seeds - a.seeds;
  if (ds > 0) out.push({ text: `${signed(ds)} ${ds === 1 ? 'seed' : 'seeds'} blowing next door`, tone: 'grow' });
  else if (ds < 0) out.push({ text: `${signed(ds)} ${ds === -1 ? 'seed' : 'seeds'} blowing next door`, tone: 'shrink' });
  else out.push({ text: 'No new seeds', tone: 'same' });
  return out;
}

/* ---------- summary bubble (screen 7) ---------- */
function detail(k: MetricKey, v: number): string {
  switch (k) {
    case 'thumb':
      return `Your thumb scrolled about ${fmt(v, 0)} m of short video.`;
    case 'headline':
      return `You shared ${fmt(v, 0)} ${Math.round(v) === 1 ? 'link' : 'links'} without opening ${Math.round(v) === 1 ? 'it' : 'them'}.`;
    case 'forwards':
      return `${countWord(Math.round(v))} forwarded ${Math.round(v) === 1 ? 'message' : 'messages'} went out.`;
    case 'potato':
      return `Your thumb travelled ${fmt(v, 0)} m for every km you walked.`;
    case 'laugh':
      return `${fmt(v, 0)} 😂 per 100 messages. Your chats are having a good day.`;
    case 'seen':
      return `${fmt(v, 0)} unread on your busiest chat.`;
  }
}

export function summaryMessage(days: Map<string, DayData>, normal: Metrics, date: string): string {
  const todayData = days.get(date);
  if (!todayData || !Object.keys(todayData.metrics).length)
    return 'No check-in yet today. The garden is showing the last few days.';
  const hadYesterday = [...Array(13)].some((_, i) => days.has(addDays(date, -1 - i)));
  if (!hadYesterday) return 'Your garden grew from today’s check-in. A week of check-ins shows the real pattern.';
  const a = propCounts(levelsAt(days, normal, addDays(date, -1)));
  const b = propCounts(levelsAt(days, normal, date));
  const diffs: { k: MetricKey; d: number; size: number; noun: [string, string] }[] = [
    { k: 'headline', d: b.newspapers - a.newspapers, size: 12, noun: ['newspaper', 'newspapers'] },
    { k: 'thumb', d: b.grass - a.grass, size: 520, noun: ['blade of grass', 'blades of grass'] },
    { k: 'forwards', d: b.seeds - a.seeds, size: 40, noun: ['seed', 'seeds'] },
    { k: 'potato', d: b.potatoes - a.potatoes, size: 12, noun: ['potato', 'potatoes'] },
    { k: 'laugh', d: b.kookaburras - a.kookaburras, size: 10, noun: ['kookaburra', 'kookaburras'] },
    { k: 'seen', d: b.flyers - a.flyers, size: 36, noun: ['flyer', 'flyers'] },
  ];
  diffs.sort((x, y) => Math.abs(y.d) / y.size - Math.abs(x.d) / x.size);
  const top = diffs[0];
  if (!top.d) return 'Quiet day in the garden. Everything is about where it was yesterday.';
  const v = todayData.metrics[top.k] ?? 0;
  const n = Math.abs(top.d);
  if (top.k === 'thumb')
    return `${top.d > 0 ? 'The grass grew a little longer today.' : 'The grass got a trim today.'} ${detail('thumb', v)}`;
  if (top.k === 'seen')
    return `${top.d > 0 ? 'The letterbox filled up a bit today.' : 'The letterbox emptied a bit today.'} ${detail('seen', v)}`;
  const noun = n === 1 ? top.noun[0] : top.noun[1];
  const lead =
    top.d > 0
      ? `${countWord(n)} more ${noun} ${top.k === 'headline' ? 'turned up' : top.k === 'laugh' ? 'landed on the fence' : top.k === 'potato' ? 'came up' : 'blew next door'} today.`
      : `${countWord(n)} fewer ${noun} today.`;
  return `${lead} ${detail(top.k, v)}`;
}

/* ---------- challenge projection (screen 10, section 5.6) ---------- */
export function projectChallenge(
  days: Map<string, DayData>,
  normalRaw: RawDay,
  type: ChallengeType,
  from: string,
): { now: Levels; after: Levels; date: string } {
  const cm = challengeMeta(type);
  const normal = normalMetrics(normalRaw);
  const now = levelsAt(days, normal, from);
  const baseRaw: RawDay = latestRaw(days, from) ?? normalRaw;
  const proj = new Map(days);
  const latest = {} as Metrics;
  for (const k of KEYS) latest[k] = latestValue(days, k, from)?.value ?? rawToMetrics(normalRaw)[k];
  for (let i = 1; i <= cm.days; i++) {
    const date = addDays(from, i);
    const m: Metrics = { ...latest };
    switch (type) {
      case 'open-before-share':
        m.headline = 0;
        break;
      case 'phone-free-hour':
        m.thumb = Math.max(0, baseRaw.shortVideoMinutes - 60) * SWIPES_PER_MIN * SWIPE_M;
        break;
      case 'clear-letterbox':
        m.seen = normalRaw.unread;
        break;
      case 'check-forward':
        m.forwards = 0;
        break;
      case 'walk-it-off':
        m.potato = potatoRatio(latest.thumb, baseRaw.steps + 1333);
        break;
    }
    proj.set(date, { date, metrics: m, sources: {} });
  }
  const after = levelsAt(proj, normal, addDays(from, cm.days));
  return { now, after, date: addDays(from, cm.days) };
}

export function latestRaw(days: Map<string, DayData>, asOf: string): RawDay | undefined {
  for (let i = 0; i < 30; i++) {
    const r = days.get(addDays(asOf, -i))?.raw;
    if (r) return r;
  }
  return undefined;
}

/** Prop count for a metric, used in "3 → 1 newspapers". */
export function propCountFor(k: MetricKey, l: Levels): number {
  const c = propCounts(l);
  return { thumb: c.grass, headline: c.newspapers, forwards: c.seeds, potato: c.potatoes, laugh: c.kookaburras, seen: c.flyers }[k];
}

/* ---------- weekly report (screen 12) ---------- */
export interface ReportStory {
  kind: 'grower' | 'tidy' | 'silly';
  eyebrow: string;
  title: string;
  body: string;
}

export function weekStart(date: string): string {
  const dow = new Date(date + 'T00:00').getDay(); // 0 Sunday
  return addDays(date, -(dow === 0 ? 7 : dow));
}

export function reportStories(days: Map<string, DayData>, normal: Metrics, from: string, to: string): ReportStory[] {
  const a = levelsAt(days, normal, from);
  const b = levelsAt(days, normal, to);
  const deltas = KEYS.map((k) => ({ k, d: b[k] - a[k] })).sort((x, y) => y.d - x.d);
  const valAt = (k: MetricKey, d: string) => latestValue(days, k, d, 6)?.value;
  const moved = (k: MetricKey, verb: 'rose' | 'fell') => {
    const a0 = valAt(k, from), b0 = valAt(k, to);
    if (a0 === undefined) return `${META[k].name} is at ${valueText(k, b0 ?? 0)}, up from no data last Sunday.`;
    return `${META[k].name} ${verb} from ${valueText(k, a0)} to ${valueText(k, b0 ?? 0)}.`;
  };
  const stories: ReportStory[] = [];
  const grow = deltas[0];
  if (grow.d > 0.02) {
    stories.push({
      kind: 'grower',
      eyebrow: 'Biggest grower',
      title: GROW_TITLE[grow.k],
      body: moved(grow.k, 'rose'),
    });
  } else {
    stories.push({ kind: 'grower', eyebrow: 'Biggest grower', title: 'Nothing ran wild.', body: 'No patch grew much this week. Steady as a lawn bowls green.' });
  }
  const tidy = deltas[deltas.length - 1];
  if (tidy.d < -0.02) {
    stories.push({
      kind: 'tidy',
      eyebrow: 'Best tidy-up',
      title: TIDY_TITLE[tidy.k],
      body: moved(tidy.k, 'fell'),
    });
  } else {
    stories.push({ kind: 'tidy', eyebrow: 'Best tidy-up', title: 'Room to tidy.', body: 'No patch got smaller this week. A tidy-up challenge could change that.' });
  }
  let metres = 0;
  for (let i = 0; i < 7; i++) metres += days.get(addDays(to, -i))?.metrics.thumb ?? 0;
  stories.push({
    kind: 'silly',
    eyebrow: 'Silliest stat',
    title: `${landmark(metres)}.`,
    body: `That’s how far your thumb scrolled this week: about ${fmt(metres, 0)} m of short video.`,
  });
  return stories;
}

const GROW_TITLE: Record<MetricKey, string> = {
  thumb: 'The grass is getting long.',
  headline: 'The newspapers piled up.',
  forwards: 'Seeds went next door.',
  potato: 'The potatoes came up.',
  laugh: 'Kookaburras moved in.',
  seen: 'The letterbox filled up.',
};
const TIDY_TITLE: Record<MetricKey, string> = {
  thumb: 'The lawn got a mow.',
  headline: 'The lawn is clearing.',
  forwards: 'The seeds settled.',
  potato: 'The potatoes got dug up.',
  laugh: 'The kookaburras flew off.',
  seen: 'The letterbox emptied.',
};

/* ---------- street feed (screen 14): from level changes, never numbers ---------- */
export interface FeedMember {
  name: string;
  levels: Levels; // 0..10
  prev?: Levels; // 0..10, a week ago
}
export function streetFeed(members: FeedMember[], seedLandings: Record<string, number>): string[] {
  const out: string[] = [];
  for (const m of members) {
    const n = seedLandings[m.name];
    if (n) out.push(`Seeds from ${m.name}’s garden landed in ${n} ${n === 1 ? 'garden' : 'gardens'} this week.`);
  }
  for (const m of members) {
    if (!m.prev) continue;
    if (m.prev.seen - m.levels.seen >= 3) out.push(`${m.name} cleared the letterbox. 👋`);
    if (m.prev.headline - m.levels.headline >= 3) out.push(`${m.name} picked the newspapers up off the lawn.`);
    if (m.prev.thumb - m.levels.thumb >= 3) out.push(`${m.name} mowed the long grass.`);
    if (m.prev.potato - m.levels.potato >= 3) out.push(`${m.name} dug up the potatoes.`);
  }
  for (const m of members) if (m.levels.laugh >= 10) out.push(`${m.name} has 10 kookaburras. Someone’s funny.`);
  return out;
}

export { DEFAULT_NORMAL };
