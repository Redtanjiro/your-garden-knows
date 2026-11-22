import { META, valueText } from '../engine/meta';
import type { Levels, MetricKey, Metrics } from '../engine/types';
import { KEYS } from '../engine/types';
import { ratioText } from '../garden/Garden';
import { Arrow, Blocks, MetricTile } from './common';

/** The six receipt rows: tile, name over prop, value in mono, ten blocks, arrow. */
export function ReceiptRows({
  levels,
  values,
  normal,
  arrows,
  onOpen,
  selected,
}: {
  levels: Levels;
  values: Partial<Record<MetricKey, number>>;
  normal: Metrics;
  arrows?: Partial<Record<MetricKey, 'up' | 'down' | 'same' | null>>;
  onOpen?: (k: MetricKey) => void;
  selected?: MetricKey | null;
}) {
  return (
    <div className="receipts">
      {KEYS.map((k) => {
        const v = values[k];
        const valText = v === undefined ? 'no data yet' : valueText(k, v);
        const inner = (
          <>
            <MetricTile k={k} size={40} className="tile40" />
            <span>
              <span className="t">{META[k].name}</span>
              <span className="s">{META[k].prop}</span>
            </span>
            <span className="v">{valText}</span>
            <Blocks level={levels[k]} />
            {arrows ? <Arrow dir={arrows[k] ?? null} /> : <span aria-hidden="true" />}
          </>
        );
        if (!onOpen)
          return (
            <div key={k} className="rrow static" role="group" aria-label={`${META[k].prop}. ${META[k].name}: ${valText}. Level ${Math.round(levels[k] * 10)} of 10.`}>
              {inner}
            </div>
          );
        return (
          <button
            key={k}
            type="button"
            className="rrow"
            data-receipt={k}
            aria-pressed={selected === undefined ? undefined : selected === k}
            onClick={() => onOpen(k)}
            aria-label={`${META[k].prop}. ${META[k].name}: ${v === undefined ? 'no data yet' : valText + ', ' + ratioText(v, normal[k])}. Level ${Math.round(levels[k] * 10)} of 10. Open receipt.`}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
