// The garden mural: the six props abstracted into flat geometric shapes, driven by real levels.
// Hard edges, no strokes, metric colours only. Decorative: the garden it echoes carries the summary.
import { useMemo, useRef } from 'react';
import type { Levels, MetricKey } from '../engine/types';
import { KEYS } from '../engine/types';
import { mulberry32 } from '../garden/draw';

export const MURAL_W = 1600;
const COLOUR: Record<MetricKey, string> = {
  thumb: 'var(--m-thumb)',
  headline: 'var(--m-headline)',
  forwards: 'var(--m-forwards)',
  potato: 'var(--m-potato)',
  laugh: 'var(--m-laugh)',
  seen: 'var(--m-seen)',
};

export interface Shape {
  key: string; // stable per metric + index, so shapes never jump
  metric: MetricKey;
  kind: 'rect' | 'circle' | 'ellipse' | 'half' | 'hex' | 'line' | 'box';
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  scale?: number; // eases with the level (grass height, potato size)
  fill: string;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Shape counts, as in the handoff (section 3.5). */
export function muralCounts(l: Levels): Record<MetricKey, number> {
  return {
    thumb: 2 + Math.round(clamp01(l.thumb) * 14),
    headline: Math.round(clamp01(l.headline) * 8),
    forwards: Math.round(clamp01(l.forwards) * 18),
    potato: Math.round(clamp01(l.potato) * 6),
    laugh: Math.round(clamp01(l.laugh) * 6),
    seen: 1 + Math.round(clamp01(l.seen) * 10), // letters spilling out of the letterbox
  };
}

/** Pure layout: same levels + seed always give the same shapes. */
export function muralShapes(l: Levels, seed = 7, H = 280): Shape[] {
  const n = muralCounts(l);
  const out: Shape[] = [];
  const rng = (k: MetricKey, i: number) => mulberry32(seed * 7919 + KEYS.indexOf(k) * 1000 + i);
  const W = MURAL_W;

  // long grass: tall bottom-anchored blades spread over the whole width
  for (let i = 0; i < n.thumb; i++) {
    const r = rng('thumb', i);
    const w = 22 + r() * 26;
    const x = ((i + 0.5) / 16) * W + (r() - 0.5) * 60;
    const h = H * (0.3 + 0.6 * r());
    out.push({ key: `thumb${i}`, metric: 'thumb', kind: 'rect', x: x - w / 2, y: H - h, w, h, scale: 0.55 + 0.45 * clamp01(l.thumb), fill: COLOUR.thumb });
  }
  // fence line for the kookaburras
  const fenceY = H * 0.34;
  if (n.laugh > 0) out.push({ key: 'fence', metric: 'laugh', kind: 'line', x: W * 0.52, y: fenceY, w: W * 0.4, h: 3, fill: 'var(--paper)' });
  for (let i = 0; i < n.laugh; i++) {
    const r = rng('laugh', i);
    const s = 34 + r() * 14;
    out.push({ key: `laugh${i}`, metric: 'laugh', kind: 'half', x: W * 0.54 + i * (W * 0.064) + r() * 12, y: fenceY - s / 2, w: s, h: s / 2, fill: COLOUR.laugh });
  }
  // newspapers on the lawn
  for (let i = 0; i < n.headline; i++) {
    const r = rng('headline', i);
    const w = 70 + r() * 30;
    out.push({ key: `headline${i}`, metric: 'headline', kind: 'rect', x: W * 0.06 + r() * W * 0.55, y: H * (0.5 + r() * 0.32), w, h: w * 0.55, rot: (r() - 0.5) * 24, fill: COLOUR.headline });
  }
  // potatoes in the bed
  for (let i = 0; i < n.potato; i++) {
    const r = rng('potato', i);
    const w = 56 + r() * 26;
    out.push({ key: `potato${i}`, metric: 'potato', kind: 'ellipse', x: W * 0.08 + i * 58 + r() * 14, y: H * (0.68 + r() * 0.14), w, h: w * 0.62, rot: (r() - 0.5) * 30, scale: 0.75 + 0.25 * clamp01(l.potato), fill: COLOUR.potato });
  }
  // seeds drifting right, plus one hexagon
  for (let i = 0; i < n.forwards; i++) {
    const r = rng('forwards', i);
    const s = 10 + r() * 12;
    out.push({ key: `forwards${i}`, metric: 'forwards', kind: 'circle', x: W * 0.62 + (i / 18) * W * 0.34 + r() * 30, y: H * (0.08 + r() * 0.5), w: s, h: s, fill: COLOUR.forwards });
  }
  if (n.forwards > 0) out.push({ key: 'hex', metric: 'forwards', kind: 'hex', x: W * 0.9, y: H * 0.12, w: 40, h: 40, fill: COLOUR.forwards });
  // letterbox, with letters spilling out
  const bx = W * 0.44, bw = 92, bh = 78, by = H * 0.42;
  out.push({ key: 'box', metric: 'seen', kind: 'box', x: bx, y: by, w: bw, h: bh, fill: COLOUR.seen });
  for (let i = 1; i < n.seen; i++) {
    const r = rng('seen', i);
    const s = 14 + r() * 8;
    out.push({ key: `seen${i}`, metric: 'seen', kind: 'rect', x: bx + bw / 2 - 60 + r() * 120, y: by - 10 - i * 9 - r() * 10, w: s, h: s * 0.7, rot: (r() - 0.5) * 40, fill: 'var(--paper)' });
  }
  return out;
}

function shapeEl(s: Shape) {
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const t = s.rot ? `rotate(${s.rot} ${cx} ${cy})` : undefined;
  switch (s.kind) {
    case 'rect':
    case 'box':
    case 'line':
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} transform={t} />;
    case 'circle':
      return <circle cx={cx} cy={cy} r={s.w / 2} fill={s.fill} />;
    case 'ellipse':
      return <ellipse cx={cx} cy={cy} rx={s.w / 2} ry={s.h / 2} fill={s.fill} transform={t} />;
    case 'half':
      return <path d={`M${s.x} ${s.y + s.h} A${s.w / 2} ${s.h} 0 0 1 ${s.x + s.w} ${s.y + s.h} Z`} fill={s.fill} />;
    case 'hex': {
      const r = s.w / 2;
      const pts = Array.from({ length: 6 }, (_, i) => `${cx + r * Math.cos((Math.PI / 3) * i)},${cy + r * Math.sin((Math.PI / 3) * i)}`).join(' ');
      return <polygon points={pts} fill={s.fill} />;
    }
  }
}

/** Full-bleed mural. Existing shapes ease to new sizes; new ones grow in. */
export function Mural({ levels, height, seed = 7, animate = true, className = '' }: { levels: Levels; height?: number; seed?: number; animate?: boolean; className?: string }) {
  const shapes = useMemo(() => muralShapes(levels, seed, 280), [levels, seed]);
  const seen = useRef<Set<string> | null>(null);
  if (!seen.current) seen.current = new Set(animate ? [] : shapes.map((s) => s.key));
  const fresh = new Set<string>();
  for (const s of shapes) if (!seen.current.has(s.key)) fresh.add(s.key);
  for (const s of shapes) seen.current.add(s.key);
  return (
    <div className={'mural ' + className} style={height ? { height } : undefined} aria-hidden="true">
      <svg viewBox={`0 0 ${MURAL_W} 280`} preserveAspectRatio="xMidYMax slice" focusable="false">
        {shapes.map((s) => (
          <g key={s.key} className={fresh.has(s.key) ? 'ms-in' : 'ms'}>
            <g className="ms" style={s.scale ? { transform: `scale(${s.scale})`, transformBox: 'fill-box', transformOrigin: 'center bottom' } : undefined}>
              {shapeEl(s)}
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
