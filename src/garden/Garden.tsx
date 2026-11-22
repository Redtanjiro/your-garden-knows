import { memo, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fmt, META, valueText } from '../engine/meta';
import { mess, propCounts, tier } from '../engine/metrics';
import type { Levels, MetricKey, Metrics } from '../engine/types';
import { KEYS } from '../engine/types';
import { ANCHORS, GARDEN_DEFS, gardenLayers, type Item } from './draw';

export function ratioText(v: number, n: number): string {
  const r = v / n;
  if (r < 0.75) return 'below your normal';
  if (r <= 1.3) return 'about your normal';
  return `about ${fmt(r, r < 3 ? 1 : 0)} times your normal`;
}

export function propLabel(k: MetricKey, v: number | undefined, n: number, interactive: boolean) {
  const m = META[k];
  const val = v === undefined ? 'no data yet' : `${valueText(k, v)} today, ${ratioText(v, n)}`;
  return `${m.prop}: ${val}.${interactive ? ' Open receipt.' : ''}`;
}

export function gardenSummary(name: string, l: Levels): string {
  const c = propCounts(l);
  return (
    `${name}, ${tier(mess(l)).toLowerCase()}. ` +
    `Long grass ${Math.round(l.thumb * 10)} of 10. ` +
    `${c.newspapers} newspapers on the lawn. ` +
    `${c.seeds} seeds blowing next door${c.weeds ? ', with weeds sprouting' : ''}. ` +
    `${c.potatoes} of 12 bed slots are potatoes${c.couch ? ', and a couch is on the lawn' : ''}. ` +
    `${c.kookaburras} kookaburras on the fence. ` +
    `Letterbox ${Math.round(l.seen * 10)} of 10 full.`
  );
}

/** Items present on first render stay still; items that appear later animate in (600 ms). */
export const Items = memo(function Items({ items }: { items: Item[] }) {
  const seen = useRef<Map<string, boolean> | null>(null);
  if (!seen.current) seen.current = new Map(items.map((i) => [i.k, false]));
  const map = seen.current;
  const present = new Set(items.map((i) => i.k));
  for (const k of [...map.keys()]) if (!present.has(k)) map.delete(k);
  for (const i of items) if (!map.has(i.k)) map.set(i.k, true);
  return (
    <>
      {items.map((i) => (
        <g key={i.k} className={map.get(i.k) ? 'it' : undefined} dangerouslySetInnerHTML={{ __html: i.svg }} />
      ))}
    </>
  );
});

interface Props {
  levels: Levels;
  seed?: number;
  name: string;
  values?: Partial<Metrics>;
  normal?: Metrics;
  onOpen?: (k: MetricKey) => void;
  selected?: MetricKey | null;
  animate?: boolean;
  label?: string; // override accessible name, e.g. "projection"
}

export function Garden({ levels, seed = 7, name, values = {}, normal, onOpen, selected, animate = true, label }: Props) {
  const layers = useMemo(() => gardenLayers(levels, seed), [levels, seed]);
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRefs = useRef<Partial<Record<string, SVGGElement | null>>>({});
  const [hot, setHot] = useState<{ k: MetricKey; how: 'hover' | 'focus' } | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const descId = useId();
  const interactive = Boolean(onOpen);
  const ring = hot?.k ?? selected ?? null;

  useLayoutEffect(() => {
    if (!ring) return setBox(null);
    const primary = ring === 'thumb' ? groupRefs.current['vines'] : groupRefs.current[layers.find((l) => l.metric === ring)!.id];
    let b = ANCHORS[ring];
    try {
      const bb = primary?.getBBox();
      if (bb && bb.width > 2 && bb.height > 2) b = { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
    } catch {
      /* not rendered yet */
    }
    if (ring === 'thumb') b = { x: 78, y: 96, w: 444, h: 470 };
    setBox(b);
  }, [ring, layers]);

  const accessibleName = label ?? `${name}: ${tier(mess(levels))} garden`;
  return (
    <div className="garden-wrap">
      <svg
        ref={svgRef}
        className={'garden' + (animate ? '' : ' still')}
        viewBox="0 0 600 600"
        role="group"
        aria-label={accessibleName}
        aria-describedby={descId}
        onMouseLeave={() => setHot(null)}
      >
        <g dangerouslySetInnerHTML={{ __html: GARDEN_DEFS }} />
        {layers.map((ly, idx) => {
          if (!ly.metric || !interactive)
            return (
              <g key={ly.id} className="scenery">
                <Items items={ly.items} />
              </g>
            );
          const k = ly.metric;
          const primary = !(k === 'thumb' && ly.id === 'vines');
          return (
            <g
              key={ly.id}
              ref={(el) => {
                groupRefs.current[ly.id] = el;
              }}
              className="prop"
              data-layer={idx}
              data-metric={primary ? k : undefined}
              role={primary ? 'button' : undefined}
              tabIndex={primary ? 0 : -1}
              aria-hidden={primary ? undefined : true}
              aria-label={primary ? propLabel(k, values[k], normal?.[k] ?? 1, true) : undefined}
              onClick={() => onOpen!(k)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen!(k);
                }
              }}
              onMouseEnter={() => setHot({ k, how: 'hover' })}
              onFocus={() => setHot({ k, how: 'focus' })}
              onBlur={() => setHot((h) => (h?.how === 'focus' ? null : h))}
            >
              {ly.hit && <g dangerouslySetInnerHTML={{ __html: ly.hit }} />}
              <Items items={ly.items} />
            </g>
          );
        })}
        {interactive && ring && box && (
          <rect className="focus-ring" x={box.x - 6} y={box.y - 6} width={box.w + 12} height={box.h + 12} rx="10" />
        )}
      </svg>
      {interactive && hot && box && (
        <div className="tip" style={{ left: `${((box.x + box.w / 2) / 600) * 100}%`, top: `${(Math.max(box.y, 60) / 600) * 100}%` }} aria-hidden="true">
          <b>{META[hot.k].prop}</b>
          {values[hot.k] !== undefined ? `${META[hot.k].name} · ${valueText(hot.k, values[hot.k]!)}` : 'No data yet'}
          <div className="go">Click for the receipt</div>
        </div>
      )}
      <p id={descId} className="sr-only">
        {gardenSummary(name, levels)}
      </p>
    </div>
  );
}

/** Non-interactive garden from a precomputed SVG string (street, thumbnails). */
export function StaticGarden({ svg, title }: { svg: string; title: string }) {
  return <div role="img" aria-label={title} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export { KEYS };
