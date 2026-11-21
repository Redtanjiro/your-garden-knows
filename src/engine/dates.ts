// All dates are local calendar days as YYYY-MM-DD strings.
const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function today(): string {
  return toISODate(new Date());
}
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 864e5);
}
export function weekday(s: string, style: 'short' | 'long' = 'short'): string {
  return parseISODate(s).toLocaleDateString('en-AU', { weekday: style });
}
export function prettyDate(s: string): string {
  return parseISODate(s).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}
export function dayMonth(s: string): string {
  return parseISODate(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}
export function timeOf(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    .replace(/\s?([ap])\.?m\.?/i, (_, a) => ` ${a.toLowerCase()}m`);
}

/** Local calendar date of an ISO timestamp. */
export function localDate(iso: string): string {
  return toISODate(new Date(iso));
}
