import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGarden } from '../data/store';
import { addDays, daysBetween, dayMonth, parseISODate, prettyDate } from '../engine/dates';
import { levelsAt, mess, tier } from '../engine/metrics';
import { reportStories, weekStart } from '../engine/stories';
import type { Levels } from '../engine/types';
import { Garden } from '../garden/Garden';
import { gardenSVG } from '../garden/draw';
import { download } from '../lib/files';
import { Companion, usePageTitle, useToast } from '../ui/common';

/** PNG of the garden picture plus its name. No numbers, apps or messages. */
async function gardenCard(levels: Levels, name: string): Promise<Blob> {
  const W = 1080, H = 1240;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#f6f5f4';
  x.fillRect(0, 0, W, H);
  const svg = gardenSVG(levels, 7, 'width="1200" height="1200"');
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('The garden picture could not be drawn. Try again.'));
      img.src = url;
    });
    x.save();
    x.beginPath();
    x.roundRect(60, 60, 960, 960, 28);
    x.clip();
    x.drawImage(img, 60, 60, 960, 960);
    x.restore();
  } finally {
    URL.revokeObjectURL(url);
  }
  try {
    await document.fonts.load('700 56px Inter');
  } catch {
    /* fall back to system font */
  }
  x.fillStyle = '#0d0d0d';
  x.font = '700 56px Inter, -apple-system, Helvetica, Arial, sans-serif';
  x.fillText(name, 60, 1110);
  x.fillStyle = '#757575';
  x.font = '400 30px Inter, -apple-system, Helvetica, Arial, sans-serif';
  x.fillText('Your Garden Knows', 60, 1165);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('The garden card could not be made. Try again.'))), 'image/png'));
}

export function Report() {
  usePageTitle('Weekly report');
  const g = useGarden();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const to = g.gardenDate;
  const from = weekStart(to);
  const ready = g.dataDays.length >= 7;
  const checkins = Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => addDays(from, i)).filter((d) => g.days.has(d)).length;
  const range = daysBetween(from, to) + 1;
  const before = useMemo(() => levelsAt(g.days, g.normal, from), [g.days, g.normal, from]);
  const stories = useMemo(() => (ready ? reportStories(g.days, g.normal, from, to) : []), [ready, g.days, g.normal, from, to]);
  const name = g.profile!.gardenName;

  if (!ready) {
    const arrives = addDays(g.today, 7 - g.dataDays.length);
    return (
      <main className="page narrow" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ display: 'grid', placeItems: 'center' }} aria-hidden="true">
          <Companion size={110} />
        </div>
        <h1 style={{ marginTop: 20 }}>Your first report arrives on {prettyDate(arrives)}.</h1>
        <p className="lede" style={{ margin: '12px auto 0' }}>
          A report needs seven days in the garden. You have {g.dataDays.length} so far{g.dataDays.length ? ', so keep checking in' : ''}.
        </p>
        <div className="btnrow" style={{ justifyContent: 'center', marginTop: 24 }}>
          <Link to="/check-in" className="btn">
            Check in
          </Link>
          <Link to="/garden" className="btn ghost">
            Back to my garden
          </Link>
        </div>
      </main>
    );
  }

  const share = async () => {
    setBusy(true);
    try {
      const blob = await gardenCard(g.levels, name);
      const file = new File([blob], 'my-garden.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name }).catch(() => {});
      } else {
        download('my-garden.png', blob, 'image/png');
        toast('Garden card saved as my-garden.png.');
      }
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  const fromDate = parseISODate(from);
  const rangeText = `${fromDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' })} to ${parseISODate(to).toLocaleDateString('en-AU', { weekday: 'short' })} ${dayMonth(to)}`;
  return (
    <main className="page">
      <h1>Your week in the garden.</h1>
      <p className="lede">
        {rangeText} · {checkins} of {range} check-ins
      </p>
      <div className="grid-2" style={{ marginTop: 32, maxWidth: 880 }}>
        {(
          [
            ['Last Sunday', before],
            ['Today', g.levels],
          ] as const
        ).map(([label, l]) => (
          <figure key={label} style={{ margin: 0 }}>
            <Garden levels={l} name={`${name}, ${label.toLowerCase()}`} animate={false} />
            <figcaption style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <b style={{ color: 'var(--ink)' }}>{label}</b>
              <span className={'tier ' + tier(mess(l))} style={{ height: 26, fontSize: 13 }}>
                {tier(mess(l))}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="grid-3" style={{ marginTop: 32 }}>
        {stories.map((s, i) => (
          <article key={s.kind} className={'rcard ' + ['red', 'blue', 'yellow'][i]}>
            <p className="ey">{s.eyebrow}</p>
            <h2 className="ti" style={{ color: '#fff' }}>
              {s.title}
            </h2>
            <p className="bo">{s.body}</p>
          </article>
        ))}
      </div>
      <div className="btnrow" style={{ marginTop: 32 }}>
        <Link to="/tidy-up" className="btn ghost">
          Plan next week
        </Link>
        <button type="button" className="btn" onClick={share} disabled={busy}>
          Share my garden card
        </button>
      </div>
      <p className="caption" style={{ marginTop: 12 }}>
        The garden card shows the picture only. No numbers, apps or messages are ever included.
      </p>
    </main>
  );
}
