import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../data/db';
import { useGarden } from '../data/store';
import { daysBetween, prettyDate, localDate } from '../engine/dates';
import { rawToMetrics } from '../engine/metrics';
import { KEYS, type Reminder } from '../engine/types';
import { streetApi } from '../street/api';
import { appUrl, copyText, csv, download, reminderICS } from '../lib/files';
import { Switch, usePageTitle, useToast } from '../ui/common';

const TIME_TEXT = { '09:00': 'Morning, 9:00 am', '20:00': 'Evening, 8:00 pm' } as const;

export function Settings() {
  usePageTitle('Settings and privacy');
  const g = useGarden();
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const p = g.profile!;
  const [editReminder, setEditReminder] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const researchAsked = useRef(false);
  useEffect(() => {
    if (researchAsked.current) return;
    researchAsked.current = true;
    if (params.get('research') === '1' && !g.research) g.actions.setResearch(true).then(() => toast('Research mode is on. Check-ins and receipt views are logged on this device only.')).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const wa = g.imports.find((i) => i.kind === 'whatsapp');
  const vid = g.imports.find((i) => i.kind !== 'whatsapp');
  const exportsText = `${wa ? 'WhatsApp read' : 'WhatsApp not added'} · ${vid ? `${vid.kind === 'tiktok' ? 'TikTok' : 'Instagram'} read` : 'TikTok not added'}`;
  const checkinCount = g.checkins.length;
  const r = p.reminder;
  const reminderText = r.time ? `${TIME_TEXT[r.time]} · ${[r.calendarAdded && 'Calendar', r.inApp && 'in-app'].filter(Boolean).join(' and ') || 'Off'}` : 'No reminders';

  const setReminder = (patch: Partial<Reminder>) => run(() => g.actions.updateProfile({ reminder: { ...r, ...patch } }));

  const downloadData = () => {
    const rows: (string | number)[][] = [['date', 'short_video_minutes', 'steps', 'links_unopened', 'forwards', 'laugh_per_10', 'unread', ...KEYS.map((k) => `metric_${k}`), 'saved_at']];
    for (const c of [...g.checkins].sort((a, b) => a.date.localeCompare(b.date))) {
      const m = rawToMetrics(c);
      rows.push([c.date, c.shortVideoMinutes, c.steps, c.linksUnopened, c.forwards, c.laughPer10, c.unread, ...KEYS.map((k) => +m[k].toFixed(2)), c.savedAt]);
    }
    download('my-garden-check-ins.csv', csv(rows), 'text/csv');
    toast(`Downloaded ${checkinCount} check-ins as my-garden-check-ins.csv.`);
  };

  const copyStudyLog = async () => {
    try {
      const log = await db.research.toArray();
      const rows: (string | number)[][] = [['date', ...KEYS, ...KEYS.map((k) => `level_${k}`), 'mess', 'receipts_opened', 'challenge_status']];
      for (const row of log.filter((x) => x.kind === 'checkin')) {
        const d = JSON.parse(row.detail);
        const opened = log.filter((x) => x.kind === 'receipt' && x.date === row.date).map((x) => x.detail);
        rows.push([d.date, ...KEYS.map((k) => +(+d.metrics[k]).toFixed(2)), ...KEYS.map((k) => +(+d.levels[k]).toFixed(3)), +(+d.mess).toFixed(3), opened.join(' '), d.challenge]);
      }
      const text = csv(rows);
      if (await copyText(text)) toast(`Copied ${rows.length - 1} study log rows as CSV.`);
      else {
        download('study-log.csv', text, 'text/csv');
        toast('Copy was blocked, so the study log downloaded as study-log.csv instead.');
      }
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const leave = () =>
    run(async () => {
      if (!g.street) return;
      await streetApi.leave(g.street.slug, g.street).catch(() => {});
      await g.actions.setStreet(null);
      setConfirmLeave(false);
    }, 'You left the street. Your garden picture was removed from it.');

  const del = async () => {
    setDeleting(true);
    try {
      await g.actions.deleteEverything();
      nav('/', { replace: true });
      toast('Your garden is deleted from this device.');
    } catch (e) {
      toast((e as Error).message, true);
      setDeleting(false);
    }
  };

  return (
    <main className="page">
      <h1>Settings and privacy</h1>
      <p className="lede">Your numbers live on this device. Here’s what’s stored and how to change it.</p>
      <div className="split" style={{ marginTop: 32 }}>
        <div className="stack-24">
          <section aria-labelledby="s-data">
            <h2 id="s-data">Data</h2>
            <div className="list" style={{ marginTop: 12 }}>
            <div className="srow">
              <div>
                <b>Daily check-ins</b>
                <span>
                  {p.paused ? 'Paused' : 'On'} · {checkinCount} saved
                </span>
              </div>
              <Link to="/check-in" className="btn small outline">
                Check in
              </Link>
            </div>
            <div className="srow">
              <div>
                <b>Exports</b>
                <span>{exportsText}</span>
              </div>
              <Link to="/settings/data" className="btn small outline">
                Manage
              </Link>
            </div>
            <div className="srow">
              <div>
                <b>Your normal</b>
                <span>Set on day 1 · Used to score every measure</span>
              </div>
              <Link to="/start/normal?edit=1" className="btn small outline">
                Edit
              </Link>
            </div>
            </div>
          </section>

          <section aria-labelledby="s-rem">
            <h2 id="s-rem">Reminders and streets</h2>
            <div className="list" style={{ marginTop: 12 }}>
            <div className="srow">
              <div>
                <b>Daily reminder</b>
                <span>{reminderText}</span>
              </div>
              <button type="button" className="btn small outline" onClick={() => setEditReminder((v) => !v)} aria-expanded={editReminder}>
                {editReminder ? 'Done' : 'Change'}
              </button>
            </div>
            {editReminder && (
              <div className="stack-16" style={{ padding: '4px 0 16px' }}>
                <div className="btnrow" role="radiogroup" aria-label="Reminder time">
                  {(
                    [
                      ['09:00', 'Morning, 9:00 am'],
                      ['20:00', 'Evening, 8:00 pm'],
                      [null, 'No reminders'],
                    ] as const
                  ).map(([v, l]) => (
                    <button key={l} type="button" role="radio" className="chip" aria-checked={r.time === v} onClick={() => setReminder({ time: v })}>
                      {l}
                    </button>
                  ))}
                </div>
                {r.time && (
                  <>
                    <label className="check">
                      <input type="checkbox" checked={r.inApp} onChange={(e) => setReminder({ inApp: e.target.checked })} />
                      <span>Remind me when the app is open</span>
                    </label>
                    <button
                      type="button"
                      className="linkbtn"
                      style={{ textAlign: 'left' }}
                      onClick={() => {
                        download('garden-reminder.ics', reminderICS(r.time!, appUrl('/check-in')), 'text/calendar');
                        setReminder({ calendarAdded: true });
                      }}
                    >
                      Add a daily reminder to my calendar
                    </button>
                    <p className="muted">To stop a calendar reminder, delete the event in your calendar app.</p>
                  </>
                )}
              </div>
            )}
            <div className="srow">
              {g.street ? (
                <>
                  <div>
                    <b>{g.street.name}</b>
                    <span>Cul-de-sac · Your garden is {g.street.visible ? 'visible' : 'hidden'}</span>
                  </div>
                  {confirmLeave ? (
                    <span className="btnrow">
                      <button type="button" className="btn small danger" onClick={leave}>
                        Leave street
                      </button>
                      <button type="button" className="btn small outline" onClick={() => setConfirmLeave(false)}>
                        Stay
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="btn small outline" onClick={() => setConfirmLeave(true)}>
                      Leave street
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <b>Cul-de-sac</b>
                    <span>Not on a street</span>
                  </div>
                  <Link to="/cul-de-sac/new" className="btn small outline">
                    Start one
                  </Link>
                </>
              )}
            </div>
            <div className="srow">
              <div>
                <b id="pause-lbl">Pause my garden</b>
                <span>{p.paused ? `Frozen since ${prettyDate(p.pausedOn ?? g.today)}` : 'Freezes your garden while you’re away'}</span>
              </div>
              <Switch checked={p.paused} label="Pause my garden" onChange={(v) => run(() => g.actions.updateProfile({ paused: v, pausedOn: v ? g.today : undefined }), v ? 'Garden paused. It stays as it is until you’re back.' : 'Welcome back. Your garden is growing again.')} />
            </div>
            </div>
          </section>

          {g.research && (
            <section className="info-panel" aria-labelledby="s-research">
              <h2 id="s-research">Research mode</h2>
              <p className="muted" style={{ marginTop: 6 }}>
                Check-ins and receipt views are logged on this device. Nothing is sent automatically.
              </p>
              <div className="btnrow" style={{ marginTop: 12 }}>
                <button type="button" className="btn small" onClick={copyStudyLog}>
                  Copy study log as CSV
                </button>
                <button type="button" className="btn small outline" onClick={() => run(() => g.actions.setResearch(false), 'Research mode is off.')}>
                  Turn off research mode
                </button>
              </div>
            </section>
          )}
        </div>

        <div className="stack-24">
          <section className="ok-panel" style={{ padding: 28 }} aria-labelledby="s-priv">
            <h2 id="s-priv" className="heading-s">
              Your numbers never leave this device; streets share pictures only, never numbers.
            </h2>
            <p style={{ marginTop: 12 }}>Check-ins and files stay in this browser. If you join a street, only your garden picture is shared: how many of each prop, never the numbers.</p>
          </section>
          <section aria-labelledby="s-dl">
            <h2 id="s-dl">Download my data</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Download a copy of every check-in as a spreadsheet file.
            </p>
            <button type="button" className="btn outline" style={{ marginTop: 14 }} onClick={downloadData} disabled={!checkinCount}>
              Download my data
            </button>
          </section>
          <section className="danger-zone" aria-labelledby="s-del">
            <h2 id="s-del">Delete my garden</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Removes every check-in, file and setting from this device and takes you off any street. This can’t be undone.
            </p>
            <label className="field" htmlFor="del-name" style={{ marginTop: 14 }}>
              Type <span style={{ userSelect: 'all' }}>{p.gardenName}</span> to confirm
            </label>
            <input id="del-name" className="input" style={{ marginTop: 6 }} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
            <button type="button" className="btn danger" style={{ marginTop: 12 }} disabled={confirmName.trim() !== p.gardenName.trim() || deleting} onClick={del}>
              Delete my garden
            </button>
            <p className="muted" style={{ marginTop: 6 }}>
              You’ll be asked to type the garden’s name to confirm.
            </p>
          </section>
          <p className="caption mono">
            Planted {prettyDate(localDate(p.createdAt))} · day {daysBetween(localDate(p.createdAt), g.today) + 1}
          </p>
        </div>
      </div>
    </main>
  );
}
