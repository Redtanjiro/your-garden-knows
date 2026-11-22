// Sample walkthrough: Mia's month. Read-only: it never reads or writes the garden database.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { EXAMPLE_MESSAGE } from '../data/demo';
import { BEATS, walkthroughData, WT_DAYS } from '../data/walkthrough';
import { derive, GardenContext, useGarden, type Actions, type GardenData } from '../data/store';
import { challengeMeta, META } from '../engine/meta';
import { latestValue, levelsAt, mess, streetLevels, fromStreetLevels, tier } from '../engine/metrics';
import { changeList, projectChallenge, reportStories } from '../engine/stories';
import type { Levels, MetricKey } from '../engine/types';
import { KEYS } from '../engine/types';
import { gardenSVG } from '../garden/draw';
import { Garden } from '../garden/Garden';
import { Bubble, Companion, MetricTile, SliderField, usePageTitle } from '../ui/common';
import { Mural } from '../ui/Mural';
import { ReceiptRows } from '../ui/receipts';
import { PublicTopbar } from '../ui/topbar';
import { NORMAL_FIELDS } from './Onboarding';
import { ReceiptBody } from './Home';

/* ---------- read-only data ---------- */
const reject = async () => {
  throw new Error(EXAMPLE_MESSAGE);
};
const NO_ACTIONS: Actions = {
  createProfile: reject,
  updateProfile: reject,
  saveCheckIn: reject,
  saveImports: reject,
  startChallenge: reject,
  logChallenge: reject,
  stopChallenge: reject,
  setStreet: reject,
  logResearch: async () => {},
  setResearch: reject,
  deleteEverything: reject,
};

function useMia() {
  return useMemo(() => walkthroughData(), []);
}
type Mia = ReturnType<typeof walkthroughData>;

/** Garden context for Mia on day d: only check-ins up to that day, read-only. */
function gardenFor(mia: Mia, d: number): GardenData {
  const t = mia.dateOf(d);
  const checkins = mia.checkins.filter((c) => c.date <= t);
  return { ready: true, storageBlocked: false, readOnly: true, profile: mia.profile, checkins, imports: [], challenges: [], street: undefined, today: t, ...derive(mia.profile, checkins, [], t), research: false, actions: NO_ACTIONS };
}
export function WalkthroughProvider({ mia, day, children }: { mia: Mia; day: number; children: ReactNode }) {
  const value = useMemo(() => gardenFor(mia, day), [mia, day]);
  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}

function valuesFor(g: GardenData) {
  const v: Partial<Record<MetricKey, number>> = {};
  for (const k of KEYS) v[k] = latestValue(g.days, k, g.gardenDate, 13)?.value;
  return v;
}

/* ---------- steps ---------- */
interface Note {
  text: string;
  at?: [number, number]; // marker position over the screen, in %
}
interface Step {
  slug: string;
  chapter: 0 | 1 | 2;
  heading: string;
  narration: string;
  notes?: Note[];
  day: number;
  Screen: (p: { mia: Mia }) => JSX.Element;
}
const CHAPTERS = ['Set up', 'A day', 'Four weeks'];

