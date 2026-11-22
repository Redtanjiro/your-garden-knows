import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGarden } from '../data/store';
import { CHALLENGES, challengeMeta } from '../engine/meta';
import { projectChallenge, propCountFor } from '../engine/stories';
import type { ChallengeType } from '../engine/types';
import { Garden } from '../garden/Garden';
import { MetricTile, usePageTitle, useToast } from '../ui/common';

export function TidyUp() {
  usePageTitle('Tidy up');
  const g = useGarden();
  const toast = useToast();
  const [params] = useSearchParams();
  const active = g.challenges.find((c) => c.status === 'active');
  const requested = params.get('start') as ChallengeType | null;
  const [picked, setPicked] = useState<ChallengeType>(active?.type ?? (requested && CHALLENGES.some((c) => c.type === requested) ? requested : 'open-before-share'));
  const [confirmStop, setConfirmStop] = useState(false);
  const focus = active?.type ?? picked;
  const cm = challengeMeta(focus);
  const proj = useMemo(() => projectChallenge(g.days, g.profile!.normal, focus, g.today), [g.days, g.profile, focus, g.today]);
  const before = propCountFor(cm.metric, proj.now);
  const after = propCountFor(cm.metric, proj.after);

  const start = async (t: ChallengeType) => {
    try {
      await g.actions.startChallenge(t);
      setPicked(t);
      toast('Challenge started. Tick it off each evening.');
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  const log = async () => {
    if (!active) return;
    try {
      const r = await g.actions.logChallenge(active.id);
      toast(r === 'done' ? 'Challenge done. Nice patch.' : 'Logged. See you tomorrow.', false, r === 'done');
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  const stop = async () => {
    if (!active) return;
    try {
      await g.actions.stopChallenge(active.id);
      setConfirmStop(false);
      toast('Challenge stopped. Start another whenever you like.');
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const others = CHALLENGES.filter((c) => c.type !== focus);
  const done = g.challenges.filter((c) => c.status === 'done');
  return (
    <main className="page">
      <h1>Tidy up, one patch at a time.</h1>
      <p className="lede">Pick a small challenge. Each one clears one thing in your garden. One at a time.</p>

      <section className={`challenge`} style={{ marginTop: 32 }} aria-labelledby="ch-title">
        <span className={`bar-l mt-${cm.metric}`} aria-hidden="true" />
        <div className="in split" style={{ gap: 40 }}>
          <div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <MetricTile k={cm.metric} size={56} />
              <span className={'badge' + (active ? '' : ' muted')}>{active ? 'In progress' : 'Suggested'}</span>
            </div>
            <h2 id="ch-title" className="heading-s" style={{ marginTop: 20 }}>
              {cm.title}
            </h2>
            <p style={{ marginTop: 10 }}>{cm.body}</p>
            {active ? (
              <>
                <ol className="ticks" aria-label="Days">
                  {Array.from({ length: active.days }, (_, i) => {
                    const on = i < active.log.length;
                    return (
                      <li key={i} className={on ? 'on' : ''}>
                        <span aria-hidden="true">{on ? '✓' : ''}</span>
                        Day {i + 1}
                        <span className="sr-only">{on ? ', done' : ', not yet'}</span>
                      </li>
                    );
                  })}
                </ol>
                <div className="btnrow">
                  <button type="button" className="btn" onClick={log} disabled={active.log.includes(g.today)}>
                    {active.log.includes(g.today) ? 'Logged today' : 'Log today'}
                  </button>
                  {confirmStop ? (
                    <span className="btnrow" role="group" aria-label="Confirm stopping">
                      <span>Stop this challenge?</span>
                      <button type="button" className="btn danger small" onClick={stop}>
                        Stop challenge
                      </button>
                      <button type="button" className="btn outline small" onClick={() => setConfirmStop(false)}>
                        Keep going
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="btn danger" onClick={() => setConfirmStop(true)}>
                      Stop challenge
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="btnrow" style={{ marginTop: 24 }}>
                <button type="button" className="btn" onClick={() => start(focus)}>
                  Start a tidy-up
                </button>
                <span className="mono muted">{cm.short}</span>
              </div>
            )}
            <p className="muted" style={{ marginTop: 16 }}>
              {cm.clears}
            </p>
          </div>
          <div>
            <div className="grid-2" style={{ gap: 12 }}>
              <figure className="pair-fig">
                <Garden levels={proj.now} name="Now" animate={false} label="Your garden now" />
                <figcaption>
                  <b>Now</b>
                </figcaption>
              </figure>
              <figure className="pair-fig">
                <Garden
                  levels={proj.after}
                  name="Projection"
                  animate={false}
                  label={`Projection, not your real garden: how it could look after ${cm.days} days of this challenge, if everything else stays the same`}
                />
                <figcaption>
                  <b>
                    After <span className="mono">{cm.days}</span> days
                  </b>
                  <span className="badge muted">Projection</span>
                </figcaption>
              </figure>
            </div>
            <p className="mono" style={{ marginTop: 14, textAlign: 'center' }}>
              {before} → {after} {cm.propNoun}
            </p>
            <p className="muted" style={{ textAlign: 'center', marginTop: 4 }}>
              A projection only. Your garden changes from your check-ins, not from the challenge.
            </p>
          </div>
        </div>
      </section>

      <h2 style={{ marginTop: 48 }}>{active ? 'More challenges' : 'Other challenges'}</h2>
      <div className="grid-2" style={{ marginTop: 16, gap: 12 }}>
        {others.map((c) => (
          <div key={c.type} className="ccard">
            <MetricTile k={c.metric} size={64} />
            <div>
              <b>{c.title}</b>
              <p className="mono muted" style={{ fontSize: 14, marginTop: 2 }}>
                {c.short}
              </p>
              <p style={{ marginTop: 4 }}>{c.clears}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {active ? (
                <>
                  <button type="button" className="btn small" disabled aria-describedby={`after-${c.type}`}>
                    Start
                  </button>
                  <p className="caption" id={`after-${c.type}`} style={{ marginTop: 4 }}>
                    after your current one
                  </p>
                </>
              ) : (
                <button type="button" className="btn small outline" onClick={() => setPicked(c.type)} aria-label={`Preview ${c.title}`}>
                  Preview
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <p className="muted" style={{ marginTop: 24 }}>
          Finished so far: {done.map((d) => challengeMeta(d.type).title).join(', ')}.
        </p>
      )}
    </main>
  );
}
