import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGarden } from '../data/store';
import { addDays, daysBetween, prettyDate, timeOf, weekday, localDate } from '../engine/dates';
import { challengeMeta, fmt, META, metricFromSlug, valueText } from '../engine/meta';
import { latestValue, mess, tier } from '../engine/metrics';
import { summaryMessage } from '../engine/stories';
import type { DayData, MetricKey } from '../engine/types';
import { KEYS } from '../engine/types';
import { Garden, ratioText } from '../garden/Garden';
import { local } from '../lib/files';
import { Arrow, Blocks, Bubble, Companion, PropIcon, usePageTitle, useToast } from '../ui/common';

export function useDayNumber() {
  const { profile, today } = useGarden();
  return profile ? daysBetween(localDate(profile.createdAt), today) + 1 : 1;
}

function arrowFor(days: Map<string, DayData>, k: MetricKey, date: string): 'up' | 'down' | 'same' | null {
  const cur = latestValue(days, k, date, 0);
  if (!cur) return null;
  const prev = latestValue(days, k, addDays(date, -1), 13);
  if (!prev) return null;
  const tol = Math.max(Math.abs(prev.value) * 0.05, 0.05);
  if (cur.value - prev.value > tol) return 'up';
  if (prev.value - cur.value > tol) return 'down';
  return 'same';
}