const STEPS: Step[] = [
  { slug: 'welcome', chapter: 0, heading: 'Meet Mia', day: 1, narration: 'Mia is 22 and in three busy group chats. She wants to see how she scrolls and shares, without being told off.', notes: [{ text: 'One promise: it shows habits, never whether something is true.', at: [95, 12] }], Screen: WelcomeShot },
  { slug: 'how', chapter: 0, heading: 'Six silly measures', day: 1, narration: 'Each habit grows one thing in the garden. The app never judges what’s true, only how you share.', notes: [{ text: 'Links shared without opening become newspapers on the lawn.', at: [50, 8] }, { text: 'Forwarded messages blow seeds into the neighbours’ yards.', at: [84, 8] }], Screen: MeasuresShot },
  { slug: 'data', chapter: 0, heading: 'Choosing her data', day: 1, narration: 'A two-minute daily check-in. She could bring WhatsApp or TikTok exports instead; they’re read on her device and never uploaded.', notes: [{ text: 'Daily check-in, about two minutes each evening.', at: [6, 12] }], Screen: DataShot },
  { slug: 'normal', chapter: 0, heading: 'Setting her normal', day: 1, narration: 'Her garden compares Mia only with Mia. Twice her normal is maximum mess.', notes: [{ text: 'Her own normal for each measure. No one else’s.', at: [96, 8] }], Screen: NormalShot },
  { slug: 'reveal', chapter: 0, heading: 'Her garden appears', day: 1, narration: 'Day 1: a tidy backyard. From here, it grows with her habits.', Screen: RevealShot },
  { slug: 'check-in', chapter: 1, heading: 'The 8 pm check-in', day: 12, narration: 'A reminder at 8 pm. Six quick answers about today.', notes: [{ text: 'The reminder, worded like a message from her garden.', at: [4, 6] }, { text: 'Rough numbers are fine: Screen Time and a glance at her chats.', at: [4, 34] }], Screen: CheckInShot },
  { slug: 'overnight', chapter: 1, heading: 'Overnight, it changes', day: 12, narration: 'Exam week. Between day 11 and day 12 the garden moves, and it says exactly what moved.', Screen: OvernightShot },
  { slug: 'receipt', chapter: 1, heading: 'Every prop has a receipt', day: 12, narration: 'Tap anything to see the number behind the joke. The mess is a receipt, not a verdict.', notes: [{ text: 'Try another prop: the receipt swaps.' }], Screen: ReceiptShot },
  { slug: 'tidy-up', chapter: 1, heading: 'Tidying up', day: 12, narration: 'Each prop has a small challenge. Mia doesn’t start one yet.', notes: [{ text: 'A projection, clearly labelled. Only real check-ins change the garden.', at: [74, 10] }], Screen: TidyShot },
  { slug: 'timeline', chapter: 2, heading: 'Four weeks, one garden', day: 28, narration: 'Drag through Mia’s month. Exams, a group-chat blow-up, a tidy-up, and back.', Screen: TimelineShot },
  { slug: 'report', chapter: 2, heading: 'Her weekly report', day: 21, narration: 'Every Sunday, a short story of her week, not a lecture.', Screen: ReportShot },
  { slug: 'street', chapter: 2, heading: 'Her group chat’s street', day: 28, narration: 'Friends can share a street. Neighbours see pictures, never numbers.', notes: [{ text: 'Mia’s garden, outlined. No rankings, no scores.', at: [4, 5] }], Screen: StreetShot },
];

const pin = (n: number, at?: [number, number]) =>
  at ? (
    <span key={n} className="marker pin" aria-hidden="true" style={{ left: `${at[0]}%`, top: `${at[1]}%`, transform: 'translate(-50%, -50%)' }}>
      {n}
    </span>
  ) : null;

