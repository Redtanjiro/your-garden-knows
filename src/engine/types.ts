export type MetricKey = 'thumb' | 'headline' | 'forwards' | 'potato' | 'laugh' | 'seen';
export const KEYS: MetricKey[] = ['thumb', 'headline', 'forwards', 'potato', 'laugh', 'seen'];

export type Metrics = Record<MetricKey, number>;
export type Levels = Record<MetricKey, number>;

export interface RawDay {
  shortVideoMinutes: number; // 0..600
  steps: number; // 0..50000
  linksUnopened: number; // 0..50
  forwards: number; // 0..50
  laughPer10: number; // 0..10, step 0.5
  unread: number; // 0..999
}

export interface Reminder {
  time: '09:00' | '20:00' | null;
  calendarAdded: boolean;
  inApp: boolean;
}

export interface Profile {
  id: 'me';
  gardenName: string;
  normal: RawDay;
  dataMode: 'checkin' | 'exports' | 'both';
  reminder: Reminder;
  paused: boolean;
  pausedOn?: string; // YYYY-MM-DD, levels freeze here
  avgSteps?: number; // from the exports screen, used when a day has no check-in steps
  createdAt: string;
}

export interface CheckIn extends RawDay {
  date: string; // YYYY-MM-DD
  source: 'checkin' | 'export' | 'merged';
  savedAt: string;
}

export interface ImportRecord {
  id: string;
  kind: 'whatsapp' | 'tiktok' | 'instagram';
  fileName: string;
  coverage: { from: string; to: string };
  selfName?: string;
  summary?: string;
  daily: Record<string, Partial<Metrics>>;
  importedAt: string;
}

export type ChallengeType =
  | 'open-before-share'
  | 'phone-free-hour'
  | 'clear-letterbox'
  | 'check-forward'
  | 'walk-it-off';

export interface Challenge {
  id: string;
  type: ChallengeType;
  startedOn: string;
  days: number;
  log: string[];
  status: 'active' | 'done' | 'stopped';
}

export interface StreetMembership {
  id: 'street';
  streetId: string;
  slug: string;
  name: string;
  code: string;
  groupLabel?: string;
  memberId: string;
  token: string;
  visible: boolean;
  joinedAt: string;
}

/** One resolved day: metric values plus where each came from. */
export interface DayData {
  date: string;
  metrics: Partial<Metrics>;
  sources: Partial<Record<MetricKey, 'checkin' | 'whatsapp' | 'tiktok' | 'instagram'>>;
  raw?: CheckIn; // the check-in behind it, if any
}
