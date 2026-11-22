import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fmt, META, valueText } from '../engine/meta';
import { mess, tier } from '../engine/metrics';
import type { MetricKey } from '../engine/types';
import { KEYS } from '../engine/types';
import { changeList } from '../engine/stories';
import { CHAPTERS, PRACTICE, START_TALLY, type Buzz, type Choice, type Tally } from './content';
import {
  applyChoice,
  clockText,
  durText,
  enterChapter,
  levelsOf,
  loadLast,
  metricsOf,
  newDay,
  NORMAL_M,
  phoneMinutes,
  picksFor,
  saveLast,
  thumbLandmark,
  thumbText,
  tierOf,
  type Day,
  type LastDay,
} from './state';
import { setSound, sfx, soundOn } from './sfx';
import { Street, type Light } from './Street';
import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import './game.css';

type Scene = 'title' | 'howto' | 'chapter' | 'buzz' | 'outcome' | 'reveal';

const TIER_LINE: Record<string, string> = {
  Immaculate: 'Not a single newspaper in sight.',
  Tidy: 'A few blades of grass out of place.',
  'Lived-in': 'Comfortably messy. Like most days.',
  Unruly: 'Things are getting a bit wild out there.',
  Feral: 'The kookaburras have taken over.',
};

const ordinaryRatio = (v: number, n: number) => {
  const r = v / n;
  if (r < 0.75) return 'less than an ordinary day';
  if (r <= 1.3) return 'about an ordinary day';
  return `about ${fmt(r, r < 3 ? 1 : 0)} times an ordinary day`;
};

function useNarrow() {
  const q = '(max-width: 899px), (max-aspect-ratio: 1/1)';
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setN(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return n;
}
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- icons: thin, monochrome, 1.25px ---------- */
const I = {
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5',
  restart: 'M5 12a7 7 0 1 0 2.1-5M5 4v4h4',
  info: 'M12 11v6M12 7.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  soundOn: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  soundOff: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  close: 'M6 6l12 12M18 6L6 18',
  arrow: 'M4 12h15M13 6l6 6-6 6',
};
function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
    </svg>
  );
}
function IconBtn({ d, label, onClick, pressed }: { d: string; label: string; onClick: () => void; pressed?: boolean }) {
  return (
    <button className="wf-icon" type="button" aria-label={label} aria-pressed={pressed} onClick={onClick}>
      <Icon d={d} />
    </button>
  );
}
function Btn({ children, onClick, kind = 'primary', autoFocus, disabled, hint }: { children: ReactNode; onClick: () => void; kind?: 'primary' | 'quiet'; autoFocus?: boolean; disabled?: boolean; hint?: string }) {
  return (
    <button type="button" className={`wf-btn ${kind}`} onClick={onClick} autoFocus={autoFocus} disabled={disabled}>
      {kind === 'primary' && <Icon d={I.arrow} />}
      <span>{children}</span>
      {hint && <kbd aria-hidden="true">{hint}</kbd>}
    </button>
  );
}

