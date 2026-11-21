// Client for the cul-de-sac sync service (handoff section 9).
// Only garden picture state is ever sent: six levels 0..10, the garden name,
// the last check-in date and the visible flag.
import type { Levels } from '../engine/types';

export interface StreetMember {
  memberId: string;
  gardenName: string;
  levels: Levels; // integers 0..10
  prevLevels?: Levels; // a week ago, for the feed
  lastCheckIn: string | null;
  visible: boolean;
}
export interface StreetView {
  streetId: string;
  slug: string;
  name: string;
  code: string;
  members: StreetMember[];
  wavesToday: string[]; // memberIds you've waved at today
  wavesForYou: { from: string; date: string }[];
  sample: boolean; // true when neighbours are sample gardens (local mock)
}
export interface Joined {
  streetId: string;
  slug: string;
  code: string;
  name: string;
  memberId: string;
  token: string;
}
export interface MemberState {
  gardenName: string;
  levels: Levels;
  lastCheckIn: string | null;
}

export interface StreetApi {
  readonly live: boolean;
  create(name: string, me: MemberState): Promise<Joined>;
  join(code: string, me: MemberState): Promise<Joined>;
  get(slug: string, auth: { memberId: string; token: string }): Promise<StreetView>;
  update(slug: string, auth: { memberId: string; token: string }, body: { levels: Levels; lastCheckIn: string | null; visible: boolean; gardenName?: string }): Promise<void>;
  wave(slug: string, auth: { memberId: string; token: string }, to: string): Promise<void>;
  leave(slug: string, auth: { memberId: string; token: string }): Promise<void>;
}

export class StreetError extends Error {}

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'street';
}
const rand = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');

