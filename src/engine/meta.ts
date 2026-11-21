import type { ChallengeType, MetricKey } from './types';

export interface MetricMeta {
  key: MetricKey;
  slug: string; // /garden/:prop alias
  name: string; // "Thumb mileage"
  prop: string; // "Long grass and vines"
  propShort: string; // "Long grass"
  unit: (v: number) => string; // "m a day"
  formula: string;
  maxPhrase: string; // what happens at twice normal
  advice: string;
  challenge: ChallengeType | null;
}

export function fmt(v: number, digits = 1): string {
  if (!isFinite(v)) return '–';
  if (Math.abs(v) >= 100) return Math.round(v).toLocaleString('en-AU');
  return (+v.toFixed(digits)).toLocaleString('en-AU');
}
const plural = (v: number, one: string, many: string) => (Math.round(v * 10) / 10 === 1 ? one : many);

export const META: Record<MetricKey, MetricMeta> = {
  thumb: {
    key: 'thumb',
    slug: 'grass',
    name: 'Thumb mileage',
    prop: 'Long grass and vines',
    propShort: 'Long grass',
    unit: () => 'm a day',
    formula: 'Minutes on short video × 3 swipes a minute × 0.14 m a swipe',
    maxPhrase: 'the grass is as long as it gets and vines cover the house',
    advice: 'Put the phone in another room for an hour. The grass gets a trim every hour your thumb rests.',
    challenge: 'phone-free-hour',
  },
  headline: {
    key: 'headline',
    slug: 'newspapers',
    name: 'Headline-only shares',
    prop: 'Newspapers on the lawn',
    propShort: 'Newspapers',
    unit: (v) => `${plural(v, 'link', 'links')} a day`,
    formula: 'Links you shared without opening them, per day',
    maxPhrase: 'all twelve newspapers land on the lawn',
    advice: 'Open a link before you send it on. Even a ten-second skim picks a paper up off the lawn.',
    challenge: 'open-before-share',
  },
  forwards: {
    key: 'forwards',
    slug: 'seeds',
    name: 'Forward depth',
    prop: 'Seeds blowing next door',
    propShort: 'Seeds',
    unit: (v) => `${plural(v, 'forward', 'forwards')} a day`,
    formula: 'Messages you sent on with a "Forwarded" label, per day',
    maxPhrase: 'forty seeds blow over the fence and weeds sprout next door',
    advice: 'Before you forward something, check where it came from. Fewer forwards, fewer seeds in the neighbours’ lawns.',
    challenge: 'check-forward',
  },
  potato: {
    key: 'potato',
    slug: 'potatoes',
    name: 'Couch potato ratio',
    prop: 'Potatoes, then a couch',
    propShort: 'Potatoes',
    unit: () => 'm per km walked',
    formula: 'Thumb mileage ÷ km walked (steps × 0.75 m)',
    maxPhrase: 'the whole bed is potatoes and a couch appears on the lawn',
    advice: 'Walk a kilometre. It digs up potatoes from both ends: more steps and less scrolling while you walk.',
    challenge: 'walk-it-off',
  },
  laugh: {
    key: 'laugh',
    slug: 'kookaburras',
    name: '😂 density',
    prop: 'Kookaburras on the fence',
    propShort: 'Kookaburras',
    unit: () => 'per 100 messages',
    formula: '😂 and 🤣 you send ÷ messages you send × 100',
    maxPhrase: 'all ten kookaburras turn up',
    advice: 'Honestly, kookaburras are harmless. They fly off when your 😂 density drops. Some mess is fine: this one is your call.',
    challenge: null,
  },
  seen: {
    key: 'seen',
    slug: 'letterbox',
    name: 'Seen-zoned',
    prop: 'Overflowing letterbox',
    propShort: 'Letterbox',
    unit: (v) => `unread ${plural(v, 'message', 'messages')}`,
    formula: 'Unread messages on your busiest chat',
    maxPhrase: 'the letterbox overflows and junk mail covers the path',
    advice: 'Reply to one chat. You don’t have to read everything; a quick “catching up now 👋” empties a lot of letterbox.',
    challenge: 'clear-letterbox',
  },
};

export function metricFromSlug(s: string | undefined): MetricKey | null {
  if (!s) return null;
  for (const m of Object.values(META)) if (m.key === s || m.slug === s) return m.key;
  return null;
}

export function valueText(k: MetricKey, v: number): string {
  const d = k === 'seen' ? 0 : k === 'thumb' || k === 'potato' ? 0 : 1;
  return `${fmt(v, d)} ${META[k].unit(v)}`;
}

const LANDMARKS: [number, string, string][] = [
  [1149, 'Harbour Bridge', 'Harbour Bridges'],
  [309, 'Sydney Tower', 'Sydney Towers'],
  [183, 'Opera House', 'Opera Houses'],
  [50, 'Olympic pool', 'Olympic pools'],
  [20, 'cricket pitch', 'cricket pitches'],
];
export function landmark(metres: number): string {
  for (const [len, one, many] of LANDMARKS) {
    if (metres >= len) {
      const n = metres / len;
      return `${fmt(n)} ${n < 1.05 ? one : many}`;
    }
  }
  return `${fmt(metres / 20, 2)} of a cricket pitch`;
}

export interface ChallengeMeta {
  type: ChallengeType;
  title: string;
  short: string; // "One hour a day, 5 days"
  body: string;
  clears: string; // "Mows the long grass"
  days: number;
  metric: MetricKey;
  propNoun: string; // for "3 → 1 newspapers"
}

export const CHALLENGES: ChallengeMeta[] = [
  {
    type: 'open-before-share',
    title: 'Open before you share',
    short: 'Open every link, 3 days',
    body: 'For three days, open every link before you send it on. Tick it off each evening.',
    clears: 'Clears newspapers on the lawn',
    days: 3,
    metric: 'headline',
    propNoun: 'newspapers',
  },
  {
    type: 'phone-free-hour',
    title: 'Phone-free hour',
    short: 'One hour a day, 5 days',
    body: 'For five days, put the phone away for one hour. Tick it off each evening.',
    clears: 'Mows the long grass',
    days: 5,
    metric: 'thumb',
    propNoun: 'blades of long grass',
  },
  {
    type: 'clear-letterbox',
    title: 'Clear the letterbox',
    short: 'Reply to one chat, 3 days',
    body: 'For three days, reply to one chat you’ve been leaving on read. Tick it off each evening.',
    clears: 'Empties the letterbox',
    days: 3,
    metric: 'seen',
    propNoun: 'flyers',
  },
  {
    type: 'check-forward',
    title: 'Check before forwarding',
    short: 'One forward checked, 3 days',
    body: 'For three days, check where a message came from before you forward it. Tick it off each evening.',
    clears: 'Stops the seeds',
    days: 3,
    metric: 'forwards',
    propNoun: 'seeds',
  },
  {
    type: 'walk-it-off',
    title: 'Walk it off',
    short: '1 km a day, 5 days',
    body: 'For five days, walk an extra kilometre (about 1,333 steps). Tick it off each evening.',
    clears: 'Digs up the potatoes',
    days: 5,
    metric: 'potato',
    propNoun: 'potatoes',
  },
];
export const challengeMeta = (t: ChallengeType) => CHALLENGES.find((c) => c.type === t)!;
