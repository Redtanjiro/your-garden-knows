// Mia's month: the fictional sample behind the walkthrough. Pure: nothing is read or stored.
import { addDays, parseISODate, today as todayStr } from '../engine/dates';
import type { CheckIn, Profile, RawDay } from '../engine/types';
import { mulberry32 } from '../garden/draw';

export const WT_DAYS = 28;

export interface Beat {
  day: number;
  label: string;
}

export const BEATS: Beat[] = [
  { day: 1, label: 'Planted' },
  { day: 9, label: 'Exams start' },
  { day: 15, label: 'Group chat drama' },
  { day: 18, label: 'Tidy-up started' },
  { day: 23, label: 'Tidy-up done' },
  { day: 28, label: 'Today' },
];

const MIA_NORMAL: RawDay = { shortVideoMinutes: 45, steps: 6000, linksUnopened: 1, forwards: 0, laughPer10: 1, unread: 20 };

/** The raw day Mia would report on day d (1..28), before jitter. */
function plan(d: number): RawDay {
  if (d <= 8) return { shortVideoMinutes: 30, steps: 7000, linksUnopened: d % 2, forwards: 0, laughPer10: 0.5, unread: 12 }; // settling in
  if (d <= 14) return { shortVideoMinutes: 120, steps: 3000, linksUnopened: 2 + (d % 2), forwards: d % 3 === 0 ? 1 : 0, laughPer10: 1, unread: 25 }; // exam week
  if (d <= 17) return { shortVideoMinutes: 100, steps: 3500, linksUnopened: 2, forwards: 4 + (d % 3), laughPer10: 4, unread: 64 + d }; // group-chat drama
  if (d <= 24) return { shortVideoMinutes: 70, steps: 7500, linksUnopened: 0, forwards: 0, laughPer10: 1, unread: 30 }; // tidy-up plus walking
  return { shortVideoMinutes: 50, steps: 7000, linksUnopened: 0, forwards: 0, laughPer10: 0.5, unread: 15 }; // new normal
}

export function walkthroughData(t = todayStr()) {
  const R = mulberry32(22);
  const start = addDays(t, -(WT_DAYS - 1));
  const profile: Profile = {
    id: 'me',
    gardenName: 'Mia’s backyard',
    normal: MIA_NORMAL,
    dataMode: 'checkin',
    reminder: { time: '20:00', calendarAdded: true, inApp: true },
    paused: false,
    createdAt: parseISODate(start).toISOString(),
  };
  const checkins: CheckIn[] = [];
  for (let d = 1; d <= WT_DAYS; d++) {
    const date = addDays(start, d - 1);
    const p = plan(d);
    const at = parseISODate(date);
    at.setHours(20, 6);
    checkins.push({
      ...p,
      shortVideoMinutes: Math.max(0, Math.round(p.shortVideoMinutes + (R() - 0.5) * 10)),
      steps: Math.max(0, Math.round((p.steps + (R() - 0.5) * 800) / 10) * 10),
      unread: Math.max(0, Math.round(p.unread + (R() - 0.5) * 6)),
      date,
      source: 'checkin',
      savedAt: at.toISOString(),
    });
  }
  const dateOf = (d: number) => addDays(start, d - 1);
  return { profile, checkins, beats: BEATS, dateOf, start };
}