/* ---------------- HTTP client against the real service ---------------- */
class HttpStreetApi implements StreetApi {
  readonly live = true;
  constructor(private base: string) {}
  private async req<T>(method: string, path: string, body?: unknown, tok?: string): Promise<T> {
    const r = await fetch(this.base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (r.status === 429) throw new StreetError('Too many tries in a short time. Wait a minute, then try again.');
    if (r.status === 409) throw new StreetError('That street already has 8 gardens, which is the most a street can hold.');
    if (r.status === 404) throw new StreetError('That invite link doesn’t match a street. Ask for a fresh link.');
    if (!r.ok) throw new StreetError(`The street service didn’t answer (${r.status}). Check your connection, then try again.`);
    return r.status === 204 ? (undefined as T) : r.json();
  }
  async create(name: string, me: MemberState) {
    const r = await this.req<Omit<Joined, 'name'>>('POST', '/streets', { name, gardenName: me.gardenName, levels: me.levels });
    return { ...r, name };
  }
  async join(code: string, me: MemberState) {
    return this.req<Joined>('POST', `/streets/join/${encodeURIComponent(code)}`, { gardenName: me.gardenName, levels: me.levels });
  }
  async get(slug: string, a: { memberId: string; token: string }) {
    const r = await this.req<Omit<StreetView, 'sample'>>('GET', `/streets/${slug}`, undefined, a.token);
    return { ...r, sample: false };
  }
  update(slug: string, a: { memberId: string; token: string }, body: object) {
    return this.req<void>('PUT', `/streets/${slug}/members/${a.memberId}`, body, a.token);
  }
  wave(slug: string, a: { memberId: string; token: string }, to: string) {
    return this.req<void>('POST', `/streets/${slug}/waves`, { to }, a.token);
  }
  leave(slug: string, a: { memberId: string; token: string }) {
    return this.req<void>('DELETE', `/streets/${slug}/members/${a.memberId}`, undefined, a.token);
  }
}

/* ---------------- Local mock: same contract, stored in this browser ---------------- */
interface MockStreet {
  streetId: string;
  slug: string;
  name: string;
  code: string;
  createdAt: string;
  members: (StreetMember & { token: string })[];
  waves: { from: string; to: string; date: string }[];
}
const KEY = 'ygk-street-mock';
const L = (thumb: number, headline: number, forwards: number, potato: number, laugh: number, seen: number): Levels => ({ thumb, headline, forwards, potato, laugh, seen });
const SAMPLE: Omit<StreetMember, 'memberId'>[] = [
  { gardenName: 'Priya', levels: L(2, 1, 0, 2, 4, 1), prevLevels: L(3, 2, 0, 2, 4, 7), lastCheckIn: '0', visible: true },
  { gardenName: 'Uncle Raj', levels: L(7, 8, 9, 6, 4, 3), prevLevels: L(7, 7, 8, 6, 4, 3), lastCheckIn: '1', visible: true },
  { gardenName: 'Mei', levels: L(5, 3, 1, 4, 10, 6), prevLevels: L(5, 3, 1, 4, 8, 6), lastCheckIn: '0', visible: true },
  { gardenName: 'Dad', levels: L(2, 3, 2, 2, 2, 3), prevLevels: L(3, 3, 2, 3, 2, 3), lastCheckIn: '0', visible: true },
  { gardenName: 'Sam', levels: L(8, 5, 3, 9, 6, 9), prevLevels: L(7, 5, 3, 8, 6, 8), lastCheckIn: '3', visible: true },
];
const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

class MockStreetApi implements StreetApi {
  readonly live = false;
  private load(): MockStreet[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }
  private save(s: MockStreet[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      throw new StreetError("This browser is blocking storage, so your garden can't be saved. Try a normal (not private) window.");
    }
  }
  private auth(st: MockStreet, a: { memberId: string; token: string }) {
    const m = st.members.find((x) => x.memberId === a.memberId);
    if (!m || m.token !== a.token) throw new StreetError('This browser isn’t a member of that street any more.');
    return m;
  }
  private seeded(name: string, code: string): MockStreet {
    return {
      streetId: rand(10),
      slug: slugify(name),
      name,
      code,
      createdAt: new Date().toISOString(),
      members: SAMPLE.map((s) => ({ ...s, memberId: rand(8), token: token(), lastCheckIn: isoDay(Number(s.lastCheckIn)) })),
      waves: [],
    };
  }
  private addMe(st: MockStreet, me: MemberState): Joined {
    if (st.members.length >= 8) throw new StreetError('That street already has 8 gardens, which is the most a street can hold.');
    const m = { memberId: rand(8), token: token(), gardenName: me.gardenName, levels: me.levels, lastCheckIn: me.lastCheckIn, visible: true };
    st.members.push(m);
    return { streetId: st.streetId, slug: st.slug, code: st.code, name: st.name, memberId: m.memberId, token: m.token };
  }
  async create(name: string, me: MemberState) {
    const all = this.load().filter((s) => s.members.length);
    const st = this.seeded(name, `${slugify(name).split('-')[0].slice(0, 10)}-${rand(3)}`);
    while (all.some((s) => s.slug === st.slug)) st.slug = `${slugify(name)}-${rand(2)}`;
    const j = this.addMe(st, me);
    this.save([...all, st]);
    return j;
  }
  async join(code: string, me: MemberState) {
    const all = this.load();
    let st = all.find((s) => s.code === code);
    if (!st) {
      // Without the live service the street lives in another browser; start a local copy.
      const base = code.split('-')[0] || 'our';
      st = this.seeded(base.charAt(0).toUpperCase() + base.slice(1) + ' Close', code);
      all.push(st);
    }
    const j = this.addMe(st, me);
    this.save(all);
    return j;
  }
  async get(slug: string, a: { memberId: string; token: string }) {
    const st = this.load().find((s) => s.slug === slug);
    if (!st) throw new StreetError('That street doesn’t exist any more.');
    this.auth(st, a);
    const t = isoDay();
    return {
      streetId: st.streetId,
      slug: st.slug,
      name: st.name,
      code: st.code,
      members: st.members.map(({ token: _t, ...m }) => m),
      wavesToday: st.waves.filter((w) => w.from === a.memberId && w.date === t).map((w) => w.to),
      wavesForYou: st.waves.filter((w) => w.to === a.memberId).map((w) => ({ from: w.from, date: w.date })),
      sample: true,
    };
  }
  async update(slug: string, a: { memberId: string; token: string }, body: { levels: Levels; lastCheckIn: string | null; visible: boolean; gardenName?: string }) {
    const all = this.load();
    const st = all.find((s) => s.slug === slug);
    if (!st) return;
    const m = this.auth(st, a);
    Object.assign(m, { levels: body.levels, lastCheckIn: body.lastCheckIn, visible: body.visible }, body.gardenName ? { gardenName: body.gardenName } : {});
    this.save(all);
  }
  async wave(slug: string, a: { memberId: string; token: string }, to: string) {
    const all = this.load();
    const st = all.find((s) => s.slug === slug);
    if (!st) return;
    this.auth(st, a);
    const date = isoDay();
    if (st.waves.some((w) => w.from === a.memberId && w.to === to && w.date === date))
      throw new StreetError('You’ve already waved at them today. Wave again tomorrow.');
    st.waves.push({ from: a.memberId, to, date });
    this.save(all);
  }
  async leave(slug: string, a: { memberId: string; token: string }) {
    const all = this.load();
    const st = all.find((s) => s.slug === slug);
    if (!st) return;
    st.members = st.members.filter((m) => m.memberId !== a.memberId);
    // The local copy only has sample neighbours left, so it goes with you.
    this.save(all.filter((s) => s !== st));
  }
}

const base = import.meta.env.VITE_STREET_API_URL as string | undefined;
export const streetApi: StreetApi = base ? new HttpStreetApi(base.replace(/\/$/, '')) : new MockStreetApi();
