import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import type { MetricKey } from '../engine/types';

/* ---------- toasts ---------- */
interface Toast { id: number; text: string; err?: boolean }
const ToastCtx = createContext<(text: string, err?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((text: string, err?: boolean) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { id, text, err }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), err ? 6000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={'toast' + (t.err ? ' err' : '')}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- WhatsApp bubble ---------- */
export function Ticks() {
  return (
    <svg viewBox="0 0 16 11" aria-hidden="true">
      <path d="M1 6l3 3 6-7M6 9l1 1 6-8" stroke="var(--wa-tick)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function Bubble({ sender, time, children, white }: { sender?: string; time?: string; children: ReactNode; white?: boolean }) {
  return (
    <div className={'bubble tail' + (white ? ' white' : '')}>
      {sender && <div className="sender">{sender}</div>}
      <span>{children}</span>
      {time && (
        <span className="meta">
          {time} <Ticks />
        </span>
      )}
    </div>
  );
}

/* ---------- level blocks ---------- */
export function Blocks({ level }: { level: number }) {
  const on = Math.round(level * 10);
  return (
    <span className="blocks" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} className={i < on ? 'on' : ''} />
      ))}
    </span>
  );
}

export function Arrow({ dir }: { dir: 'up' | 'down' | 'same' | null }) {
  if (!dir) return <span className="arrow same" aria-hidden="true" />;
  const label = dir === 'up' ? 'grew' : dir === 'down' ? 'shrank' : 'same';
  return (
    <span className={'arrow ' + dir} title={label}>
      <span aria-hidden="true">{dir === 'up' ? '↑' : dir === 'down' ? '↓' : '–'}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* ---------- prop icons ---------- */
export function PropIcon({ k, size = 32 }: { k: MetricKey; size?: number }) {
  const s = { width: size, height: size };
  switch (k) {
    case 'thumb':
      return (
        <svg viewBox="0 0 32 32" style={s} aria-hidden="true">
          <path d="M9 26c0-6 1-12 4-18M15 26c0-6 0-11 2-17M21 26c1-5 2-10 5-14" stroke="#4C6B2A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'headline':
      return (
        <svg viewBox="0 0 32 32" style={s} aria-hidden="true">
          <rect x="3" y="10" width="26" height="12" rx="6" fill="#EEEAE0" stroke="#bbb" />
          <rect x="13" y="10" width="6" height="12" fill="#C2410C" />
        </svg>
      );
    case 'forwards':
      return (
        <svg viewBox="0 0 32 32" style={s} aria-hidden="true">
          <g stroke="#555" strokeWidth="1.6" strokeLinecap="round">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4;
              return <line key={i} x1="16" y1="16" x2={16 + 11 * Math.cos(a)} y2={16 + 11 * Math.sin(a)} />;
            })}
          </g>
          <circle cx="16" cy="16" r="2.4" fill="#555" />
        </svg>
      );
    case 'potato':
      return (
        <svg viewBox="0 0 32 32" style={s} aria-hidden="true">
          <ellipse cx="16" cy="17" rx="12" ry="8.5" fill="#B08A5A" transform="rotate(-12 16 17)" />
          <circle cx="12" cy="15" r="1.3" fill="#6E5236" />
          <circle cx="19" cy="19" r="1.3" fill="#6E5236" />
        </svg>
      );
    case 'laugh':
      return (
        <svg viewBox="-16 -30 32 52" style={s} aria-hidden="true">
          <rect x="-3" y="8" width="6" height="10" rx="2" fill="#7A5A3C" />
          <ellipse cx="0" cy="0" rx="7" ry="11" fill="#8B6B4A" />
          <circle cx="0" cy="-11" r="6.5" fill="#EDE6D6" />
          <path d="M-6,-12 L6,-12" stroke="#3B2A1E" strokeWidth="2" />
          <polygon points="-2,-16 2,-16 0,-25" fill="#2F2A24" />
        </svg>
      );
    case 'seen':
      return (
        <svg viewBox="0 0 32 32" style={s} aria-hidden="true">
          <rect x="6" y="6" width="12" height="9" fill="#E86A5A" transform="rotate(-12 12 10)" />
          <rect x="14" y="5" width="12" height="9" fill="#E8D44D" transform="rotate(10 20 9)" />
          <rect x="4" y="14" width="24" height="13" rx="2" fill="#3A3D40" />
          <rect x="8" y="17" width="16" height="2.5" fill="#1E2023" />
        </svg>
      );
  }
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#d9fdd3" />
      <path d="M12 19V11M12 13c-5 0-6-5-5-7 4 0 5 3 5 7M12 11c4 0 6-4 5-6-4 0-5 3-5 6" stroke="#1a7f37" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- companions: small black line figures ---------- */
export function Companion({ pose = 'stand', size = 90 }: { pose?: 'stand' | 'peek' | 'wave'; size?: number }) {
  if (pose === 'peek')
    return (
      <svg viewBox="0 0 80 34" width={size} aria-hidden="true">
        <path d="M14 32c0-14 10-24 26-24s26 10 26 24" fill="#fff" stroke="#0d0d0d" strokeWidth="2" />
        <path d="M14 22c4-12 16-16 26-16s22 4 26 16c-8-6-16-8-26-8s-18 2-26 8z" fill="#0d0d0d" />
        <circle cx="32" cy="24" r="2" fill="#0d0d0d" />
        <circle cx="48" cy="24" r="2" fill="#0d0d0d" />
        <line x1="0" y1="32" x2="80" y2="32" stroke="#0d0d0d" strokeWidth="2" />
      </svg>
    );
  return (
    <svg viewBox="0 0 60 120" width={size * 0.5} aria-hidden="true">
      <circle cx="30" cy="18" r="12" fill="#fff" stroke="#0d0d0d" strokeWidth="2" />
      <path d="M18 15c1-8 6-11 12-11s11 3 12 11c-4-3-8-4-12-4s-8 1-12 4z" fill="#0d0d0d" />
      <circle cx="26" cy="20" r="1.5" fill="#0d0d0d" />
      <circle cx="34" cy="20" r="1.5" fill="#0d0d0d" />
      <path d="M27 25q3 2 6 0" stroke="#0d0d0d" strokeWidth="1.5" fill="none" />
      <rect x="19" y="32" width="22" height="34" rx="4" fill="#0d0d0d" />
      {pose === 'wave' ? (
        <path d="M41 36l12-14M19 36l-8 22" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <rect x="24" y="40" width="12" height="18" rx="2" fill="#fff" />
          <path d="M19 38l-6 20M41 38l6 20" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      <path d="M25 66l-3 46M35 66l3 46M16 112h9M35 112h9" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- slider + number field kept in sync ---------- */
export function SliderField(props: {
  icon?: ReactNode;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  sliderMax?: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const { value, min, max, step, onChange } = props;
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (s: string) => {
    const n = Number(s.replace(/,/g, ''));
    if (s.trim() === '' || !isFinite(n)) return setText(String(value));
    const v = Math.min(max, Math.max(min, Math.round(n / step) * step));
    onChange(+v.toFixed(2));
    setText(String(+v.toFixed(2)));
  };
  const sMax = props.sliderMax ?? max;
  return (
    <div className="slider-row">
      <span>{props.icon}</span>
      <div className="lbl">
        <b id={id + 'l'}>{props.label}</b>
        <span id={id + 'h'}>{props.hint}</span>
      </div>
      <div className="rng">
        <input
          type="range"
          min={min}
          max={sMax}
          step={step}
          value={Math.min(value, sMax)}
          aria-labelledby={id + 'l'}
          aria-describedby={id + 'h'}
          aria-valuetext={`${value}${props.unit ? ' ' + props.unit : ''}`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <div className={'numwrap' + (props.unit ? ' has-unit' : '')}>
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={text}
          aria-labelledby={id + 'l'}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== '' && isFinite(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
        />
        {props.unit && <span className="unit">{props.unit}</span>}
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" className="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function usePageTitle(t: string) {
  useEffect(() => {
    document.title = t ? `${t} · Your Garden Knows` : 'Your Garden Knows';
  }, [t]);
}
