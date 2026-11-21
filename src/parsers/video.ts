// Port of findVideoDates() / parseVideos() from the prototype.
import JSZip from 'jszip';
import { toISODate } from '../engine/dates';
import { SWIPE_M } from '../engine/metrics';
import type { Metrics } from '../engine/types';

export const ERR = {
  noMessages: (f: string) => `We couldn't find any messages in "${f}". Is it a WhatsApp chat export?`,
  noHistory: (f: string) => `We couldn't find watch history in "${f}". Inside the download, look for user_data_tiktok.json or Watch History.txt, then try again.`,
  zipEmpty: "There's no .txt or .json inside that zip.",
};

export type VideoKind = 'tiktok' | 'instagram';

function parseDateish(v: unknown): number {
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  const s = String(v ?? '').trim();
  if (!s) return NaN;
  // "2026-11-04 07:12:09" is local time; treat it as such
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  return Date.parse(s);
}

/** TikTok: Video Browsing History → VideoList[].Date under Activity / Your Activity. Instagram: impressions_history_videos_watched[].…timestamp */
export function findVideoDates(obj: unknown): { kind: VideoKind; dates: number[] } | null {
  let out: { kind: VideoKind; dates: number[] } | null = null;
  const walk = (o: unknown) => {
    if (out || !o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (/video browsing history|watch history/i.test(k) && v && typeof v === 'object') {
        const vv = v as Record<string, unknown>;
        const list = (vv.VideoList ?? vv.videoList ?? v) as unknown;
        if (Array.isArray(list)) {
          out = { kind: 'tiktok', dates: list.map((x) => parseDateish((x as Record<string, unknown>)?.Date ?? (x as Record<string, unknown>)?.date)).filter(isFinite) };
          return;
        }
      }
      if (/impressions_history_videos_watched|videos_watched/i.test(k) && Array.isArray(v)) {
        const dates: number[] = [];
        for (const item of v) {
          let t: number | null = null;
          const w = (x: unknown) => {
            if (t !== null || !x || typeof x !== 'object') return;
            const r = x as Record<string, unknown>;
            if (typeof r.timestamp === 'number') t = r.timestamp * 1000;
            else Object.values(r).forEach(w);
          };
          w(item);
          if (t !== null) dates.push(t);
        }
        out = { kind: 'instagram', dates };
        return;
      }
      walk(v);
    }
  };
  walk(obj);
  return out;
}

export function parseVideoFile(name: string, text: string): { kind: VideoKind; dates: number[] } | null {
  if (/\.json$/i.test(name) || /^\s*[[{]/.test(text)) {
    try {
      const r = findVideoDates(JSON.parse(text));
      return r && r.dates.length ? r : null;
    } catch {
      return null;
    }
  }
  const dates = [...text.matchAll(/Date:\s*(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/g)].map((m) => parseDateish(m[1])).filter(isFinite);
  return dates.length ? { kind: 'tiktok', dates } : null;
}

export interface VideoResult {
  kind: VideoKind;
  n: number;
  from: string;
  to: string;
  days: number;
  perDay: number;
  daily: Record<string, Partial<Metrics>>;
}
export function videoDaily(kind: VideoKind, dates: number[]): VideoResult {
  const counts: Record<string, number> = {};
  for (const t of dates) {
    const d = toISODate(new Date(t));
    counts[d] = (counts[d] ?? 0) + 1;
  }
  const keys = Object.keys(counts).sort();
  const from = keys[0];
  const to = keys[keys.length - 1];
  const daily: Record<string, Partial<Metrics>> = {};
  for (let d = new Date(from + 'T00:00'); toISODate(d) <= to; d.setDate(d.getDate() + 1)) {
    const k = toISODate(d);
    daily[k] = { thumb: (counts[k] ?? 0) * SWIPE_M };
  }
  const days = Object.keys(daily).length;
  return { kind, n: dates.length, from, to, days, perDay: dates.length / days, daily };
}

/** Read a dropped file; for a zip, pick the matching inner file. */
export async function readExport(file: File, pick: (name: string) => boolean): Promise<{ name: string; text: string }> {
  if (/\.zip$/i.test(file.name)) {
    const zip = await JSZip.loadAsync(file);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir && !/(^|\/)__MACOSX\//.test(n));
    const n = names.find(pick) || names.find((x) => /\.(txt|json)$/i.test(x));
    if (!n) throw new Error(ERR.zipEmpty);
    return { name: n.split('/').pop()!, text: await zip.files[n].async('string') };
  }
  return { name: file.name, text: await file.text() };
}
