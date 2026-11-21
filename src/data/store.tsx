import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { today as todayStr } from '../engine/dates';
import { gardenDate, levelsAt, normalMetrics, resolveDays, streetLevels, ZERO_LEVELS, dataDates } from '../engine/metrics';
import type { Challenge, ChallengeType, CheckIn, DayData, ImportRecord, Levels, Metrics, Profile, RawDay, StreetMembership } from '../engine/types';
import { challengeMeta } from '../engine/meta';
import { streetApi } from '../street/api';
import { db, safe, storageWorks, wipeEverything } from './db';

export interface GardenData {
  ready: boolean;
  storageBlocked: boolean;
  readOnly: boolean;
  profile?: Profile;
  checkins: CheckIn[];
  imports: ImportRecord[];
  challenges: Challenge[];
  street?: StreetMembership;
  today: string;
  gardenDate: string;
  days: Map<string, DayData>;
  normal: Metrics;
  levels: Levels;
  dataDays: string[];
  research: boolean;
  actions: Actions;
}

export interface Actions {
  createProfile(p: Omit<Profile, 'id' | 'createdAt' | 'paused'>, firstCheckIn: boolean): Promise<void>;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  saveCheckIn(date: string, raw: RawDay): Promise<void>;
  saveImports(records: ImportRecord[], avgSteps: number | undefined): Promise<void>;
  startChallenge(type: ChallengeType): Promise<void>;
  logChallenge(id: string): Promise<'logged' | 'done'>;
  stopChallenge(id: string): Promise<void>;
  setStreet(m: StreetMembership | null): Promise<void>;
  logResearch(kind: 'checkin' | 'receipt', detail: string): Promise<void>;
  setResearch(on: boolean): Promise<void>;
  deleteEverything(): Promise<void>;
}

const Ctx = createContext<GardenData | null>(null);
export function useGarden(): GardenData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGarden outside provider');
  return v;
}
export const GardenContext = Ctx;

export function derive(profile: Profile | undefined, checkins: CheckIn[], imports: ImportRecord[], t: string) {
  const days = resolveDays(checkins, imports, profile);
  const normal = normalMetrics(profile?.normal ?? { shortVideoMinutes: 45, steps: 6000, linksUnopened: 1, forwards: 0, laughPer10: 1, unread: 20 });
  const gd = gardenDate(profile, t);
  const dd = dataDates(days).filter((d) => d <= t);
  const levels = dd.length ? levelsAt(days, normal, gd) : ZERO_LEVELS;
  return { days, normal, gardenDate: gd, levels, dataDays: dd };
}