/* ---------- the walkthrough ---------- */
export function Walkthrough() {
  const { step } = useParams();
  const real = useGarden();
  const nav = useNavigate();
  const mia = useMia();
  const idx = step ? STEPS.findIndex((s) => s.slug === step) : 0;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const s = STEPS[Math.max(0, idx)];
  usePageTitle(`${s.heading} · Sample walkthrough`);
  const exitTo = real.profile ? '/garden' : '/';

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [idx]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement || t.closest('[role="slider"]')) return;
      if (e.key === 'ArrowRight' && idx < STEPS.length - 1) nav(`/walkthrough/${STEPS[idx + 1].slug}`);
      if (e.key === 'ArrowLeft' && idx > 0) nav(`/walkthrough/${STEPS[idx - 1].slug}`);
      if (e.key === 'Escape' && !document.querySelector('.menu-sheet')) nav(exitTo);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, nav, exitTo]);

  if (step && idx < 0) return <Navigate to="/walkthrough/welcome" replace />;
  const opener = s.chapter !== (STEPS[idx - 1]?.chapter ?? -1);
  const last = idx === STEPS.length - 1;
  const chapterSteps = (c: number) => STEPS.map((x, i) => ({ x, i })).filter(({ x }) => x.chapter === c);

  return (
    <>
      <PublicTopbar />
      <div className="wt-banner">
        <div className="wrap">
          <span>Sample walkthrough · Nothing here is saved</span>
          <Link to={exitTo}>Exit</Link>
        </div>
      </div>
      <main>
        <div className="wrap">
          <nav className="wt-tabs" aria-label="Chapters">
            {CHAPTERS.map((c, i) => (
              <Link key={c} to={`/walkthrough/${chapterSteps(i)[0].x.slug}`} aria-current={s.chapter === i ? 'step' : undefined}>
                <span>{i + 1}</span>
                {c}
              </Link>
            ))}
          </nav>
          <div className="wt-body">
            <WalkthroughProvider mia={mia} day={s.day}>
              <div className="wt-screen" aria-label={`Sample screen: ${s.heading}`} role="region">
                <s.Screen mia={mia} />
                {s.notes?.map((n, i) => pin(i + 1, n.at))}
              </div>
            </WalkthroughProvider>
            <section className={'wt-narr' + (opener ? ' opener' : '')} aria-live="polite">
              {opener && <p className="chapter">{CHAPTERS[s.chapter]}</p>}
              <p className="caption">
                Step {idx + 1} of {STEPS.length}
              </p>
              <h1 className="sr-only">Sample walkthrough: Mia’s month</h1>
              <h2 ref={headingRef} tabIndex={-1}>
                {s.heading}
              </h2>
              <p className="lead">{s.narration}</p>
              {s.notes && s.notes.some((n) => n.at) && (
                <ol className="wt-notes">
                  {s.notes.map((n, i) => (
                    <li key={i}>
                      <span className="marker" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span>{n.text}</span>
                    </li>
                  ))}
                </ol>
              )}
              {s.notes && !s.notes.some((n) => n.at) && <p style={{ marginTop: 16, fontWeight: 600 }}>{s.notes[0].text}</p>}
              {last && (
                <div className="btnrow" style={{ marginTop: 28 }}>
                  <Link to="/start" className="btn">
                    Plant my garden
                  </Link>
                  <Link to="/example" className="btn outline">
                    Explore the example garden
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <div className="wt-foot">
        <div className="wrap">
          {idx > 0 ? (
            <Link to={`/walkthrough/${STEPS[idx - 1].slug}`} className="btn outline">
              Back
            </Link>
          ) : (
            <Link to={exitTo} className="btn outline">
              Back
            </Link>
          )}
          <div className="wt-prog" role="img" aria-label={`Chapter ${s.chapter + 1} of 3, step ${idx + 1} of ${STEPS.length}`}>
            {CHAPTERS.map((_, c) => {
              const cs = chapterSteps(c);
              const done = c < s.chapter ? 1 : c > s.chapter ? 0 : (cs.findIndex(({ i }) => i === idx) + 1) / cs.length;
              return (
                <i key={c}>
                  <b style={{ width: `${done * 100}%` }} />
                </i>
              );
            })}
          </div>
          {last ? (
            <Link to="/start" className="btn">
              Plant my garden
            </Link>
          ) : (
            <Link to={`/walkthrough/${STEPS[idx + 1].slug}`} className="btn">
              Next
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- step screens (real components, Mia's data) ---------- */
function WelcomeShot() {
  const g = useGarden();
  return (
    <div className="stage" style={{ padding: '36px 28px 0' }}>
      <p className="display-l" style={{ color: '#fff', fontSize: 'clamp(32px, 4.4vw, 56px)' }}>
        Your garden{' '}
        <span className="hl" style={{ color: 'var(--ink)' }}>
          knows
        </span>{' '}
        how you scroll.
      </p>
      <p className="lead" style={{ color: '#e9e9e9', marginTop: 16, fontSize: 16 }}>
        Six silly measures of your screen life grow a backyard you can see, laugh at and tidy up.
      </p>
      <span className="btn on-dark hero" style={{ marginTop: 24, pointerEvents: 'none' }} aria-hidden="true">
        Plant my garden
      </span>
      <div style={{ margin: '28px -28px 0' }}>
        <Mural levels={g.levels} height={110} animate={false} />
      </div>
    </div>
  );
}

function MeasuresShot() {
  return (
    <ul className="measures" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 14 }}>
      {KEYS.map((k) => (
        <li key={k} className="measure">
          <MetricTile k={k} size="100%" />
          <b style={{ fontSize: 16 }}>{META[k].name}</b>
          <span>→ {META[k].prop.toLowerCase()}</span>
        </li>
      ))}
    </ul>
  );
}

function DataShot() {
  return (
    <div className="grid-2" style={{ background: 'var(--paper)', padding: 20 }}>
      {[
        ['Daily check-in', 'About 2 minutes each evening', 'Move six sliders using Screen Time and a glance at your chats.', true],
        ['Bring your exports', 'One-off, about 10 minutes', 'Drop in a WhatsApp chat and your TikTok or Instagram history.', false],
      ].map(([t, sub, body, on]) => (
        <div key={t as string} className="radiocard" style={on ? { border: '2px solid var(--ink)', padding: '21px 23px' } : undefined} aria-label={`${t}${on ? ', selected' : ''}`} role="group">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="radiodot" style={on ? { background: 'var(--ink)', boxShadow: 'inset 0 0 0 4px #fff' } : undefined} />
            <h3>{t}</h3>
          </div>
          <p className="mono muted" style={{ margin: '8px 0 0 32px', fontSize: 14 }}>
            {sub}
          </p>
          <p style={{ margin: '8px 0 0 32px' }}>{body}</p>
        </div>
      ))}
    </div>
  );
}

function NormalShot() {
  const g = useGarden();
  return (
    <div style={{ background: 'var(--paper)', padding: '4px 20px' }}>
      {NORMAL_FIELDS.map((f) => (
        <SliderField key={f.key} icon={<MetricTile k={f.metric} size={40} />} label={f.label} hint={f.hint} value={g.profile!.normal[f.key]} min={f.min} max={f.max} step={f.step} sliderMax={f.sliderMax} unit={f.unit} disabled onChange={() => {}} />
      ))}
    </div>
  );
}

function RevealShot() {
  const g = useGarden();
  const [shown, setShown] = useState<Levels | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setShown(g.levels), 300);
    return () => clearTimeout(t);
  }, [g.levels]);
  const lv = shown ?? { thumb: 0, headline: 0, forwards: 0, potato: 0, laugh: 0, seen: 0 };
  return (
    <div style={{ maxWidth: 460, margin: '0 auto' }}>
      <Garden levels={lv} name={g.profile!.gardenName} />
      <div className="garden-meta">
        <b>Day 1</b>
        <span className="tier">{tier(mess(g.levels))}</span>
      </div>
    </div>
  );
}

function CheckInShot() {
  const g = useGarden();
  const raw = g.days.get(g.today)!.raw!;
  return (
    <div>
      <Bubble sender="Your garden" time="8:00 pm">
        Your garden is waiting. Two minutes to check in?
      </Bubble>
      <div style={{ background: 'var(--paper)', padding: '4px 20px', marginTop: 18 }}>
        <h3 style={{ padding: '14px 0' }}>How was today?</h3>
        {NORMAL_FIELDS.map((f) => (
          <SliderField key={f.key} icon={<MetricTile k={f.metric} size={40} />} label={f.label} hint={f.hint} value={raw[f.key]} min={f.min} max={f.max} step={f.step} sliderMax={f.sliderMax} unit={f.unit} disabled onChange={() => {}} />
        ))}
      </div>
    </div>
  );
}

function OvernightShot({ mia }: { mia: Mia }) {
  const [d, setD] = useState(12);
  const g11 = useMemo(() => gardenFor(mia, 11), [mia]);
  const g12 = useMemo(() => gardenFor(mia, 12), [mia]);
  const shown = d === 11 ? g11 : g12;
  const changes = changeList(g11.levels, g12.levels).filter((c) => c.tone !== 'same');
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div>
        <div className="btnrow" role="group" aria-label="Which day">
          {[11, 12].map((x) => (
            <button key={x} type="button" className="chip" aria-pressed={d === x} onClick={() => setD(x)}>
              Day {x}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Garden levels={shown.levels} name={`Mia’s backyard, day ${d}`} />
        </div>
        <div className="garden-meta">
          <b>Day {d}</b>
          <span className="tier">{tier(mess(shown.levels))}</span>
        </div>
      </div>
      <div style={{ background: 'var(--paper)', padding: 20 }}>
        <h3>What changed overnight</h3>
        <ul className="changes" aria-live="polite">
          {changes.map((c) => (
            <li key={c.text}>{c.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReceiptShot() {
  const g = useGarden();
  const [k, setK] = useState<MetricKey>('headline');
  const values = valuesFor(g);
  return (
    <div className="grid-2 wt-receipt" style={{ alignItems: 'start', gap: 18 }}>
      <div>
        <Garden levels={g.levels} name={g.profile!.gardenName} values={values} normal={g.normal} onOpen={setK} selected={k} />
        <p className="muted" style={{ marginTop: 10 }}>
          Tap a prop to swap the receipt.
        </p>
      </div>
      <div style={{ background: 'var(--paper)', borderLeft: '1px solid var(--ink)' }} aria-live="polite">
        <ReceiptBody k={k} headingId="wt-receipt" />
      </div>
    </div>
  );
}

function TidyShot() {
  const g = useGarden();
  const cm = challengeMeta('open-before-share');
  const proj = useMemo(() => projectChallenge(g.days, g.profile!.normal, 'open-before-share', g.today), [g.days, g.profile, g.today]);
  return (
    <div style={{ background: 'var(--paper)' }} className="challenge">
      <span className={`bar-l mt-${cm.metric}`} aria-hidden="true" />
      <div className="in">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <MetricTile k={cm.metric} size={48} />
          <h3 className="heading-s">{cm.title}</h3>
        </div>
        <p style={{ marginTop: 10 }}>{cm.body}</p>
        <div className="grid-2" style={{ gap: 12, marginTop: 18 }}>
          <figure className="pair-fig">
            <Garden levels={proj.now} name="Now" animate={false} label="Mia’s garden now" />
            <figcaption>
              <b>Now</b>
            </figcaption>
          </figure>
          <figure className="pair-fig">
            <Garden levels={proj.after} name="Projection" animate={false} label={`Projection, not her real garden: how it could look after ${cm.days} days of this challenge`} />
            <figcaption>
              <b>
                After <span className="mono">{cm.days}</span> days
              </b>
              <span className="badge muted">Projection</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}

function TimelineShot({ mia }: { mia: Mia }) {
  const all = useMemo(() => Array.from({ length: WT_DAYS }, (_, i) => gardenFor(mia, i + 1)), [mia]);
  const [d, setD] = useState(1);
  const [playing, setPlaying] = useState(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setD((x) => (x >= WT_DAYS ? (setPlaying(false), x) : x + 1)), 600);
    return () => clearInterval(id);
  }, [playing]);
  const g = all[d - 1];
  const t = tier(mess(g.levels));
  const tierN = (x: GardenData) => ['Immaculate', 'Tidy', 'Lived-in', 'Unruly', 'Feral'].indexOf(tier(mess(x.levels)));
  const beat = [...BEATS].reverse().find((b) => b.day <= d);
  return (
    <div className="grid-2 wt-timeline" style={{ alignItems: 'start', gap: 18 }}>
      <div>
        <Garden levels={g.levels} name={`Mia’s backyard, day ${d}`} animate={!reduced} />
        <div className="garden-meta">
          <b className="mono">Day {d}</b>
          <span className="tier">{t}</span>
        </div>
        <div className="scrub">
          <button type="button" className="btn small" aria-pressed={playing} onClick={() => (d >= WT_DAYS && setD(1), setPlaying((p) => !p))}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <input type="range" min={1} max={WT_DAYS} value={d} aria-label="Day of Mia’s month" aria-valuetext={`Day ${d}, ${t}${beat ? ', ' + beat.label : ''}`} onChange={(e) => (setPlaying(false), setD(+e.target.value))} />
        </div>
        <div className="ticksbar" aria-hidden="true">
          {all.map((x, i) => (
            <span key={i} className={`t${tierN(x)}${i + 1 === d ? ' now' : ''}`} />
          ))}
        </div>
        <ol className="beats">
          {BEATS.map((b) => (
            <li key={b.day} className={beat?.day === b.day ? 'on' : ''}>
              <button type="button" onClick={() => (setPlaying(false), setD(b.day))}>
                Day {b.day} · {b.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div style={{ background: 'var(--paper)', padding: '4px 14px' }} aria-live="polite">
        <ReceiptRows levels={g.levels} values={valuesFor(g)} normal={g.normal} />
      </div>
    </div>
  );
}

function ReportShot({ mia }: { mia: Mia }) {
  const g = useGarden();
  const stories = useMemo(() => reportStories(g.days, g.normal, mia.dateOf(14), mia.dateOf(21)), [g.days, g.normal, mia]);
  const at = [7, 16, 28].map((d) => ({ d, l: levelsAt(gardenFor(mia, 28).days, g.normal, mia.dateOf(d)) }));
  const colour = ['thumb', 'headline', 'thumb'] as MetricKey[];
  const before = levelsAt(g.days, g.normal, mia.dateOf(14));
  const deltas = KEYS.map((k) => ({ k, d: g.levels[k] - before[k] })).sort((a, b) => b.d - a.d);
  colour[0] = deltas[0].k;
  colour[1] = deltas[deltas.length - 1].k;
  return (
    <div>
      <div className="grid-3" style={{ gap: 12 }}>
        {at.map(({ d, l }) => (
          <figure key={d} className="pair-fig" style={{ background: 'var(--paper)' }}>
            <Garden levels={l} name={`Mia’s backyard, day ${d}`} animate={false} />
            <figcaption>
              <b className="mono">Day {d}</b>
              <span className="tier">{tier(mess(l))}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="rstories" style={{ marginTop: 16 }}>
        {stories.map((s, i) => (
          <article key={s.kind} className={`rcard mt-${colour[i]}`} style={{ padding: 20, minHeight: 0 }}>
            <h3 className="ti" style={{ fontSize: 22, color: 'inherit' }}>
              {s.title}
            </h3>
            <p style={{ fontSize: 16 }}>{s.body}</p>
            <p className="ey">{s.eyebrow}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

const FRIENDS: { name: string; levels: Levels }[] = [
  { name: 'Jordan', levels: { thumb: 3, headline: 2, forwards: 1, potato: 3, laugh: 4, seen: 2 } },
  { name: 'Sam', levels: { thumb: 7, headline: 5, forwards: 3, potato: 8, laugh: 6, seen: 8 } },
  { name: 'Priya', levels: { thumb: 2, headline: 1, forwards: 0, potato: 2, laugh: 3, seen: 1 } },
  { name: 'Theo', levels: { thumb: 5, headline: 3, forwards: 6, potato: 4, laugh: 9, seen: 5 } },
];
function StreetShot() {
  const g = useGarden();
  const mine = gardenSVG(fromStreetLevels(streetLevels(g.levels)), 7);
  const tiles = ['t-mint', 't-lavender', 't-yellow', 't-emerald', 't-orange'];
  return (
    <div>
      <div className="stage" style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'center' }}>
        {[{ name: 'Mia', svg: mine, me: true }, ...FRIENDS.map((f, i) => ({ name: f.name, svg: gardenSVG(fromStreetLevels(f.levels), 20 + i * 13), me: false }))].map((m) => (
          <div key={m.name} className="lot" style={{ position: 'static', transform: 'none' }}>
            <div className={'g' + (m.me ? ' me' : '')} role="img" aria-label={`${m.name}’s garden${m.me ? ', outlined' : ''}`} dangerouslySetInnerHTML={{ __html: m.svg }} />
            <span className="nm">{m.me ? 'Mia' : m.name}</span>
          </div>
        ))}
      </div>
      <ul className="ngrid" style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', gap: 12 }}>
        {FRIENDS.map((f, i) => (
          <li key={f.name} className="ncard">
            <div className={'tilebox ' + tiles[i % 5]}>
              <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: gardenSVG(fromStreetLevels(f.levels), 20 + i * 13) }} />
            </div>
            <b style={{ fontSize: 16 }}>{f.name}</b>
            <p>{tier(mess(fromStreetLevels(f.levels)))}</p>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }} aria-hidden="true">
        <Companion pose="wave" size={70} />
      </div>
    </div>
  );
}
