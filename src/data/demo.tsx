import { useMemo, type ReactNode } from 'react';
import { addDays, parseISODate, today as todayStr } from '../engine/dates';
import { mulberry32 } from '../garden/draw';
import type { CheckIn, Profile } from '../engine/types';
import { derive, GardenContext, type Actions, type GardenData } from './store';

export const EXAMPLE_MESSAGE = 'This is an example garden, so nothing here saves. Plant your own to check in.';

/** Read-only example garden: nine days of sample check-ins, never stored. */
export function demoData(t = todayStr()): { profile: Profile; checkins: CheckIn[] } {
  const R = mulberry32(9);
  const profile: Profile = {
    id: 'me',
    gardenName: 'Example backyard',
    normal: { shortVideoMinutes: 45, steps: 6000, linksUnopened: 1, forwards: 0, laughPer10: 1, unread: 20 },
    dataMode: 'checkin',
    reminder: { time: '20:00', calendarAdded: false, inApp: true },
    paused: false,
    createdAt: parseISODate(addDays(t, -8)).toISOString(),
  };
  const checkins: CheckIn[] = [];
  for (let i = 8; i >= 0; i--) {
    const date = addDays(t, -i);
    const drift = (8 - i) / 8;
    const at = parseISODate(date);
    at.setHours(20, 4);
    checkins.push({
      date,
      shortVideoMinutes: Math.round(38 + drift * 20 + R() * 15),
      steps: Math.round(5800 - drift * 1200 + R() * 1200),
      linksUnopened: Math.round(R() * 1.2 + drift * 1.5),
      forwards: R() < 0.25 ? 1 : 0,
      laughPer10: Math.round((1 + drift * 2 + R()) * 2) / 2,
      unread: Math.round(24 - drift * 4 + R() * 6),
      source: 'checkin',
      savedAt: at.toISOString(),
    });
  }
  return { profile, checkins };
}

const reject = async () => {
  throw new Error(EXAMPLE_MESSAGE);
};
const NO_ACTIONS: Actions = {
  createProfile: reject,
  updateProfile: reject,
  saveCheckIn: reject,
  saveImports: reject,
  startChallenge: reject,
  logChallenge: reject,
  stopChallenge: reject,
  setStreet: reject,
  logResearch: async () => {},
  setResearch: reject,
  deleteEverything: reject,
};

export function DemoProvider({ children }: { children: ReactNode }) {
  const value = useMemo<GardenData>(() => {
    const t = todayStr();
    const { profile, checkins } = demoData(t);
    return {
      ready: true,
      storageBlocked: false,
      readOnly: true,
      profile,
      checkins,
      imports: [],
      challenges: [],
      street: undefined,
      today: t,
      ...derive(profile, checkins, [], t),
      research: false,
      actions: NO_ACTIONS,
    };
  }, []);
  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}
