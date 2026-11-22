import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGarden } from '../data/store';
import { addDays, daysBetween, dayMonth, parseISODate, prettyDate } from '../engine/dates';
import { levelsAt, mess, tier } from '../engine/metrics';
import { KEYS, type MetricKey } from '../engine/types';
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
  x.fillStyle = '#c7f8fb';
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
    x.drawImage(img, 60, 60, 960, 960);
  } finally {
    URL.revokeObjectURL(url);
  }
  try {
    await document.fonts.load('400 64px "Inter Tight"');
  } catch {
    /* fall back to system font */
  }
  x.fillStyle = '#0f0f0f';
  x.font = '400 64px "Inter Tight", Inter, -apple-system, Helvetica, Arial, sans-serif';
  x.fillText(name, 60, 1115);
  x.font = '400 30px "Inter Tight", Inter, -apple-system, Helvetica, Arial, sans-serif';
  x.fillText('Your Garden Knows', 60, 1170);
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
  // Which metric each story is about, so its card takes that metric's colour (the engine's own ordering).
  const storyMetric = useMemo(() => {
    const b = g.levels;
    const d = KEYS.map((k) => ({ k, d: levelsAt(g.days, g.normal, to)[k] - before[k] })).sort((x, y) => y.d - x.d);
    void b;
    return { grower: d[0].k, tidy: d[d.length - 1].k, silly: 'thumb' as MetricKey };
  }, [g.days, g.normal, to, before, g.levels]);

  if (!ready) {
    const arrives = addDays(g.today, 7 - g.dataDays.length);
    return (
      <main className="page narrow" style={{ paddingTop: 64 }}>
        <div aria-hidden="true">
          <Companion size={110} />
        </div>
        <h1 style={{ marginTop: 24 }}>
          Your first report arrives on <span className="mono">{prettyDate(arrives)}</span>.
        </h1>
        <p className="lede">
          A report needs seven days in the garden. You have <span className="mono">{g.dataDays.length}</span> so far{g.dataDays.length ? ', so keep checking in' : ''}.
        </p>
        <div className="btnrow" style={{ marginTop: 28 }}>
          <Link to="/check-in" className="btn">
            Check in
          </Link>
          <Link to="/garden" className="btn outline">
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
    <main>
      <section className="band obsidian report-head">
        <div className="wrap" style={{ paddingTop: 56, paddingBottom: 48 }}>
          <h1 className="display-l">Your week</h1>
          <p className="mono" style={{ marginTop: 20, color: '#e9e9e9' }}>
            {rangeText} · {checkins} of {range} check-ins
          </p>
        </div>
      </section>
      <div className="page" style={{ paddingTop: 40, paddingBottom: 0 }}>
        <div className="grid-2" style={{ maxWidth: 880 }}>
          {(
            [
              ['Last Sunday', before],
              ['Today', g.levels],
            ] as const
          ).map(([label, l]) => (
            <figure key={label} className="pair-fig">
              <Garden levels={l} name={`${name}, ${label.toLowerCase()}`} animate={false} />
              <figcaption>
                <b>{label}</b>
                <span className="tier">{tier(mess(l))}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <section className="rstories" style={{ marginTop: 48 }} aria-label="Three stories from your week">
        {stories.map((s) => {
          const k = storyMetric[s.kind as 'grower' | 'tidy' | 'silly'] ?? 'thumb';
          return (
            <article key={s.kind} className={`rcard mt-${k}`}>
              <h2 className="ti">{s.title}</h2>
              <p className="bo">{s.body}</p>
              <p className="ey">{s.eyebrow}</p>
            </article>
          );
        })}
      </section>
      <div className="page" style={{ paddingTop: 40 }}>
        <div className="btnrow">
          <button type="button" className="btn" onClick={share} disabled={busy}>
            Share my garden card
          </button>
          <Link to="/tidy-up" className="btn outline">
            Plan next week
          </Link>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          The garden card shows the picture only. No numbers, apps or messages are ever included.
        </p>
      </div>
    </main>
  );
}
