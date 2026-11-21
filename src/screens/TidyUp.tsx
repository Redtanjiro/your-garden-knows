import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGarden } from '../data/store';
import { CHALLENGES, challengeMeta } from '../engine/meta';
import { projectChallenge, propCountFor } from '../engine/stories';
import type { ChallengeType } from '../engine/types';
import { Garden } from '../garden/Garden';
import { PropIcon, usePageTitle, useToast } from '../ui/common';

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
      toast(r === 'done' ? 'Challenge done. Nice patch.' : 'Logged. See you tomorrow.');
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

      <section className="paper" style={{ marginTop: 32, padding: 28 }} aria-labelledby="ch-title">
        <div className="split" style={{ gap: 32 }}>
          <div>
            <span className={'badge' + (active ? '' : ' muted')}>{active ? 'In progress' : 'Suggested'}</span>
            <h2 id="ch-title" style={{ fontSize: 26, marginTop: 10 }}>
              {cm.title}
            </h2>
            <p style={{ marginTop: 8 }}>{cm.body}</p>
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
                      <button type="button" className="btn ghost small" onClick={() => setConfirmStop(false)}>
                        Keep going
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="btn ghost" onClick={() => setConfirmStop(true)}>
                      Stop challenge
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="btnrow" style={{ marginTop: 20 }}>
                <button type="button" className="btn" onClick={() => start(focus)}>
                  Start a tidy-up
                </button>
                <span className="caption">{cm.short}</span>
              </div>
            )}
            <p className="caption" style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <PropIcon k={cm.metric} size={20} /> {cm.clears}
            </p>
          </div>
          <div>
            <div className="grid-2" style={{ gap: 14 }}>
              <figure style={{ margin: 0 }}>
                <Garden levels={proj.now} name="Now" animate={false} label="Your garden now" />
                <figcaption className="caption" style={{ marginTop: 6, textAlign: 'center' }}>
                  Now
                </figcaption>
              </figure>
              <figure style={{ margin: 0 }}>
                <Garden
                  levels={proj.after}
                  name="Projection"
                  animate={false}
                  label={`Projection, not your real garden: how it could look after ${cm.days} days of this challenge, if everything else stays the same`}
                />
                <figcaption className="caption" style={{ marginTop: 6, textAlign: 'center' }}>
                  After {cm.days} days <span className="badge muted">projection</span>
                </figcaption>
              </figure>
            </div>
            <p style={{ marginTop: 12, textAlign: 'center', fontWeight: 600, color: 'var(--ink)' }}>
              {before} → {after} {cm.propNoun}
            </p>
            <p className="caption" style={{ textAlign: 'center' }}>
              A projection only. Your garden changes from your check-ins, not from the challenge.
            </p>
          </div>
        </div>
      </section>

      <h2 style={{ marginTop: 40, fontSize: 22 }}>{active ? 'More challenges' : 'Other challenges'}</h2>
      <div className="grid-2" style={{ marginTop: 16, gap: 12 }}>
        {others.map((c) => (
          <div key={c.type} className="card" style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 14, alignItems: 'center' }}>
            <PropIcon k={c.metric} />
            <div>
              <b style={{ color: 'var(--ink)' }}>{c.title}</b>
              <p className="caption">{c.short}</p>
              <p style={{ fontSize: 14 }}>{c.clears}</p>
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
                <button type="button" className="btn small secondary" onClick={() => setPicked(c.type)} aria-label={`Preview ${c.title}`}>
                  Preview
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <p className="caption" style={{ marginTop: 24 }}>
          Finished so far: {done.map((d) => challengeMeta(d.type).title).join(', ')}.
        </p>
      )}
    </main>
  );
}
