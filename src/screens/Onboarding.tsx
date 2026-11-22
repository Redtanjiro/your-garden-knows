import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGarden } from '../data/store';
import { META } from '../engine/meta';
import { DEFAULT_NORMAL } from '../engine/metrics';
import type { Levels, MetricKey, Profile, RawDay, Reminder } from '../engine/types';
import { KEYS } from '../engine/types';
import { Garden } from '../garden/Garden';
import { appUrl, download, local, reminderICS } from '../lib/files';
import { Bubble, MetricTile, SliderField, usePageTitle, useToast } from '../ui/common';

export interface Draft {
  dataMode: Profile['dataMode'];
  normal: RawDay;
  name: string;
  reminder: Reminder;
}
const DRAFT_KEY = 'ygk-onboarding';
const DEFAULT_DRAFT: Draft = {
  dataMode: 'checkin',
  normal: DEFAULT_NORMAL,
  name: '',
  reminder: { time: '20:00', calendarAdded: true, inApp: true },
};
let memoryDraft: Draft | null = null;
function useDraft(): [Draft, (p: Partial<Draft>) => void] {
  const [d, setD] = useState<Draft>(() => memoryDraft ?? { ...DEFAULT_DRAFT, ...local.get<Partial<Draft>>(DRAFT_KEY, {}) });
  const update = (p: Partial<Draft>) =>
    setD((cur) => {
      const next = { ...cur, ...p };
      memoryDraft = next;
      local.set(DRAFT_KEY, next);
      return next;
    });
  return [d, update];
}

