// Port of parseWhatsApp() from the prototype, with whole-file date-order detection.
import { toISODate } from '../engine/dates';
import type { Metrics } from '../engine/types';

export interface Msg {
  ts: number;
  who: string;
  text: string;
}
export type DateOrder = 'dmy' | 'mdy';

const IOS = /^\[(\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*([apAP]\.?\s?[mM]\.?)?\]\s([^:]{1,60}?):\s?([\s\S]*)$/;
const AND = /^(\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*([apAP]\.?\s?[mM]\.?)?\s[-–]\s([^:]{1,60}?):\s?([\s\S]*)$/;
const DATE_START = /^\[?\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}/;

export const CHAIN_PHRASES = [
  'please share',
  'pls share',
  'share this',
  'pass it on',
  'forwarded as received',
  'send this to',
  'copied from',
  'must watch',
  'breaking:',
  'urgent:',
  'viral',
  'share before deleted',
  'they don’t want you to know',
  "they don't want you to know",
];
const URL_RE = /https?:\/\/\S+/gi;
const LAUGH_RE = /😂|🤣/gu;

export function clean(text: string): string {
  return text
    .replace(/[‎‏‪-‮]/g, '')
    .replace(/[  ]/g, ' ')
    .replace(/\r/g, '');
}

/** Decide day-first or month-first across the whole file (default day-first, Australia). */
export function detectOrder(text: string): DateOrder {
  let mdy = false;
  for (const line of text.split('\n')) {
    const m = line.match(IOS) || line.match(AND);
    if (!m) continue;
    const p = m[1].split(/[/.-]/).map(Number);
    if (p[0] > 31) continue; // y-m-d
    if (p[0] > 12) return 'dmy';
    if (p[1] > 12) mdy = true;
  }
  return mdy ? 'mdy' : 'dmy';
}

function parseTs(d: string, t: string, ap: string | undefined, order: DateOrder): number {
  const p = d.split(/[/.-]/).map(Number);
  let day: number, mon: number, yr: number;
  if (p[0] > 31) [yr, mon, day] = p;
  else {
    if (order === 'mdy') [mon, day] = [p[0], p[1]];
    else [day, mon] = [p[0], p[1]];
    yr = p[2] < 100 ? 2000 + p[2] : p[2];
  }
  let [h, m, s] = t.split(':').map(Number);
  s = s || 0;
  if (ap) {
    const pm = /p/i.test(ap);
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  return new Date(yr, mon - 1, day, h, m, s).getTime();
}

export function parseWhatsApp(raw: string, order?: DateOrder): { msgs: Msg[]; order: DateOrder } {
  const text = clean(raw);
  const o = order ?? detectOrder(text);
  const msgs: Msg[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(IOS) || line.match(AND);
    if (m) msgs.push({ ts: parseTs(m[1], m[2], m[3], o), who: m[4].trim(), text: m[5] });
    else if (msgs.length && line.trim() && !DATE_START.test(line)) msgs[msgs.length - 1].text += '\n' + line;
    // lines starting with a date but no "Name:" are system lines and are ignored
  }
  return { msgs: msgs.filter((x) => isFinite(x.ts)), order: o };
}

export function people(msgs: Msg[]): string[] {
  const counts = new Map<string, number>();
  for (const m of msgs) counts.set(m.who, (counts.get(m.who) ?? 0) + 1);
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!);
}

export function isHeadlineOnly(t: string): boolean {
  if (!/https?:\/\//i.test(t)) return false;
  return t.replace(URL_RE, '').replace(/[^\p{L}]/gu, '').length < 4;
}
export function isChain(t: string): boolean {
  const low = t.toLowerCase();
  return t.length > 400 || CHAIN_PHRASES.some((p) => low.includes(p));
}
export const laughs = (t: string) => (t.match(LAUGH_RE) || []).length;

export interface WaResult {
  count: number;
  mine: number;
  days: number;
  from: string;
  to: string;
  daily: Record<string, Partial<Metrics>>;
  totals: { head: number; fwd: number; laughs: number; seen: number };
  futureDates: boolean;
}

/** Per-day metrics for the person chosen as "you". */
export function waDaily(msgs: Msg[], me: string): WaResult {
  const sorted = [...msgs].sort((a, b) => a.ts - b.ts);
  const daily: Record<string, Partial<Metrics> & { _mine?: number; _laughs?: number }> = {};
  let head = 0, fwd = 0, lol = 0, sinceMine = 0, mine = 0;
  const from = toISODate(new Date(sorted[0].ts));
  const to = toISODate(new Date(sorted[sorted.length - 1].ts));
  // every covered day starts at zero
  for (let d = new Date(sorted[0].ts); toISODate(d) <= to; d.setDate(d.getDate() + 1))
    daily[toISODate(d)] = { headline: 0, forwards: 0, _mine: 0, _laughs: 0 };
  for (const m of sorted) {
    const day = daily[toISODate(new Date(m.ts))];
    if (m.who === me) {
      mine++;
      day._mine!++;
      const l = laughs(m.text);
      day._laughs! += l;
      lol += l;
      if (isHeadlineOnly(m.text)) { day.headline!++; head++; }
      if (isChain(m.text)) { day.forwards!++; fwd++; }
      sinceMine = 0;
    } else sinceMine++;
    day.seen = sinceMine; // messages from others since your last message, as of this day
  }
  let carry = 0;
  for (const date of Object.keys(daily).sort()) {
    const d = daily[date];
    if (d.seen === undefined) d.seen = carry;
    carry = d.seen;
    if (d._mine) d.laugh = (d._laughs! / d._mine) * 100;
    delete d._mine;
    delete d._laughs;
  }
  const days = Math.max(1, Math.round((sorted[sorted.length - 1].ts - sorted[0].ts) / 864e5) + 1);
  return {
    count: msgs.length,
    mine,
    days,
    from,
    to,
    daily,
    totals: { head, fwd, laughs: lol, seen: sinceMine },
    futureDates: sorted[sorted.length - 1].ts > Date.now() + 864e5,
  };
}