/* ---------- the phone: a black slab floating in the scene ---------- */
function Phone({ buzz, onChoose, outcome, onNext, nextLabel, changes, late, children, lockChoices, headingRef, count }: {
  buzz: Buzz;
  count?: string;
  onChoose?: (c: Choice) => void;
  outcome?: Choice | null;
  onNext?: () => void;
  nextLabel?: string;
  changes?: string[];
  late?: string | null;
  children?: ReactNode;
  lockChoices?: boolean;
  headingRef?: React.Ref<HTMLParagraphElement>;
}) {
  return (
    <section className={'wf-phone' + (outcome ? ' done' : '')} data-coach="phone" aria-label={`${buzz.app} message`} key={buzz.id}>
      <div className="wf-phone-top">
        <span className="wf-app">{buzz.app}</span>
        <span className="wf-dots">{count ?? '•••'}</span>
      </div>
      {late && <p className="wf-late">{late}</p>}
      {buzz.from && <p className="wf-from">{buzz.from}</p>}
      {buzz.forwarded && <p className="wf-fwd">⇉ Forwarded many times</p>}
      <p className="wf-msg" tabIndex={-1} ref={headingRef}>
        {buzz.text}
      </p>
      {!outcome ? (
        <div className="wf-choices" data-coach="choices" role="group" aria-label="Pick one">
          {buzz.choices.map((c, i) => (
            <Btn key={c.label} kind={i === 0 ? 'primary' : 'quiet'} onClick={() => onChoose?.(c)} disabled={lockChoices} hint={String(i + 1)}>
              {c.label}
            </Btn>
          ))}
        </div>
      ) : (
        <div className="wf-outcome" aria-live="polite">
          <p className="wf-you">You: {outcome.label}</p>
          <p className="wf-result">{outcome.outcome}</p>
          {changes && changes.length > 0 && (
            <ul className="wf-changes">
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          {onNext && (
            <div className="wf-choices">
              <Btn onClick={onNext} autoFocus hint="↵">
                {nextLabel ?? 'Next'}
              </Btn>
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function Hud({ day }: { day: Day }) {
  const lm = thumbLandmark(day.tally);
  return (
    <div className="wf-hud" data-coach="hud" aria-label="Clock and phone time">
      <p className="wf-clock">{clockText(day.clock)}</p>
      <p className="wf-meter">
        <span>{durText(phoneMinutes(day.tally))} on phone</span>
        <span aria-hidden="true"> · </span>
        <span>thumb travel {thumbText(day.tally)}</span>
        {lm && <span className="wf-lm"> ≈ {lm}</span>}
      </p>
    </div>
  );
}

/* ---------- receipts ---------- */
function Receipt({ k, tally, picks, onClose }: { k: MetricKey; tally: Tally; picks: Day['picks']; onClose: () => void }) {
  const m = META[k];
  const v = metricsOf(tally)[k];
  const fed = picksFor(k, picks);
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), [k]);
  const chapterOf = (id: string) => CHAPTERS.find((c) => c.buzzes.some((b) => b.id === id))?.title ?? '';
  return (
    <aside className="wf-receipt" aria-label={`Receipt: ${m.prop}`}>
      <div className="wf-receipt-top">
        <span className="wf-app">Receipt</span>
        <IconBtn d={I.close} label="Close receipt" onClick={onClose} />
      </div>
      <h2 tabIndex={-1} ref={ref}>
        {m.prop}
      </h2>
      <p className="wf-big">{valueText(k, v)}</p>
      <p className="wf-small">
        {m.name}: {ordinaryRatio(v, NORMAL_M[k])}.
      </p>
      <dl>
        <dt>How it’s worked out</dt>
        <dd>{m.formula}</dd>
        {fed.length > 0 && (
          <>
            <dt>What you did</dt>
            <dd>
              <ul>
                {fed.map((p) => (
                  <li key={p.buzz}>
                    {chapterOf(p.buzz)} · {p.label}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
        <dt>To tidy it</dt>
        <dd>{m.advice}</dd>
      </dl>
    </aside>
  );
}

/* ---------- How to play: five beats on the real screen ---------- */
const COACH = [
  { target: 'garden', title: 'This is your backyard', body: 'It starts tidy. Your phone habits grow mess in it: one kind of mess for each habit.' },
  { target: 'phone', title: 'Your phone will buzz', body: 'Twelve times, from morning to night. Read the message, then pick one of two answers.' },
  { target: 'choices', title: 'Try it now', body: 'Tap “Share it now” and watch your lawn.', action: true },
  { target: 'hud', title: 'The clock and your thumb', body: 'Scrolling eats time, so the clock jumps. Your thumb travels too: about 14 cm every swipe.' },
  { target: 'garden', title: 'At night, tap the mess', body: 'Every piece of mess has a receipt with the number behind the joke. Try tapping a newspaper.' },
] as const;

function Spotlight({ target, stage }: { target: string; stage: HTMLElement | null }) {
  const [r, setR] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const find = () => {
      const el = stage?.querySelector<Element>(`[data-coach="${target}"]`);
      setR(el ? el.getBoundingClientRect() : null);
    };
    find();
    const t = setTimeout(find, 450);
    const t2 = setTimeout(find, 1300);
    window.addEventListener('resize', find);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener('resize', find);
    };
  }, [target, stage]);
  if (!r) return null;
  const pad = 8;
  return <div className="wf-spot" aria-hidden="true" style={{ left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 }} />;
}

/* ---------- the game ---------- */
export function Game({ trackerHref }: { trackerHref?: string }) {
  const narrow = useNarrow();
  const stageRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  const [scene, setScene] = useState<Scene>('title');
  const [info, setInfo] = useState(false);
  const [sound, setSnd] = useState(soundOn());
  const [day, setDay] = useState<Day>(newDay);
  const [ci, setCi] = useState(0);
  const [bi, setBi] = useState(0);
  const [late, setLate] = useState<string | null>(null);
  const [picked, setPicked] = useState<Choice | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [open, setOpen] = useState<MetricKey | null>(null);
  const [last, setLast] = useState<LastDay | null>(null);
  const [coach, setCoach] = useState(0);
  const [practice, setPractice] = useState<{ tally: Tally; picked: Choice | null }>({ tally: { ...START_TALLY }, picked: null });
  const [, force] = useState(0);
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null);
  useEffect(() => setStageEl(stageRef.current), []);

  const chapter = CHAPTERS[ci];
  const buzz = chapter.buzzes[bi];

  // What the garden shows
  const tally = scene === 'howto' ? practice.tally : scene === 'title' ? START_TALLY : day.tally;
  const levels = useMemo(() => {
    if (scene === 'howto' && coach === 4) return levelsOf({ ...practice.tally, links: Math.max(1, practice.tally.links), videoMin: 30, unread: 30, laughs: 2, msgs: 11 });
    return levelsOf(tally);
  }, [tally, scene, coach, practice.tally]);
  const light: Light = scene === 'title' ? 'title' : scene === 'reveal' ? 'clear' : scene === 'howto' ? (coach === 4 ? 'clear' : 'day') : chapter.light;

  // page title per scene
  useEffect(() => {
    const t: Record<Scene, string> = {
      title: 'Your Garden Knows',
      howto: `How to play · ${COACH[coach].title}`,
      chapter: `${chapter.title} · Your Garden Knows`,
      buzz: `${chapter.title} · ${buzz.app}`,
      outcome: `${chapter.title} · ${buzz.app}`,
      reveal: `Your garden: ${tierOf(day.tally)}`,
    };
    document.title = info ? 'What is this? · Your Garden Knows' : t[scene];
  }, [scene, coach, chapter, buzz, day.tally, info]);

  const startDay = useCallback(() => {
    sfx.tap();
    setDay(newDay());
    setCi(0);
    setBi(0);
    setLate(null);
    setPicked(null);
    setOpen(null);
    setInfo(false);
    setScene('chapter');
  }, []);

  const goTitle = () => {
    setScene('title');
    setOpen(null);
    setInfo(false);
  };

  const startHowto = () => {
    sfx.tap();
    setPractice({ tally: { ...START_TALLY }, picked: null });
    setCoach(0);
    setOpen(null);
    setInfo(false);
    setScene('howto');
  };

  // chapter card auto-advances
  useEffect(() => {
    if (scene !== 'chapter') return;
    const t = setTimeout(() => {
      setScene('buzz');
    }, late ? 4200 : 2200);
    return () => clearTimeout(t);
  }, [scene, ci, late]);

  // buzz arrives
  useEffect(() => {
    if (scene === 'buzz') {
      sfx.buzz();
      const t = setTimeout(() => msgRef.current?.focus({ preventScroll: true }), 50);
      return () => clearTimeout(t);
    }
  }, [scene, ci, bi]);

  const choose = (c: Choice) => {
    const before = levelsOf(day.tally);
    const next = applyChoice(day, buzz, c);
    const after = levelsOf(next.tally);
    setDay(next);
    setPicked(c);
    setChanges(changeList(before, after).filter((x) => x.tone !== 'same').map((x) => x.text));
    if (mess(after) > mess(before) + 0.005) sfx.grow();
    else sfx.calm();
    setScene('outcome');
  };

  const advance = () => {
    sfx.tap();
    setPicked(null);
    setLate(null);
    if (bi + 1 < chapter.buzzes.length) {
      setBi(bi + 1);
      setScene('buzz');
      return;
    }
    if (ci + 1 < CHAPTERS.length) {
      const { day: d, late: isLate } = enterChapter(day, ci + 1);
      setDay(d);
      setCi(ci + 1);
      setBi(0);
      if (isLate) setLate(`It’s already ${clockText(d.clock)}. Your phone ate the start of the ${CHAPTERS[ci + 1].title.toLowerCase()}.`);
      setScene('chapter');
      return;
    }
    setLast(loadLast());
    saveLast(day.tally);
    sfx.reveal();
    setScene('reveal');
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') {
        if (open) return setOpen(null);
        if (info) return setInfo(false);
        if (scene === 'howto') return goTitle();
      }
      if (info) return;
      if (scene === 'buzz' && (e.key === '1' || e.key === '2')) choose(buzz.choices[+e.key - 1]);
      if (scene === 'chapter' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setScene('buzz');
      }
      if (scene === 'howto') {
        if (e.key === 'ArrowRight' && coachCanNext) setCoach((c) => Math.min(4, c + 1));
        if (e.key === 'ArrowLeft') setCoach((c) => Math.max(0, c - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // gentle parallax
  const [par, setPar] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (reducedMotion()) return;
    const f = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      setPar({ x: (e.clientX / window.innerWidth - 0.5) * -14, y: (e.clientY / window.innerHeight - 0.5) * -10 });
    };
    window.addEventListener('pointermove', f);
    return () => window.removeEventListener('pointermove', f);
  }, []);

  const toggleFull = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      /* not supported */
    }
    force((n) => n + 1);
  };

  const coachStep = COACH[coach];
  const coachCanNext = !('action' in coachStep) || Boolean(practice.picked);
  const finalTier = tierOf(day.tally);
  const playing = scene === 'buzz' || scene === 'outcome' || scene === 'chapter';
  const shift = narrow
    ? ''
    : playing || (scene === 'howto' && coach > 0 && coach < 4)
      ? ' shifted'
      : scene === 'reveal' || scene === 'howto'
        ? ' shifted-r'
        : '';
  const t = day.tally;
  const thumbLm = thumbLandmark(t);

  return (
    <div className={`wf scene-${scene}${narrow ? ' narrow' : ''}${open ? ' has-receipt' : ''}`} ref={stageRef}>
      <a className="wf-skip" href="#wf-main">
        Skip to the game
      </a>
      <div className={'wf-art' + shift} style={{ ['--px' as string]: `${par.x}px`, ['--py' as string]: `${par.y}px` }}>
        <div className="wf-art-in">
          <Street
            levels={levels}
            light={light}
            narrow={narrow}
            interactive={scene === 'reveal' || (scene === 'howto' && coach === 4)}
            selected={open}
            onOpen={(k) => {
              sfx.tap();
              setOpen((o) => (o === k ? null : k));
            }}
            label={`Your backyard: ${tier(mess(levels))}`}
          />
        </div>
      </div>

      {/* corner clusters */}
      <div className="wf-corner left">
        {scene !== 'title' && <IconBtn d={I.home} label="Back to the title" onClick={goTitle} />}
        {(playing || scene === 'reveal') && <IconBtn d={I.restart} label="Start the day again" onClick={startDay} />}
        <IconBtn d={I.info} label="What is this?" onClick={() => setInfo(true)} pressed={info} />
      </div>
      <div className="wf-corner right">
        <IconBtn
          d={sound ? I.soundOn : I.soundOff}
          label={sound ? 'Sound on' : 'Sound off'}
          pressed={sound}
          onClick={() => {
            setSound(!sound);
            setSnd(!sound);
          }}
        />
        {typeof document !== 'undefined' && document.fullscreenEnabled && <IconBtn d={I.full} label="Full screen" onClick={toggleFull} />}
      </div>

      <main id="wf-main" className="wf-main">
        {scene === 'title' && (
          <div className="wf-title">
            <h1>Your garden knows</h1>
            <p className="wf-sub">
              One day. One phone.
              <br />
              One backyard that remembers everything.
            </p>
            <div className="wf-stack">
              <Btn onClick={startDay} autoFocus>
                Play
              </Btn>
              <Btn kind="quiet" onClick={startHowto}>
                How to play
              </Btn>
            </div>
            <p className="wf-note">About 3 minutes · For all ages · Nothing you choose leaves this browser</p>
          </div>
        )}

        {scene === 'chapter' && (
          <button type="button" className="wf-chapter" onClick={() => setScene('buzz')} aria-label={`${chapter.title}. Continue`}>
            <span className="wf-chapter-n">
              {ci + 1} / {CHAPTERS.length}
            </span>
            <span className="wf-chapter-t">{chapter.title}</span>
            <span className="wf-chapter-s">
              {clockText(day.clock)} · {chapter.sub}
            </span>
            {late && <span className="wf-chapter-late">{late}</span>}
          </button>
        )}

        {(scene === 'buzz' || scene === 'outcome') && (
          <>
            <Hud day={day} />
            <Phone
              buzz={buzz}
              onChoose={choose}
              outcome={scene === 'outcome' ? picked : null}
              changes={changes}
              onNext={advance}
              nextLabel={bi + 1 < chapter.buzzes.length ? 'Next' : ci + 1 < CHAPTERS.length ? `On to the ${CHAPTERS[ci + 1].title.toLowerCase()}` : 'See your garden'}
              late={bi === 0 && scene === 'buzz' ? late : null}
              headingRef={msgRef}
              count={`${ci * 3 + bi + 1} of 12`}
            />
            <Progress ci={ci} bi={bi} done={scene === 'outcome'} />
          </>
        )}

        {scene === 'howto' && (
          <>
            {coach < 4 && <Hud day={{ ...newDay(), tally: practice.tally, clock: 7 * 60 + (practice.picked ? practice.picked.minutes : 0) }} />}
            {coach < 4 && (
              <Phone
                buzz={PRACTICE}
                lockChoices={coach !== 2}
                onChoose={(c) => {
                  const before = levelsOf(practice.tally);
                  const next = applyChoice({ tally: practice.tally, clock: 0, picks: [] }, PRACTICE, c).tally;
                  if (mess(levelsOf(next)) > mess(before)) sfx.grow();
                  else sfx.calm();
                  setPractice({ tally: next, picked: c });
                }}
                outcome={practice.picked}
                count="Practice"
              >
                {practice.picked && coach === 2 && (
                  <button type="button" className="wf-link" onClick={() => setPractice({ tally: { ...START_TALLY }, picked: null })}>
                    Try the other answer
                  </button>
                )}
              </Phone>
            )}
            {coach === 4 && open && <Receipt k={open} tally={{ ...practice.tally, links: Math.max(1, practice.tally.links), videoMin: 30, unread: 30, laughs: 2, msgs: 11 }} picks={[]} onClose={() => setOpen(null)} />}
            <Spotlight target={coach === 2 && practice.picked ? 'garden' : coachStep.target} stage={stageEl} />
            <div className={'wf-coach' + (narrow && (coach === 0 || coach === 3 || coach === 4 || (coach === 2 && practice.picked)) ? ' low' : '')} role="dialog" aria-modal="false" aria-labelledby="wf-coach-h">
              <p className="wf-step">
                How to play · {coach + 1} of {COACH.length}
              </p>
              <h2 id="wf-coach-h" key={coach} tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })}>
                {coachStep.title}
              </h2>
              <p className="wf-coach-b">
                {'action' in coachStep && practice.picked
                  ? practice.picked.phone
                    ? 'That’s the whole game: every answer changes your garden. Try the other answer, or tap Next.'
                    : 'Nothing landed. Now try “Share it now” and watch your lawn.'
                  : coachStep.body}
              </p>
              <div className="wf-coach-nav">
                <button type="button" className="wf-link" onClick={() => (coach === 0 ? goTitle() : setCoach(coach - 1))}>
                  {coach === 0 ? 'Skip' : 'Back'}
                </button>
                <ol className="wf-dotsbar" aria-hidden="true">
                  {COACH.map((_, i) => (
                    <li key={i} className={i === coach ? 'on' : i < coach ? 'past' : ''} />
                  ))}
                </ol>
                {coach < 4 ? (
                  <Btn onClick={() => setCoach(coach + 1)} disabled={!coachCanNext}>
                    Next
                  </Btn>
                ) : (
                  <Btn onClick={startDay}>Play my day</Btn>
                )}
              </div>
            </div>
          </>
        )}

        {scene === 'reveal' && (
          <>
            <div className="wf-reveal" aria-live="polite">
              <p className="wf-step">The next morning, your garden knows</p>
              <h1>{finalTier}</h1>
              <p className="wf-sub">{TIER_LINE[finalTier]}</p>
              <ul className="wf-facts">
                <li>
                  {metricsOf(t).thumb >= 5 ? (
                    <>
                      Your thumb travelled <b>{thumbText(t)}</b>
                      {thumbLm ? `: about ${thumbLm}` : ''}.
                    </>
                  ) : (
                    <>Your thumb barely moved. It feels well rested.</>
                  )}
                </li>
                <li>
                  <b>{durText(phoneMinutes(t))}</b> on your phone. Lights out at <b>{clockText(day.clock)}</b>.
                </li>
                <li>
                  <b>{t.links}</b> {t.links === 1 ? 'link' : 'links'} shared without opening · <b>{t.forwards}</b> {t.forwards === 1 ? 'forward' : 'forwards'} blown next door.
                </li>
              </ul>
              {last && <p className="wf-last">Your last day: {last.tier}. Today: {finalTier}.</p>}
              <p className="wf-hint">Tap anything in your garden to see its receipt.</p>
              {narrow && <PropKeys onOpen={setOpen} open={open} />}
              <div className="wf-stack row">
                <Btn onClick={startDay}>Play another day</Btn>
                <Btn kind="quiet" onClick={() => setInfo(true)}>
                  What is this?
                </Btn>
              </div>
            </div>
            {open && <Receipt k={open} tally={t} picks={day.picks} onClose={() => setOpen(null)} />}
            {!narrow && <PropKeys onOpen={setOpen} open={open} />}
          </>
        )}
      </main>

      {info && <Info onClose={() => setInfo(false)} onPlay={startDay} onHowto={startHowto} trackerHref={trackerHref} />}
    </div>
  );
}

function Progress({ ci, bi, done }: { ci: number; bi: number; done: boolean }) {
  const n = ci * 3 + bi + (done ? 1 : 0);
  return (
    <div className="wf-progress" aria-label={`${n} of 12 answered`}>
      {CHAPTERS.map((c, i) => (
        <div key={c.id} className={'seg' + (i === ci ? ' on' : '')}>
          <span>{c.title}</span>
          <i>
            {c.buzzes.map((b, j) => (
              <b key={b.id} className={i * 3 + j < n ? 'filled' : ''} />
            ))}
          </i>
        </div>
      ))}
    </div>
  );
}

/** Keyboard and small-screen access to receipts: one quiet text button per prop. */
function PropKeys({ onOpen, open }: { onOpen: (k: MetricKey) => void; open: MetricKey | null }) {
  return (
    <nav className="wf-propkeys" aria-label="Receipts">
      {KEYS.map((k) => (
        <button key={k} type="button" className={open === k ? 'on' : ''} aria-pressed={open === k} onClick={() => onOpen(k)}>
          {META[k].propShort}
        </button>
      ))}
    </nav>
  );
}

function Info({ onClose, onPlay, onHowto, trackerHref }: { onClose: () => void; onPlay: () => void; onHowto: () => void; trackerHref?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="wf-info" role="dialog" aria-modal="true" aria-labelledby="wf-info-h">
      <div className="wf-info-top">
        <IconBtn d={I.close} label="Close" onClick={onClose} />
      </div>
      <div className="wf-info-in">
        <h2 id="wf-info-h" tabIndex={-1} ref={ref}>
          What is this?
        </h2>
        <p className="wf-lede">
          An absurd, honest mirror of a day on your phone. Every share without opening, every forward and every “one more video” grows something silly in your
          backyard. It doesn’t judge whether anything is true. It just shows how you share, and how much of your day the phone eats.
        </p>
        <h3>Six silly measures</h3>
        <table className="wf-table">
          <tbody>
            {KEYS.map((k) => (
              <tr key={k}>
                <th scope="row">{META[k].prop}</th>
                <td>{META[k].name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="wf-small">
          The game compares you only with an ordinary day. Twice an ordinary day is maximum mess. There are no scores against other people, ever.
        </p>
        <h3>Why it looks like this</h3>
        <p className="wf-small">
          Notice that the loud white button is always the phone answer. That’s on purpose: it’s how a lot of apps nudge us, and design is part of the
          problem as well as part of the fix. The headlines are silly so nobody has to feel told off. Opening first or checking where something came from is
          the whole tidy-up.
        </p>
        <h3>Your privacy</h3>
        <p className="wf-small">Nothing you choose here is sent anywhere. Only your last result is kept, in this browser, so you can compare you with you.</p>
        <h3>About</h3>
        <p className="wf-small">
          Your Garden Knows, by Neel Parikh. UNSW Master of Design, DDES9016/9017. A speculative design probe for UN SDG 16.10: public access to information.
        </p>
        <div className="wf-stack row">
          <Btn onClick={onPlay}>Play</Btn>
          <Btn kind="quiet" onClick={onHowto}>
            How to play
          </Btn>
          {trackerHref && (
            <a className="wf-btn quiet" href={trackerHref}>
              <span>Grow your real garden</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