function Step({ n, title, lede, children, back, next, nextLabel = 'Continue', busy, backLabel = 'Back' }: { n: number; title: string; lede: string; children: ReactNode; back: () => void; next: () => void; nextLabel?: string; busy?: boolean; backLabel?: string }) {
  usePageTitle(title);
  return (
    <>
      <div className="progress" role="img" aria-label={`Step ${n} of 4`}>
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= n ? 'on' : ''} />
        ))}
      </div>
      <main className="page onb-page">
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
        <div style={{ marginTop: 40 }}>{children}</div>
      </main>
      <div className="onb-foot">
        <div>
          <button type="button" className="btn outline" onClick={back}>
            {backLabel}
          </button>
          <button type="button" className="btn" onClick={next} disabled={busy}>
            {nextLabel}
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- 2. How it works ---------- */
export function HowItWorks() {
  const nav = useNavigate();
  const points = [
    ['Tell it about your day', 'Move six sliders each evening, or drop in your app exports once. Rough numbers are fine.'],
    ['Six silly measures', 'Each measure looks after one thing in the garden, so you can read the mess part by part.'],
    ['Every weed has a receipt', 'Click anything in the garden to see the number behind it, how it’s worked out and how to tidy it.'],
  ];
  return (
    <Step n={1} title="Here’s how your garden grows." lede="Three things to know before you plant. It takes about four minutes to set up." back={() => nav('/')} next={() => nav('/start/data')}>
      <div className="split">
        <ol className="stack-24" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {points.map(([t, b], i) => (
            <li key={t} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12 }}>
              <span className="numdot">{i + 1}</span>
              <div>
                <h2>{t}</h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  {b}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="panel how-diagram" aria-label="Inputs become measures, measures become props">
          <div className="how-col">
            {['Minutes on short video', 'Steps', 'Links shared unopened', '😂 per 10 messages'].map((x) => (
              <span key={x} className="chip" style={{ cursor: 'default' }}>
                {x}
              </span>
            ))}
          </div>
          <div className="how-arrow" aria-hidden="true">
            →
          </div>
          <ul className="how-list">
            {KEYS.map((k) => (
              <li key={k}>
                <MetricTile k={k} size={32} />
                <span>
                  <b>{META[k].name}</b>
                  <span className="muted" style={{ display: 'block' }}>
                    {META[k].prop}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
            <Bubble sender="Newspaper" time="8:04 pm" white>
              1 link shared without opening it, so 1 newspaper.
            </Bubble>
          </div>
        </div>
      </div>
      <p className="ok-panel" style={{ marginTop: 32 }}>
        It never decides what’s true. It only shows habits, compared with your own normal, not anyone else’s.
      </p>
    </Step>
  );
}

/* ---------- 3. Choose data ---------- */
export function ChooseData() {
  const nav = useNavigate();
  const [d, set] = useDraft();
  const exportsMode = d.dataMode === 'exports';
  return (
    <Step
      n={2}
      title="How should your garden get its numbers?"
      lede="Pick one to start. You can add the other later in Settings."
      back={() => nav('/start')}
      next={() => nav('/start/normal')}
      nextLabel={exportsMode ? 'Continue with exports' : 'Continue with quick check-in'}
    >
      <fieldset className="grid-2" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="sr-only">Data source</legend>
        <label className="radiocard">
          <input type="radio" name="mode" checked={!exportsMode} onChange={() => set({ dataMode: 'checkin' })} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="radiodot" />
            <h2>Quick check-in</h2>
            <span className="badge">Recommended</span>
          </div>
          <p className="mono muted" style={{ margin: '8px 0 0 32px', fontSize: 14 }}>
            About 2 minutes each evening
          </p>
          <p style={{ margin: '8px 0 0 32px' }}>Move six sliders using Screen Time and a glance at your chats. Best for a daily habit.</p>
          <div className="mini-sliders" aria-hidden="true">
            {[0.45, 0.3, 0.2, 0.6].map((v, i) => (
              <div key={i}>
                <i style={{ width: `${v * 100}%` }} />
              </div>
            ))}
          </div>
        </label>
        <label className="radiocard">
          <input type="radio" name="mode" checked={exportsMode} onChange={() => set({ dataMode: 'exports' })} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="radiodot" />
            <h2>Bring your exports</h2>
          </div>
          <p className="mono muted" style={{ margin: '8px 0 0 32px', fontSize: 14 }}>
            One-off, about 10 minutes
          </p>
          <p style={{ margin: '8px 0 0 32px' }}>Drop in a WhatsApp chat and your TikTok or Instagram history. More accurate, less often.</p>
          <div className="mini-files" aria-hidden="true">
            <span>Family chat.txt</span>
            <span>user_data_tiktok.json</span>
            <span>Average steps: 4,500</span>
          </div>
        </label>
      </fieldset>
      <div className="ok-panel" style={{ marginTop: 24 }}>
        <div className="ok-title">Your numbers never leave this device; streets share pictures only, never numbers.</div>
        <p style={{ marginTop: 4 }}>Check-ins and files are read and stored in your browser, never uploaded. Delete it all any time in Settings.</p>
      </div>
    </Step>
  );
}

/* ---------- 4. Set your normal ---------- */
export const NORMAL_FIELDS: { key: keyof RawDay; metric: MetricKey; label: string; hint: string; min: number; max: number; step: number; sliderMax: number; unit?: string }[] = [
  { key: 'shortVideoMinutes', metric: 'thumb', label: 'Minutes on short video', hint: 'Screen Time → Most used', min: 0, max: 600, step: 5, sliderMax: 300, unit: 'min' },
  { key: 'steps', metric: 'potato', label: 'Steps', hint: 'Health app → Steps', min: 0, max: 50000, step: 100, sliderMax: 20000 },
  { key: 'linksUnopened', metric: 'headline', label: 'Links shared without opening them', hint: 'Your best guess', min: 0, max: 50, step: 1, sliderMax: 10 },
  { key: 'forwards', metric: 'forwards', label: 'Messages forwarded with a "Forwarded" label', hint: 'Look for the label in your chats', min: 0, max: 50, step: 1, sliderMax: 10 },
  { key: 'laughPer10', metric: 'laugh', label: '😂 per 10 messages you send', hint: 'Scroll your last few chats', min: 0, max: 10, step: 0.5, sliderMax: 10 },
  { key: 'unread', metric: 'seen', label: 'Unread badge on your busiest chat', hint: 'The number on the chat', min: 0, max: 999, step: 1, sliderMax: 200 },
];

const at = (v: number): Levels => ({ thumb: v, headline: v, forwards: v, potato: v, laugh: v, seen: v });

export function NormalExplainer() {
  return (
    <aside className="panel stack-16" style={{ background: 'var(--mint)', borderColor: 'var(--mint)' }}>
      <h2>How your normal is used</h2>
      <p>Each measure is scored against your normal. At your normal, a patch looks lived-in. At twice your normal, it’s as messy as it gets.</p>
      <div className="grid-3" style={{ gap: 10 }}>
        {[
          ['Below normal', 0.15],
          ['Your normal', 0.5],
          ['Twice normal', 1],
        ].map(([t, v]) => (
          <figure key={t as string} style={{ margin: 0 }}>
            <Garden levels={at(v as number)} name={t as string} animate={false} label={`${t}: example garden`} />
            <figcaption style={{ textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
              {t}
            </figcaption>
          </figure>
        ))}
      </div>
      <p>Nothing is compared with other people, and there is no score to win.</p>
    </aside>
  );
}

export function SetNormal() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editing = params.get('edit') === '1';
  const { profile, actions } = useGarden();
  const toast = useToast();
  const [d, set] = useDraft();
  const [normal, setNormal] = useState<RawDay>(editing && profile ? profile.normal : d.normal);
  useEffect(() => {
    if (!editing) set({ normal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normal]);
  const save = async () => {
    if (!editing) return nav('/start/name');
    try {
      await actions.updateProfile({ normal });
      toast('Your normal is saved. Every measure now scores against it.');
      nav('/settings');
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  return (
    <Step
      n={3}
      title="What’s a normal day for you?"
      lede="Your garden compares you with you. Guess honestly; you can change these any time."
      back={() => nav(editing ? '/settings' : '/start/data')}
      next={save}
      nextLabel={editing ? 'Save my normal' : 'Continue'}
    >
      <div className="split">
        <div>
          {NORMAL_FIELDS.map((f) => (
            <SliderField
              key={f.key}
              icon={<MetricTile k={f.metric} size={40} />}
              label={f.label}
              hint={f.hint}
              value={normal[f.key]}
              min={f.min}
              max={f.max}
              step={f.step}
              sliderMax={f.sliderMax}
              unit={f.unit}
              onChange={(v) => setNormal((n) => ({ ...n, [f.key]: v }))}
            />
          ))}
        </div>
        <NormalExplainer />
      </div>
    </Step>
  );
}

/* ---------- 5. Name and reminder ---------- */
export function NameGarden() {
  const nav = useNavigate();
  const toast = useToast();
  const { actions } = useGarden();
  const [d, set] = useDraft();
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = d.name.trim();
  const error = !name ? 'Give your garden a name' : name.length > 40 ? 'Keep the name to 40 characters or fewer' : '';
  const time = d.reminder.time;
  const timeText = time === '09:00' ? '9:00 am' : '8:00 pm';

  const grow = async () => {
    setTouched(true);
    if (error) {
      document.getElementById('garden-name')?.focus();
      return;
    }
    setBusy(true);
    try {
      const calendar = Boolean(time && d.reminder.calendarAdded);
      await actions.createProfile({ gardenName: name, normal: d.normal, dataMode: d.dataMode, reminder: { time, calendarAdded: calendar, inApp: Boolean(time && d.reminder.inApp) } }, true);
      if (calendar && time) download('garden-reminder.ics', reminderICS(time, appUrl('/check-in')), 'text/calendar');
      local.del(DRAFT_KEY);
      memoryDraft = null;
      const join = local.get<string | null>('ygk-pending-join', null);
      if (join) nav(`/join/${join}`);
      else if (d.dataMode === 'exports') nav('/settings/data?first=1');
      else nav('/garden?first=1');
    } catch (e) {
      toast((e as Error).message, true);
      setBusy(false);
    }
  };

  return (
    <Step n={4} title="Last step: name your garden." lede="And pick when to check in. Gardens grow best with a little every day." back={() => nav('/start/normal')} next={grow} nextLabel="Grow my garden" busy={busy}>
      <div className="split">
        <div className="stack-24">
          <div>
            <label className="field" htmlFor="garden-name">
              Garden name
            </label>
            <input
              id="garden-name"
              className={'input' + (touched && error ? ' invalid' : '')}
              style={{ marginTop: 8, maxWidth: 420 }}
              value={d.name}
              maxLength={60}
              placeholder="Neel’s backyard"
              aria-invalid={Boolean(touched && error)}
              aria-describedby="name-hint name-err"
              onChange={(e) => set({ name: e.target.value })}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === 'Enter' && grow()}
            />
            {touched && error && (
              <p className="field-error" id="name-err" role="alert">
                {error}
              </p>
            )}
            <p className="muted" id="name-hint" style={{ marginTop: 6 }}>
              Shows on your letterbox and, if you join one, your cul-de-sac.
            </p>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field" style={{ marginBottom: 10 }}>
              When should we remind you?
            </legend>
            <div className="btnrow" role="radiogroup" aria-label="Reminder time">
              {(
                [
                  ['09:00', 'Morning, 9:00 am'],
                  ['20:00', 'Evening, 8:00 pm'],
                  [null, 'No reminders'],
                ] as const
              ).map(([v, l]) => (
                <button key={l} type="button" role="radio" className="chip" aria-checked={time === v} onClick={() => set({ reminder: { ...d.reminder, time: v } })}>
                  {l}
                </button>
              ))}
            </div>
          </fieldset>
          {time && (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack-8">
              <legend className="field" style={{ marginBottom: 10 }}>
                How?
              </legend>
              <label className="check">
                <input type="checkbox" checked={d.reminder.calendarAdded} onChange={(e) => set({ reminder: { ...d.reminder, calendarAdded: e.target.checked } })} />
                <span>
                  Add a daily reminder to my calendar
                  <span className="field-hint" style={{ display: 'block' }}>
                    Downloads a calendar file when you grow your garden.
                  </span>
                </span>
              </label>
              <label className="check">
                <input type="checkbox" checked={d.reminder.inApp} onChange={(e) => set({ reminder: { ...d.reminder, inApp: e.target.checked } })} />
                <span>Remind me when the app is open</span>
              </label>
            </fieldset>
          )}
        </div>
        <aside className="panel stack-16" style={{ background: 'var(--mint)', borderColor: 'var(--mint)' }}>
          {time && d.reminder.calendarAdded && (
            <div className="card" style={{ padding: 14 }}>
              <p className="caption">
                Calendar event, daily at <span className="mono">{timeText}</span>
              </p>
              <p style={{ fontWeight: 600, marginTop: 4 }}>Your garden is waiting. Two minutes to check in?</p>
            </div>
          )}
          <div className="letterbox-preview">
            <Garden levels={at(0.5)} name={name || 'Your garden'} animate={false} />
            <span className="nameplate">{name || 'Your garden'}</span>
          </div>
          <p>Your garden starts lived-in and changes as you check in. A week of check-ins shows the real pattern.</p>
        </aside>
      </div>
    </Step>
  );
}
