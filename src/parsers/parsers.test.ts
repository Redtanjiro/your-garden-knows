import { describe, expect, it } from 'vitest';
import { parseVideoFile, videoDaily } from './video';
import { detectOrder, isChain, isHeadlineOnly, parseWhatsApp, people, waDaily } from './whatsapp';

const IOS = [
  '[04/11/2026, 8:01:10 am] Messages and calls are end-to-end encrypted.',
  '[04/11/2026, 8:02:00 am] Neel: on my way 😂',
  '[04/11/2026, 8:03:00 am] Priya: Dinner Sunday?',
  'second line of Priya',
  '[05/11/2026, 9:00:00 pm] Neel: https://example.com/news/shark',
  '[05/11/2026, 9:05:00 pm] Uncle Raj: URGENT: banks closing Monday, please share',
  '[05/11/2026, 9:06:00 pm] Neel: Forwarded as received: drink hot water. please share',
  '[06/11/2026, 7:00:00 am] Priya: morning',
  '[06/11/2026, 7:01:00 am] Mei: hi',
].join('\n');

const ANDROID = [
  '11/24/26, 14:01 - Neel: haha 🤣🤣',
  '11/24/26, 14:02 - Sam: ok',
  '11/25/26, 09:00 - Sam: who is driving',
].join('\n');

describe('WhatsApp', () => {
  it('parses iOS lines, continuations and ignores system lines', () => {
    const { msgs, order } = parseWhatsApp(IOS);
    expect(order).toBe('dmy');
    expect(msgs).toHaveLength(7);
    expect(msgs[1].text).toBe('Dinner Sunday?\nsecond line of Priya');
    expect(new Date(msgs[0].ts).getMonth()).toBe(10); // November
    expect(people(msgs)[0]).toBe('Neel');
  });
  it('parses Android lines and detects month-first', () => {
    expect(detectOrder(ANDROID)).toBe('mdy');
    const { msgs } = parseWhatsApp(ANDROID);
    expect(msgs).toHaveLength(3);
    expect(new Date(msgs[0].ts).getDate()).toBe(24);
    expect(new Date(msgs[0].ts).getHours()).toBe(14);
  });
  it('strips direction marks and odd spaces', () => {
    const { msgs } = parseWhatsApp('‎[04/11/2026, 8:02:00 am] Neel: hi');
    expect(msgs).toHaveLength(1);
  });
  it('classifies headline-only and chain messages', () => {
    expect(isHeadlineOnly('https://x.com/a')).toBe(true);
    expect(isHeadlineOnly('lol https://x.com/a')).toBe(true);
    expect(isHeadlineOnly('read this one https://x.com/a')).toBe(false);
    expect(isChain('Pass it on to 10 people')).toBe(true);
    expect(isChain('x'.repeat(401))).toBe(true);
    expect(isChain('see you at 6')).toBe(false);
  });
  it('builds per-day metrics for the chosen person', () => {
    const { msgs } = parseWhatsApp(IOS);
    const r = waDaily(msgs, 'Neel');
    expect(r.from).toBe('2026-11-04');
    expect(r.to).toBe('2026-11-06');
    expect(r.daily['2026-11-05']).toMatchObject({ headline: 1, forwards: 1, seen: 0 });
    expect(r.daily['2026-11-04'].laugh).toBe(100);
    expect(r.daily['2026-11-06']).toMatchObject({ seen: 2, headline: 0 });
    expect(r.daily['2026-11-06'].laugh).toBeUndefined();
    expect(r.totals.seen).toBe(2);
  });
});

describe('Video history', () => {
  it('reads TikTok JSON under Your Activity', () => {
    const json = JSON.stringify({ 'Your Activity': { 'Video Browsing History': { VideoList: [{ Date: '2026-11-04 07:00:00' }, { Date: '2026-11-04 07:01:00' }, { Date: '2026-11-06 07:00:00' }] } } });
    const r = parseVideoFile('user_data_tiktok.json', json)!;
    expect(r.kind).toBe('tiktok');
    const d = videoDaily(r.kind, r.dates);
    expect(d.days).toBe(3);
    expect(d.daily['2026-11-04'].thumb).toBeCloseTo(0.28);
    expect(d.daily['2026-11-05'].thumb).toBe(0);
  });
  it('reads TikTok TXT', () => {
    const r = parseVideoFile('Watch History.txt', 'Date: 2026-11-04 07:00:00\nLink: x\n\nDate: 2026-11-04 08:00:00\nLink: y')!;
    expect(r.dates).toHaveLength(2);
  });
  it('reads Instagram videos_watched.json', () => {
    const json = JSON.stringify({ impressions_history_videos_watched: [{ string_map_data: { Time: { timestamp: 1762240000 } } }] });
    expect(parseVideoFile('videos_watched.json', json)!.kind).toBe('instagram');
  });
  it('returns null when there is no history', () => {
    expect(parseVideoFile('user_data.json', '{"Profile":{}}')).toBeNull();
  });
});