function useToday() {
  const [t, setT] = useState(todayStr());
  useEffect(() => {
    const id = setInterval(() => setT(todayStr()), 60_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export function GardenProvider({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    storageWorks().then((ok) => {
      setBlocked(!ok);
      setOpened(true);
    });
  }, []);
  const t = useToday();

  // null = not loaded yet; 'none' = loaded and empty
  const profile = useLiveQuery(async () => (opened && !blocked ? ((await db.profile.get('me')) ?? 'none') : null), [opened, blocked], null);
  const checkins = useLiveQuery(() => (opened && !blocked ? db.checkins.toArray() : []), [opened, blocked], []);
  const imports = useLiveQuery(() => (opened && !blocked ? db.imports.toArray() : []), [opened, blocked], []);
  const challenges = useLiveQuery(() => (opened && !blocked ? db.challenges.toArray() : []), [opened, blocked], []);
  const street = useLiveQuery(async () => (opened && !blocked ? ((await db.street.get('street')) ?? 'none') : null), [opened, blocked], null);
  const research = useLiveQuery(async () => (opened && !blocked ? Boolean((await db.settings.get('research'))?.value) : false), [opened, blocked], false);

  const ready = opened && (blocked || (profile !== null && street !== null));
  const prof = profile && profile !== 'none' ? profile : undefined;
  const derived = useMemo(() => derive(prof, checkins, imports, t), [prof, checkins, imports, t]);

  // Keep the street's copy of the garden picture current: levels 0..10 only.
  const streetRef = useRef<string>('');
  const memb = street && street !== 'none' ? street : undefined;
  useEffect(() => {
    if (!memb || !prof) return;
    const body = { levels: streetLevels(derived.levels), lastCheckIn: derived.dataDays[0] ?? null, visible: memb.visible, gardenName: prof.gardenName };
    const sig = JSON.stringify(body);
    if (sig === streetRef.current) return;
    streetRef.current = sig;
    streetApi.update(memb.slug, memb, body).catch((e) => console.warn('street sync', e));
  }, [memb, prof, derived]);

  const actions: Actions = useMemo(
    () => ({
      async createProfile(p, firstCheckIn) {
        await safe(async () => {
          const now = new Date().toISOString();
          await db.profile.put({ ...p, id: 'me', paused: false, createdAt: now });
          if (firstCheckIn && !(await db.checkins.get(todayStr())))
            await db.checkins.put({ ...p.normal, date: todayStr(), source: 'checkin', savedAt: now });
        });
      },
      async updateProfile(patch) {
        await safe(() => db.profile.update('me', patch));
      },
      async saveCheckIn(date, raw) {
        await safe(() => db.checkins.put({ ...raw, date, source: 'checkin', savedAt: new Date().toISOString() }));
      },
      async saveImports(records, avgSteps) {
        await safe(async () => {
          for (const r of records) {
            // one WhatsApp chat and one watch history at a time
            const kinds = r.kind === 'whatsapp' ? ['whatsapp'] : ['tiktok', 'instagram'];
            await db.imports.where('kind').anyOf(kinds).delete();
            await db.imports.put(r);
          }
          if (avgSteps !== undefined) await db.profile.update('me', { avgSteps });
        });
      },
      async startChallenge(type) {
        await safe(async () => {
          const active = await db.challenges.where('status').equals('active').count();
          if (active) return;
          await db.challenges.put({ id: crypto.randomUUID(), type, startedOn: todayStr(), days: challengeMeta(type).days, log: [], status: 'active' });
        });
      },
      async logChallenge(id) {
        return safe(async () => {
          const c = await db.challenges.get(id);
          if (!c) return 'logged' as const;
          const log = c.log.includes(todayStr()) ? c.log : [...c.log, todayStr()];
          const done = log.length >= c.days;
          await db.challenges.update(id, { log, status: done ? 'done' : 'active' });
          return done ? ('done' as const) : ('logged' as const);
        });
      },
      async stopChallenge(id) {
        await safe(() => db.challenges.update(id, { status: 'stopped' }));
      },
      async setStreet(m) {
        await safe(async () => {
          if (m) await db.street.put(m);
          else await db.street.delete('street');
        });
      },
      async logResearch(kind, detail) {
        await safe(async () => {
          if (!(await db.settings.get('research'))?.value) return;
          await db.research.add({ at: new Date().toISOString(), kind, date: todayStr(), detail });
        });
      },
      async setResearch(on) {
        await safe(() => db.settings.put({ key: 'research', value: on }));
      },
      async deleteEverything() {
        const s = await db.street.get('street').catch(() => undefined);
        if (s) await streetApi.leave(s.slug, s).catch((e) => console.warn('leave street', e));
        await wipeEverything();
        try {
          localStorage.removeItem('ygk-onboarding');
          localStorage.removeItem('ygk-pending-join');
        } catch {
          /* storage blocked: nothing stored there */
        }
      },
    }),
    [],
  );

  const value: GardenData = {
    ready,
    storageBlocked: blocked,
    readOnly: false,
    profile: prof,
    checkins,
    imports,
    challenges,
    street: street && street !== 'none' ? street : undefined,
    today: t,
    ...derived,
    research,
    actions,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** A hook for "write, then toast or show the storage message". */
export function useAction() {
  return useCallback(async <T,>(fn: () => Promise<T>, onError: (msg: string) => void): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      return undefined;
    }
  }, []);
}
