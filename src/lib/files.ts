export function download(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** A daily repeating calendar event that links to the check-in screen. */
export function reminderICS(time: '09:00' | '20:00', checkInUrl: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const [h, m] = time.split(':');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Your Garden Knows//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:ygk-reminder-${date}-${time.replace(':', '')}@yourgardenknows`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${date}T${h}${m}00`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:Your garden is waiting. Two minutes to check in?',
    `DESCRIPTION:Check in: ${checkInUrl}`,
    `URL:${checkInUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your garden is waiting',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function csv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(',')).join('\n') + '\n';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Absolute URL for an in-app path, respecting the deploy base. */
export function appUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${location.origin}${base}${path}`;
}

/** Local storage helpers that never throw. */
export const local = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* blocked: keep in memory only */
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* blocked */
    }
  },
};
