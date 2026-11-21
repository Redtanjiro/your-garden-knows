import Dexie, { type Table } from 'dexie';
import type { Challenge, CheckIn, ImportRecord, Profile, StreetMembership } from '../engine/types';

export interface ResearchRow {
  id?: number;
  at: string;
  kind: 'checkin' | 'receipt';
  date: string;
  detail: string; // CSV-ready fields joined later
}
export interface Setting {
  key: string;
  value: unknown;
}

class GardenDB extends Dexie {
  profile!: Table<Profile, string>;
  checkins!: Table<CheckIn, string>;
  imports!: Table<ImportRecord, string>;
  challenges!: Table<Challenge, string>;
  street!: Table<StreetMembership, string>;
  research!: Table<ResearchRow, number>;
  settings!: Table<Setting, string>;
  constructor() {
    super('your-garden-knows');
    this.version(1).stores({
      profile: 'id',
      checkins: 'date',
      imports: 'id, kind',
      challenges: 'id, status',
      street: 'id',
      research: '++id, at',
      settings: 'key',
    });
  }
}

export const db = new GardenDB();

export const STORAGE_BLOCKED =
  "This browser is blocking storage, so your garden can't be saved. Try a normal (not private) window.";

export class StorageBlockedError extends Error {
  constructor() {
    super(STORAGE_BLOCKED);
  }
}

/** Run a storage call; any failure becomes the one clear storage message. */
export async function safe<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    throw new StorageBlockedError();
  }
}

export async function storageWorks(): Promise<boolean> {
  try {
    await db.open();
    await db.settings.put({ key: '_probe', value: Date.now() });
    return true;
  } catch {
    return false;
  }
}

export async function wipeEverything() {
  await safe(async () => {
    await db.delete();
    await db.open();
  });
}
