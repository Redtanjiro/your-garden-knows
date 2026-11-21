import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarden } from '../data/store';
import { addDays, prettyDate } from '../engine/dates';
import { levelsAt, mess, rawToMetrics } from '../engine/metrics';
import { changeList, latestRaw } from '../engine/stories';
import type { RawDay } from '../engine/types';
import { KEYS } from '../engine/types';
import { Garden } from '../garden/Garden';
import { PropIcon, SliderField, usePageTitle, useToast } from '../ui/common';
import { NORMAL_FIELDS } from './Onboarding';

const CHECKIN_LABELS: Partial<Record<keyof RawDay, [string, string]>> = {
  forwards: ['Forwarded messages', 'Look for the "Forwarded" label'],
  laughPer10: ['😂 per 10 messages you sent', 'Scroll your chats from today'],
  unread: ['Unread on your busiest chat', 'The number on the chat'],
};

export function CheckInScreen() {
  usePageTitle('Check in');
  const g = useGarden();
  const nav = useNavigate();
  const toast = useToast();
  const [date, setDate] = useState(g.today);
  const initial = (d: string): RawDay => {
    const existing = g.days.get(d)?.raw;
    const base = existing ?? latestRaw(g.days, d) ?? g.profile!.normal;
    const { shortVideoMinutes, steps, linksUnopened, forwards, laughPer10, unread } = base;
    return { shortVideoMinutes, steps, linksUnopened, forwards, laughPer10, unread };
  };
  const [raw, setRaw] = useState<RawDay>(() => initial(g.today));
  const [busy, setBusy] = useState(false);
  const editing = Boolean(g.days.get(date)?.raw);

  const pickDate = (d: string) => {
    setDate(d);
    setRaw(initial(d));
  };

  const preview = useMemo(() => {
    const days = new Map(g.days);
    const m = rawToMetrics(raw);
    days.set(date, { date, metrics: { ...m }, sources: {}, raw: { ...raw, date, source: 'checkin', savedAt: new Date().toISOString() } });
    return levelsAt(days, g.normal, g.gardenDate);
  }, [g.days, g.normal, g.gardenDate, raw, date]);
  const changes = useMemo(() => changeList(g.levels, preview), [g.levels, preview]);
  const values = useMemo(() => rawToMetrics(raw), [raw]);

  const save = async () => {
    setBusy(true);
    try {
      await g.actions.saveCheckIn(date, raw);
      const active = g.challenges.find((c) => c.status === 'active');
      await g.actions.logResearch(
        'checkin',
        JSON.stringify({ date, metrics: values, levels: preview, mess: mess(preview), challenge: active ? `${active.type} ${active.log.length}/${active.days}` : 'none' }),
      );
      toast('Saved. Your garden has grown.');
      nav('/garden');
    } catch (e) {
      toast((e as Error).message, true);
      setBusy(false);
    }
  };

  const dateOptions = Array.from({ length: 8 }, (_, i) => addDays(g.today, -i));
  return (
    <main className="page">
      <div className="split">
        <section>
          <h1>How was {date === g.today ? 'today' : prettyDate(date)}?</h1>
          <p className="lede">Rough numbers are fine. Your garden updates as you go.</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            <label className="sr-only" htmlFor="ci-date">
              Day to check in
            </label>
            <select id="ci-date" className="chip datechip" value={date} onChange={(e) => pickDate(e.target.value)}>
              {dateOptions.map((d, i) => (
                <option key={d} value={d}>
                  {i === 0 ? `Today, ${prettyDate(d)}` : i === 1 ? `Yesterday, ${prettyDate(d)}` : prettyDate(d)}
                  {g.days.get(d)?.raw ? ' · saved' : ''}
                </option>
              ))}
            </select>
            <span className="caption">{editing ? 'Editing a saved day.' : 'Missed a day? Pick it here.'}</span>
          </div>
          <div style={{ marginTop: 16 }}>
            {NORMAL_FIELDS.map((f) => {
              const [label, hint] = CHECKIN_LABELS[f.key] ?? [f.label, f.hint];
              return (
                <SliderField
                  key={f.key}
                  icon={<PropIcon k={f.metric} size={26} />}
                  label={label}
                  hint={hint}
                  value={raw[f.key]}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  sliderMax={f.sliderMax}
                  unit={f.unit}
                  onChange={(v) => setRaw((r) => ({ ...r, [f.key]: v }))}
                />
              );
            })}
          </div>
          <div className="btnrow" style={{ marginTop: 28 }}>
            <button type="button" className="btn" onClick={save} disabled={busy}>
              {date === g.today ? 'Save today' : `Save ${prettyDate(date)}`}
            </button>
            <button type="button" className="btn ghost" onClick={() => nav('/garden')}>
              Cancel
            </button>
          </div>
          <p className="caption" style={{ marginTop: 16 }}>
            Saved check-ins stay on this device. Your normal: Settings → Your normal.
          </p>
        </section>
        <aside className="panel preview-panel" aria-label="Live preview">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2>Live preview</h2>
            <span className="badge muted">Not saved yet</span>
          </div>
          <Garden levels={preview} name={g.profile!.gardenName} label={`Preview of ${g.profile!.gardenName} if you save these numbers`} />
          <ul className="changes" aria-live="polite">
            {changes.map((c) => (
              <li key={c.text} className={c.tone}>
                {c.text}
              </li>
            ))}
          </ul>
          <p className="sr-only">{KEYS.map((k) => `${k} level ${Math.round(preview[k] * 10)} of 10`).join(', ')}</p>
        </aside>
      </div>
    </main>
  );
}
