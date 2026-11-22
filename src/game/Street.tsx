import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { META } from '../engine/meta';
import type { Levels, MetricKey } from '../engine/types';
import { ANCHORS, GARDEN_DEFS, gardenLayers, gardenSVG } from '../garden/draw';
import { gardenSummary, Items } from '../garden/Garden';

export type Light = 'dawn' | 'day' | 'dusk' | 'night' | 'clear' | 'title';

const NEIGHBOUR: Levels = { thumb: 0.14, headline: 0, forwards: 0, potato: 0.1, laugh: 0.1, seen: 0.12 };
const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/id="sun"/g, 'id="sunN"').replace(/url\(#sun\)/g, 'url(#sunN)');
// Neighbours never change: they're scenery, not scored.
const LEFT = inner(gardenSVG(NEIGHBOUR, 21));
const RIGHT = inner(gardenSVG(NEIGHBOUR, 33));

const TINT: Record<Light, [string, number]> = {
  dawn: ['#ffb27a', 0.32],
  day: ['#ffffff', 0],
  dusk: ['#ff7a3d', 0.34],
  night: ['#16225e', 0.62],
  title: ['#0d1440', 0.8],
  clear: ['#ffffff', 0],
};

interface Props {
  levels: Levels;
  light: Light;
  narrow: boolean;
  interactive?: boolean;
  selected?: MetricKey | null;
  onOpen?: (k: MetricKey) => void;
  label: string;
}

/** Full-bleed street of three backyards. Yours is the middle one. */
export const Street = forwardRef<SVGGElement, Props>(function Street({ levels, light, narrow, interactive, selected, onOpen, label }, mineRef) {
  const layers = useMemo(() => gardenLayers(levels, 7), [levels]);
  const refs = useRef<Partial<Record<string, SVGGElement | null>>>({});
  const [hot, setHot] = useState<MetricKey | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const ring = interactive ? hot ?? selected ?? null : null;

  useLayoutEffect(() => {
    if (!ring) return setBox(null);
    if (ring === 'thumb') return setBox({ x: 78, y: 96, w: 444, h: 470 });
    let b = ANCHORS[ring];
    try {
      const g = refs.current[layers.find((l) => l.metric === ring)!.id];
      const bb = g?.getBBox();
      if (bb && bb.width > 2 && bb.height > 2) b = { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
    } catch {
      /* not rendered yet */
    }
    setBox(b);
  }, [ring, layers]);

  const [tint, op] = TINT[light];
  const vb = narrow ? '-20 -12 640 624' : '-600 -30 1800 660';
  return (
    <svg className="wf-street" viewBox={vb} preserveAspectRatio={narrow ? 'xMidYMin meet' : 'xMidYMid slice'} role="group" aria-label={label}>
      <g dangerouslySetInnerHTML={{ __html: GARDEN_DEFS.replace('id="sun"', 'id="sunN"') + GARDEN_DEFS }} />
      {!narrow && (
        <g aria-hidden="true">
          <g transform="translate(-600 0)" dangerouslySetInnerHTML={{ __html: LEFT }} />
          <g transform="translate(600 0)" dangerouslySetInnerHTML={{ __html: RIGHT }} />
        </g>
      )}
      <g ref={mineRef} className="garden mine" data-coach="garden">
        {layers.map((ly) => {
          const k = ly.metric;
          if (!k || !interactive)
            return (
              <g key={ly.id} aria-hidden="true" className="scenery">
                <Items items={ly.items} />
              </g>
            );
          const primary = !(k === 'thumb' && ly.id === 'vines');
          return (
            <g
              key={ly.id}
              ref={(el) => {
                refs.current[ly.id] = el;
              }}
              className="prop"
              data-metric={primary ? k : undefined}
              role={primary ? 'button' : undefined}
              tabIndex={primary ? 0 : -1}
              aria-hidden={primary ? undefined : true}
              aria-label={primary ? `${META[k].prop}. Open receipt.` : undefined}
              aria-pressed={primary ? selected === k : undefined}
              onClick={() => onOpen?.(k)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen?.(k);
                }
              }}
              onMouseEnter={() => setHot(k)}
              onMouseLeave={() => setHot(null)}
              onFocus={() => setHot(k)}
              onBlur={() => setHot(null)}
            >
              {ly.hit && <g dangerouslySetInnerHTML={{ __html: ly.hit }} />}
              <Items items={ly.items} />
            </g>
          );
        })}
        {ring && box && <rect className="wf-ring" x={box.x - 6} y={box.y - 6} width={box.w + 12} height={box.h + 12} />}
      </g>
      <rect className="wf-tint" x={narrow ? -20 : -700} y={narrow ? -12 : 0} width={narrow ? 640 : 2000} height={narrow ? 624 : 600} fill={tint} style={{ opacity: op }} pointerEvents="none" />
      <desc>{gardenSummary('Your backyard', levels)}</desc>
    </svg>
  );
});