export function GardenHome() {
  const g = useGarden();
  const { prop } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const loc = useLocation();
  const base = g.readOnly ? '/example' : '/garden';
  const open = metricFromSlug(prop);
  const first = params.get('first') === '1' && !g.readOnly;
  const lastFocus = useRef<{ k: MetricKey; from: 'garden' | 'row' } | null>(null);
  usePageTitle(open ? META[open].prop : g.profile?.gardenName ?? 'Garden');

  const values = useMemo(() => {
    const v: Partial<Record<MetricKey, number>> = {};
    for (const k of KEYS) {
      const lv = latestValue(g.days, k, g.gardenDate, 13);
      if (lv) v[k] = lv.value;
    }
    return v;
  }, [g.days, g.gardenDate]);

  const openProp = (k: MetricKey, from: 'garden' | 'row' = 'garden') => {
    lastFocus.current = { k, from };
    nav(`${base}/${k}`);
    g.actions.logResearch('receipt', k).catch(() => {});
  };
  const close = () => {
    nav(base);
    const k = lastFocus.current?.k ?? open;
    const sel = lastFocus.current?.from === 'row' ? `[data-receipt="${k}"]` : `.garden [data-metric="${k}"]`;
    setTimeout(() => document.querySelector<HTMLElement | SVGGElement>(sel)?.focus(), 30);
  };

  if (!g.profile) return null;
  if (first) return <Reveal values={values} />;

  const name = g.profile.gardenName;
  const t = tier(mess(g.levels));
  const todayData = g.days.get(g.today);
  const checkedToday = Boolean(todayData?.raw);
  const empty = g.dataDays.length === 0;
  const active = g.challenges.find((c) => c.status === 'active');
  const day = daysBetween(localDate(g.profile.createdAt), g.today) + 1;
  const sub = g.profile.paused
    ? `Day ${day} · Paused since ${prettyDate(g.profile.pausedOn ?? g.today)}`
    : checkedToday
      ? `Day ${day} · Checked in today at ${timeOf(todayData!.raw!.savedAt)}`
      : `Day ${day} · Not checked in yet today`;

  return (
    <main className="page">
      <div className="grid-home">
        <section aria-labelledby="garden-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <h1 id="garden-title" className="title-xl">
              {name}
            </h1>
            {!empty && <span className={'tier ' + t}>{t}</span>}
          </div>
          <p className="muted" style={{ marginTop: 6, fontSize: 17 }}>
            {sub}
          </p>
          <div className="garden-frame" style={{ marginTop: 24, position: 'relative' }}>
            <Garden levels={g.levels} name={name} values={values} normal={g.normal} onOpen={openProp} selected={open} />
            {empty && (
              <div className="empty-over">
                <Companion size={80} />
                <p>Your garden is waiting for its first check-in.</p>
                {!g.readOnly && (
                  <Link to="/check-in" className="btn">
                    Check in for today
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
        <aside className="stack-24" aria-label="Receipts">
          <Bubble sender="Your garden" time={checkedToday ? timeOf(todayData!.raw!.savedAt) : undefined}>
            {empty ? 'Your garden is waiting for its first check-in.' : summaryMessage(g.days, g.normal, g.gardenDate)}
          </Bubble>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ fontSize: 22 }}>Receipts</h2>
              <span className="caption">vs your normal</span>
            </div>
            <div className="receipts" style={{ marginTop: 12 }}>
              {KEYS.map((k) => {
                const v = values[k];
                return (
                  <button key={k} type="button" className="rrow" data-receipt={k} onClick={() => openProp(k, 'row')} aria-label={`${META[k].prop}. ${META[k].name}: ${v === undefined ? 'no data yet' : valueText(k, v) + ', ' + ratioText(v, g.normal[k])}. Level ${Math.round(g.levels[k] * 10)} of 10. Open receipt.`}>
                    <PropIcon k={k} />
                    <span>
                      <span className="t">{META[k].prop}</span>
                      <br />
                      <span className="s">
                        {META[k].name}: {v === undefined ? 'no data yet' : valueText(k, v)}
                      </span>
                    </span>
                    <Blocks level={g.levels[k]} />
                    <Arrow dir={arrowFor(g.days, k, g.gardenDate)} />
                  </button>
                );
              })}
            </div>
          </div>
          {!g.readOnly && (
            <div className="grid-2" style={{ gap: 12 }}>
              {checkedToday ? (
                <div className="ok-panel">
                  <div className="ok-title">
                    <span aria-hidden="true">✓</span> Checked in today
                  </div>
                  <p style={{ marginTop: 6, fontSize: 14 }}>{timeOf(todayData!.raw!.savedAt)}. See you tomorrow.</p>
                  <Link to="/check-in" style={{ fontSize: 14, fontWeight: 500, display: 'inline-block', marginTop: 6 }}>
                    Edit today’s check-in
                  </Link>
                </div>
              ) : (
                <div className="info-panel">
                  <b style={{ color: 'var(--ink)' }}>Check in for today</b>
                  <p style={{ marginTop: 6, fontSize: 14 }}>About two minutes. Rough numbers are fine.</p>
                  <Link to="/check-in" className="btn small" style={{ marginTop: 10 }}>
                    Check in
                  </Link>
                </div>
              )}
              {active ? (
                <ChallengeCard id={active.id} />
              ) : (
                <div className="panel" style={{ padding: 16 }}>
                  <b style={{ color: 'var(--ink)' }}>Tidy up a patch</b>
                  <p style={{ marginTop: 6, fontSize: 14 }} className="muted">
                    Small challenges, one at a time.
                  </p>
                  <Link to="/tidy-up" style={{ fontSize: 14, fontWeight: 500, display: 'inline-block', marginTop: 6 }}>
                    See challenges
                  </Link>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
      {open && <Receipt k={open} onClose={close} key={loc.pathname} />}
    </main>
  );
}

function ChallengeCard({ id }: { id: string }) {
  const g = useGarden();
  const toast = useToast();
  const c = g.challenges.find((x) => x.id === id)!;
  const cm = challengeMeta(c.type);
  const loggedToday = c.log.includes(g.today);
  const log = async () => {
    try {
      const r = await g.actions.logChallenge(id);
      toast(r === 'done' ? 'Challenge done. Nice patch.' : 'Logged. See you tomorrow.');
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  return (
    <div className="info-panel" style={{ padding: 16 }}>
      <b style={{ color: 'var(--ink)' }}>Tidy-up: {cm.title.toLowerCase()}</b>
      <p style={{ marginTop: 4, fontSize: 14 }}>
        Day {Math.min(c.log.length + (loggedToday ? 0 : 1), c.days)} of {c.days} · {cm.clears.replace(/^\w+ /, (w) => w.toLowerCase())}
      </p>
      <div className="bar" aria-hidden="true">
        <i style={{ width: `${(c.log.length / c.days) * 100}%` }} />
      </div>
      {loggedToday ? (
        <p className="caption" style={{ marginTop: 6 }}>
          Logged today.
        </p>
      ) : (
        <button type="button" className="linkbtn" style={{ marginTop: 6, fontSize: 14 }} onClick={log}>
          Log today
        </button>
      )}
    </div>
  );
}

/* ---------- 6. Reveal ---------- */
function Reveal({ values }: { values: Partial<Record<MetricKey, number>> }) {
  const g = useGarden();
  const nav = useNavigate();
  usePageTitle('Meet your garden');
  useEffect(() => {
    local.set('ygk-revealed', true);
  }, []);
  const v = (k: MetricKey) => values[k] ?? 0;
  const callouts: { k: MetricKey; title: string; body: string; pos: React.CSSProperties }[] = [
    { k: 'potato', title: 'Garden bed', body: Math.round(g.levels.potato * 12) > 6 ? 'More potatoes than flowers today.' : `Mostly flowers, ${Math.round(g.levels.potato * 12) ? 'a couple of potatoes' : 'no potatoes yet'}.`, pos: { left: '-4%', top: '38%' } },
    { k: 'laugh', title: 'Kookaburra', body: v('laugh') > 0 ? 'A few 😂 in your chats today.' : 'No 😂 yet, so no kookaburras.', pos: { right: '-6%', top: '18%' } },
    { k: 'thumb', title: 'Long grass', body: `Thumb mileage: ${fmt(v('thumb'), 0)} m today, ${ratioText(v('thumb'), g.normal.thumb)}.`, pos: { left: '-4%', top: '6%' } },
    { k: 'seen', title: 'Letterbox', body: `${fmt(v('seen'), 0)} unread messages in your busiest chat.`, pos: { right: '-6%', top: '78%' } },
  ];
  return (
    <main className="reveal">
      <div className="reveal-in">
        <div className="reveal-copy">
          <h1 className="display" style={{ textAlign: 'left' }}>
            Meet your{' '}
            <span className="hl">
              garden.
              <span className="hl-meta" aria-hidden="true">
                8:04 pm
              </span>
            </span>
          </h1>
          <p className="lede" style={{ color: 'var(--text)' }}>
            It grew from today’s check-in. One day moves it a little; a week shows the pattern.
          </p>
          <div className="btnrow" style={{ marginTop: 28 }}>
            <button type="button" className="btn" onClick={() => nav('/garden', { replace: true })}>
              Go to my garden
            </button>
            <button type="button" className="btn secondary" onClick={() => nav('/garden/thumb', { replace: true })}>
              How is this worked out?
            </button>
          </div>
          <p className="caption" style={{ marginTop: 16 }}>
            Tip: click anything in your garden to see its receipt.
          </p>
          <div style={{ marginTop: 32 }} aria-hidden="true">
            <Companion pose="wave" size={110} />
          </div>
        </div>
        <div className="reveal-garden">
          <Garden levels={g.levels} name={g.profile!.gardenName} values={values} normal={g.normal} onOpen={(k) => nav(`/garden/${k}`, { replace: true })} />
          {callouts.map((c) => (
            <div key={c.k} className="callout" style={c.pos}>
              <b>{c.title}</b>
              <span>{c.body}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/* ---------- 9. Receipt ---------- */
function sourceLine(d: DayData | undefined, k: MetricKey, today: string, importsByKind: Record<string, string>): string {
  if (!d) return 'No data for this measure yet.';
  const src = d.sources[k];
  const when = d.date === today ? 'today’s check-in' : `your check-in on ${prettyDate(d.date)}`;
  if (src === 'whatsapp') return `From your WhatsApp export (${importsByKind.whatsapp ?? 'chat'}), ${prettyDate(d.date)}.`;
  if (src === 'tiktok' || src === 'instagram') {
    const nm = src === 'tiktok' ? 'TikTok' : 'Instagram';
    return k === 'potato' ? `From your ${nm} watch history and your steps, ${prettyDate(d.date)}.` : `From your ${nm} watch history, ${prettyDate(d.date)}.`;
  }
  const r = d.raw;
  if (!r) return `From ${when}.`;
  const detail: Record<MetricKey, string> = {
    thumb: `${r.shortVideoMinutes} min of short video`,
    headline: `${r.linksUnopened} ${r.linksUnopened === 1 ? 'link' : 'links'} shared without opening`,
    forwards: `${r.forwards} forwarded ${r.forwards === 1 ? 'message' : 'messages'}`,
    potato: `${r.shortVideoMinutes} min of short video and ${r.steps.toLocaleString('en-AU')} steps`,
    laugh: `${r.laughPer10} per 10 messages`,
    seen: `${r.unread} unread`,
  };
  return `From ${when}: ${detail[k]}.`;
}

function Receipt({ k, onClose }: { k: MetricKey; onClose: () => void }) {
  const g = useGarden();
  const nav = useNavigate();
  const m = META[k];
  const panelRef = useRef<HTMLDivElement>(null);
  const latest = latestValue(g.days, k, g.gardenDate, 13);
  const n = g.normal[k];
  const v = latest?.value;
  useEffect(() => {
    panelRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(g.gardenDate, i - 6);
    return { date, v: g.days.get(date)?.metrics[k] };
  });
  const max = Math.max(n * 2.2, ...week.map((w) => w.v ?? 0));
  const importsByKind = Object.fromEntries(g.imports.map((i) => [i.kind, i.fileName]));
  const challenge = m.challenge;
  const unitWord = m.unit(v ?? 2);
  const big = v === undefined ? '–' : fmt(v, k === 'thumb' || k === 'potato' || k === 'seen' ? 0 : 1);

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="receipt-title" ref={panelRef} tabIndex={-1}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <PropIcon k={k} size={40} />
          <div>
            <h2 id="receipt-title" style={{ fontSize: 22 }}>
              {m.prop}
            </h2>
            <p className="muted">{m.name}</p>
          </div>
        </div>
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span className="bigval">{big}</span>
          <span style={{ fontSize: 17 }}>
            {unitWord}
            {latest && latest.date !== g.today ? ` on ${prettyDate(latest.date)}` : latest ? ' today' : ''}
          </span>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          Your normal is {fmt(n, 1)}. At {fmt(n * 2, 1)} or more, {m.maxPhrase}.
        </p>

        <h3 style={{ marginTop: 28 }}>Last 7 days</h3>
        <div className="bars" role="img" aria-label={`Last 7 days: ${week.map((w) => `${weekday(w.date)} ${w.v === undefined ? 'no data' : fmt(w.v, 0)}`).join(', ')}. Normal ${fmt(n, 1)}.`}>
          <div className="normal-line" style={{ bottom: `${(n / max) * 100}%` }}>
            <span>normal</span>
          </div>
          {week.map((w, i) => (
            <div key={w.date} className="barcol">
              <span className="bv">{w.v === undefined ? '' : fmt(w.v, 0)}</span>
              <i className={i === 6 ? 'now' : ''} style={{ height: `${w.v === undefined ? 0 : Math.max(2, (w.v / max) * 100)}%` }} />
              <span className="bd">{weekday(w.date)}</span>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 28 }}>How it’s worked out</h3>
        <p className="formula" style={{ marginTop: 10 }}>
          {m.formula}
        </p>
        <p className="caption" style={{ marginTop: 8 }}>
          {sourceLine(latest ? g.days.get(latest.date) : undefined, k, g.today, importsByKind)}
        </p>

        <h3 style={{ marginTop: 28 }}>What would tidy this up?</h3>
        <p style={{ marginTop: 8 }}>{m.advice}</p>

        <div className="btnrow" style={{ marginTop: 28 }}>
          {challenge && !g.readOnly && (
            <button type="button" className="btn secondary" onClick={() => nav(`/tidy-up?start=${challenge}`)}>
              Start a tidy-up
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}
