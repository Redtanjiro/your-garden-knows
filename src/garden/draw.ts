// Port of drawGarden() from prototype/index.html, split into layers so each
// prop group can be focusable and each item can animate in on its own.
import { clamp, mess } from '../engine/metrics';
import type { Levels, MetricKey } from '../engine/types';

export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type R = () => number;
const hx = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export function mix(a: string, b: string, t: number) {
  t = clamp(t);
  const A = hx(a);
  const B = hx(b);
  return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join('');
}
const SH = 'rgba(20,30,20,0.25)';
const f0 = (n: number) => n.toFixed(0);
const f1 = (n: number) => n.toFixed(1);

function blob(x: number, y: number, r: number, fill: string, R: R, n = 5) {
  let s = `<circle cx="${f0(x)}" cy="${f0(y)}" r="${f1(r)}" fill="${fill}"/>`;
  for (let i = 0; i < n; i++)
    s += `<circle cx="${f1(x + (R() - 0.5) * r)}" cy="${f1(y + (R() - 0.5) * r)}" r="${f1(r * (0.4 + R() * 0.3))}" fill="${fill}"/>`;
  return s;
}
function puff(x: number, y: number, r: number) {
  let s = '<g stroke="#fff" stroke-width=".9">';
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    s += `<line x1="${f0(x)}" y1="${f0(y)}" x2="${f1(x + r * Math.cos(a))}" y2="${f1(y + r * Math.sin(a))}"/>`;
  }
  return s + `</g><circle cx="${f0(x)}" cy="${f0(y)}" r="1.6" fill="#F4EFE2"/>`;
}
export function kook(x: number, y: number, rot: number) {
  return `<g transform="translate(${x},${y}) rotate(${rot}) scale(1.25)"><ellipse cx="2" cy="3" rx="8" ry="12" fill="${SH}"/><rect x="-3" y="8" width="6" height="10" rx="2" fill="#7A5A3C"/><line x1="-3" y1="12" x2="3" y2="12" stroke="#A67C52"/><line x1="-3" y1="15" x2="3" y2="15" stroke="#A67C52"/><ellipse cx="0" cy="0" rx="7" ry="11" fill="#8B6B4A"/><ellipse cx="-5" cy="1" rx="3" ry="8" fill="#5E8FB0"/><ellipse cx="5" cy="1" rx="3" ry="8" fill="#5E8FB0"/><circle cx="0" cy="-11" r="6.5" fill="#EDE6D6"/><path d="M-6,-12 L6,-12" stroke="#3B2A1E" stroke-width="2"/><polygon points="-2,-16 2,-16 0,-25" fill="#2F2A24"/></g>`;
}
export function paper(x: number, y: number, rot: number) {
  return `<g transform="translate(${f0(x)},${f0(y)}) rotate(${f0(rot)})"><rect x="-14" y="-4" width="32" height="14" rx="6" fill="${SH}"/><rect x="-16" y="-7" width="32" height="14" rx="6" fill="#EEEAE0"/><rect x="-3" y="-7" width="6" height="14" fill="#C2410C"/><line x1="-12" y1="-4" x2="10" y2="-4" stroke="#fff" stroke-width="1.6" opacity=".9"/></g>`;
}

export interface Item {
  k: string;
  svg: string;
}
export interface Layer {
  id: string;
  metric: MetricKey | null; // null = shared scenery, not interactive
  items: Item[];
  hit?: string; // transparent hit area for thin props
}

export function gardenLayers(l: Levels, seed = 7): Layer[] {
  const ov = mess(l);
  const layers: Layer[] = [];
  const shared = (id: string, svg: string) => layers.push({ id, metric: null, items: [{ k: id, svg }] });

  // lawn
  {
    let s = '<rect width="600" height="600" fill="#6FA34B"/>';
    for (let x = 0; x < 70; x += 20) s += `<rect x="${x}" y="0" width="10" height="600" fill="#8BBF5E" opacity=".4"/>`;
    for (let x = 536; x < 600; x += 20) s += `<rect x="${x}" y="0" width="10" height="600" fill="#8BBF5E" opacity=".4"/>`;
    s += `<rect x="70" y="0" width="460" height="570" fill="${mix('#6FA34B', '#B5A46A', ov * 0.75)}"/>`;
    const st = Math.max(0, 1 - ov * 2.2);
    if (st > 0) for (let x = 80; x < 530; x += 30) s += `<rect x="${x}" y="160" width="15" height="410" fill="#8BBF5E" opacity="${(0.45 * st).toFixed(2)}"/>`;
    const R = mulberry32(seed + 1);
    for (let i = 0; i < 9; i++) {
      const x = 170 + R() * 330, y = 200 + R() * 340, rx = 20 + R() * 40, ry = 12 + R() * 22, t = 0.25 + R() * 0.7;
      const a = clamp((ov - t) / 0.25);
      if (a > 0) s += `<ellipse cx="${f0(x)}" cy="${f0(y)}" rx="${f0(rx)}" ry="${f0(ry)}" fill="#8A6F4E" opacity="${(0.8 * a).toFixed(2)}"/>`;
    }
    shared('lawn', s);
  }

  // long grass (thumb)
  {
    const R = mulberry32(seed + 2);
    const n = Math.round(l.thumb * 520);
    const len = 3 + l.thumb * 10;
    const items: Item[] = [];
    for (let i = 0; i < 520; i++) {
      const x = 78 + R() * 444, y = 165 + R() * 400, dx = (R() - 0.5) * 5;
      const c = ['#5E7F35', '#7A8A3E', '#4C6B2A'][i % 3];
      if (i < n) items.push({ k: `g${i}`, svg: `<path d="M${f0(x)},${f0(y)} l${f1(dx)},-${f1(len)}" stroke="${c}" stroke-width="1.3" opacity=".7"/>` });
    }
    layers.push({ id: 'grass', metric: 'thumb', items, hit: '<rect x="78" y="165" width="444" height="400" fill="transparent"/>' });
  }

  // house + patio
  {
    const fade = ov * 0.4;
    let s = `<rect x="126" y="0" width="360" height="124" fill="${SH}"/>`;
    s += `<polygon points="110,0 490,0 490,110 110,110" fill="${mix('#6E7378', '#B8B0A0', fade)}"/>`;
    s += `<polygon points="110,110 490,110 420,45 180,45" fill="${mix('#63686D', '#A9A296', fade)}"/>`;
    s += `<polygon points="110,0 180,45 110,110" fill="${mix('#7C8186', '#B0A99C', fade)}"/>`;
    s += '<g stroke="rgba(0,0,0,.08)">';
    for (let y = 6; y < 110; y += 7) s += `<line x1="110" y1="${y}" x2="490" y2="${y}"/>`;
    s += '</g>';
    s += `<line x1="110" y1="110" x2="490" y2="110" stroke="${mix('#F2EEE6', '#B7AC95', ov)}" stroke-width="3"/>`;
    s += `<rect x="210" y="110" width="180" height="52" fill="${mix('#D9D6CF', '#BDB6A8', ov)}"/>`;
    for (let x = 210; x <= 390; x += 30) s += `<line x1="${x}" y1="110" x2="${x}" y2="162" stroke="#C4C0B8"/>`;
    shared('house', s);
  }

  // vines (thumb)
  {
    const R = mulberry32(seed + 3);
    const n = Math.round(l.thumb * 36);
    const items: Item[] = [];
    for (let i = 0; i < 36; i++) {
      let x: number, y: number;
      if (i % 3 === 0) { x = 72 + R() * 8; y = 120 + R() * 440; } else { x = 112 + R() * 376; y = 96 + R() * 18; }
      const r = 4 + R() * 5;
      const svg = blob(x, y, r, '#4A6B2C', R, 2);
      if (i < n) items.push({ k: `v${i}`, svg });
    }
    layers.push({ id: 'vines', metric: 'thumb', items });
  }

  // path stones
  {
    const R = mulberry32(seed + 4);
    let s = '';
    for (let i = 0; i < 9; i++) {
      const t = i / 8, x = 300 + 110 * Math.sin(t * 2.2) * t + 30 * t, y = 182 + t * 350, j = (R() - 0.5) * ov * 30;
      s += `<g transform="translate(${f0(x + j)},${f0(y)}) rotate(${f0(j * 1.4)})"><rect x="-20" y="-11" width="42" height="26" rx="7" fill="${SH}"/><rect x="-23" y="-14" width="42" height="26" rx="7" fill="${mix('#D9D6CF', '#B9B2A3', ov)}"/></g>`;
    }
    shared('stones', s);
  }

  // garden bed + potatoes (potato). Each slot has its own RNG so slots never jump.
  {
    const items: Item[] = [{ k: 'bed', svg: `<rect x="82" y="180" width="62" height="370" rx="5" fill="${mix('#7A5A3C', '#6E5A44', ov)}"/>` }];
    const k = Math.round(l.potato * 12);
    for (let i = 0; i < 12; i++) {
      const R = mulberry32(seed * 101 + i * 7 + 5);
      const x = 113, y = 198 + i * 29;
      let s = '';
      if (i < k) {
        for (let p = 0; p < 3; p++) {
          const px = x + (R() - 0.5) * 30, py = y + (R() - 0.5) * 14;
          s += `<ellipse cx="${f0(px)}" cy="${f0(py)}" rx="9" ry="6.5" fill="#B08A5A" transform="rotate(${f0(R() * 60 - 30)} ${f0(px)} ${f0(py)})"/><circle cx="${f0(px - 3)}" cy="${f0(py - 1)}" r="1" fill="#6E5236"/><circle cx="${f0(px + 3)}" cy="${f0(py + 2)}" r="1" fill="#6E5236"/>`;
        }
        items.push({ k: `p${i}`, svg: s });
      } else {
        s += `<circle cx="${x + 3}" cy="${y + 3}" r="12" fill="${SH}"/><circle cx="${x}" cy="${y}" r="12" fill="#4E7F35"/><circle cx="${x - 3}" cy="${y - 3}" r="5" fill="#669B44"/>`;
        const fc = ['#E8743B', '#F0A3B8', '#FFFFFF'][i % 3];
        for (let f = 0; f < 4; f++) s += `<circle cx="${f0(x + (R() - 0.5) * 16)}" cy="${f0(y + (R() - 0.5) * 16)}" r="2.3" fill="${fc}"/>`;
        items.push({ k: `f${i}`, svg: s });
      }
    }
    if (l.potato > 0.85)
      items.push({
        k: 'couch',
        svg: `<g transform="translate(330,330) rotate(-14)"><rect x="-58" y="-22" width="124" height="56" rx="8" fill="${SH}"/><rect x="-64" y="-28" width="124" height="56" rx="8" fill="#8A5A7A"/><rect x="-64" y="-28" width="124" height="14" rx="6" fill="#6E4562"/><rect x="-60" y="-12" width="56" height="36" rx="5" fill="#A06E90"/><rect x="0" y="-12" width="56" height="36" rx="5" fill="#A06E90"/><rect x="-72" y="-28" width="12" height="56" rx="5" fill="#6E4562"/><rect x="56" y="-28" width="12" height="56" rx="5" fill="#6E4562"/><ellipse cx="20" cy="4" rx="8" ry="5" fill="#B08A5A"/></g>`,
      });
    layers.push({ id: 'bed', metric: 'potato', items });
  }

  // newspapers (headline)
  {
    const R = mulberry32(seed + 6);
    const k = Math.round(l.headline * 12);
    const items: Item[] = [];
    for (let i = 0; i < 12; i++) {
      const x = 180 + R() * 320, y = 200 + R() * 330, r = R() * 180;
      if (i < k) items.push({ k: `n${i}`, svg: paper(x, y, r) });
    }
    layers.push({ id: 'newspapers', metric: 'headline', items });
  }

  // fence
  {
    const fc = mix('#8A5E3C', '#8C8478', ov);
    let s = `<rect x="66" y="110" width="8" height="464" fill="${fc}"/><rect x="526" y="110" width="8" height="464" fill="${fc}"/><rect x="66" y="566" width="468" height="8" fill="${fc}"/>`;
    for (let y = 120; y < 570; y += 34) s += `<rect x="64" y="${y}" width="12" height="6" fill="#5E4028"/><rect x="524" y="${y}" width="12" height="6" fill="#5E4028"/>`;
    for (let x = 90; x < 530; x += 34) s += `<rect x="${x}" y="564" width="6" height="12" fill="#5E4028"/>`;
    shared('fence', s);
  }

  // letterbox + junk mail (seen)
  {
    const R = mulberry32(seed + 7);
    const k = Math.round(l.seen * 36);
    const cols = ['#E8D44D', '#E86A5A', '#5AA0D8', '#FFFFFF', '#F0A3B8', '#9AD07A'];
    const items: Item[] = [];
    for (let i = 0; i < 36; i++) {
      const spread = 10 + i * 2.2;
      const x = 470 + (R() - 0.5) * spread * 2;
      const y = 548 - R() * spread * 1.4 + (R() < 0.35 ? R() * 40 : 0);
      const r = R() * 360;
      if (i < k)
        items.push({ k: `m${i}`, svg: `<rect x="${f0(x - 8)}" y="${f0(y - 6)}" width="16" height="11" fill="${cols[i % 6]}" stroke="rgba(0,0,0,.25)" stroke-width=".6" transform="rotate(${f0(r)} ${f0(x)} ${f0(y)})"/>` });
    }
    items.push({ k: 'box', svg: '<rect x="458" y="556" width="30" height="20" fill="rgba(20,30,20,0.25)"/><rect x="455" y="552" width="30" height="20" rx="2" fill="#3A3D40"/><rect x="460" y="556" width="20" height="3" fill="#1E2023"/>' });
    if (l.seen > 0.5)
      items.push({ k: 'letters', svg: '<rect x="462" y="545" width="14" height="10" fill="#E8D44D" transform="rotate(-15 469 550)"/><rect x="466" y="543" width="14" height="10" fill="#fff" transform="rotate(10 473 548)"/>' });
    layers.push({ id: 'letterbox', metric: 'seen', items });
  }

  // kookaburras (laugh)
  {
    const pos: [number, number, number][] = [[70, 200, -90], [530, 250, 90], [200, 570, 0], [70, 340, -90], [530, 400, 90], [330, 570, 0], [70, 470, -90], [530, 520, 90], [120, 570, 0], [420, 570, 0]];
    const k = Math.round(l.laugh * 10);
    layers.push({ id: 'kookaburras', metric: 'laugh', items: pos.slice(0, k).map((p, i) => ({ k: `k${i}`, svg: kook(...p) })) });
  }

  // seeds + weeds next door (forwards)
  {
    const R = mulberry32(seed + 8);
    const k = Math.round(l.forwards * 40);
    const items: Item[] = [];
    for (let i = 0; i < 40; i++) {
      const side = i % 3;
      let x: number, y: number;
      if (side === 0) { x = 10 + R() * 100; y = 160 + R() * 420; }
      else if (side === 1) { x = 490 + R() * 100; y = 160 + R() * 420; }
      else { x = 120 + R() * 380; y = 540 + R() * 58; }
      const r = 4 + R() * 3;
      if (i >= k) continue;
      let s = `<path d="M${f0(x - 26)},${f0(y + 8)} q14,-12 26,-8" stroke="#fff" stroke-width=".8" fill="none" opacity=".5" stroke-dasharray="2 4"/>` + puff(x, y, r);
      const out = x < 62 || x > 538 || y > 578;
      if (out && l.forwards > 0.4) {
        let g = '';
        for (let a = 0; a < 5; a++) g += `<line x1="${f0(x + 4)}" y1="${f0(y + 9)}" x2="${f1(x + 4 + 7 * Math.cos(a * 1.25))}" y2="${f1(y + 9 + 7 * Math.sin(a * 1.25))}"/>`;
        s += `<g stroke="#3F5E22" stroke-width="2" stroke-linecap="round">${g}</g>`;
      }
      items.push({ k: `s${i}${out && l.forwards > 0.4 ? 'w' : ''}`, svg: s });
    }
    layers.push({ id: 'seeds', metric: 'forwards', items });
  }

  // leaves + tree (overall)
  {
    const R = mulberry32(seed + 9);
    const n = Math.round(ov * 140);
    let s = '';
    for (let i = 0; i < 140; i++) {
      const x = 80 + R() * 440, y = 120 + R() * 440;
      const c = ['#C77A2E', '#A85A23', '#D9A443'][i % 3];
      if (i < n) s += `<ellipse cx="${f0(x)}" cy="${f0(y)}" rx="3.5" ry="2.2" fill="${c}"/>`;
    }
    const T = mulberry32(seed + 10);
    s += `<ellipse cx="482" cy="226" rx="70" ry="60" fill="${SH}"/>` + blob(456, 200, 62, mix('#4E7F35', '#5E6E34', ov), T, 8) + blob(440, 184, 26, mix('#7DB056', '#8A9A50', ov), T, 3);
    s += '<rect width="600" height="600" fill="url(#sun)"/>';
    shared('tree', s);
  }
  return layers;
}

export const GARDEN_DEFS =
  '<defs><linearGradient id="sun" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB35C" stop-opacity=".16"/><stop offset="1" stop-color="#FFB35C" stop-opacity="0"/></linearGradient></defs>';

/** Whole garden as one SVG string (street, share card, thumbnails). */
export function gardenSVG(l: Levels, seed = 7, attrs = ''): string {
  const body = gardenLayers(l, seed)
    .map((ly) => ly.items.map((i) => i.svg).join(''))
    .join('');
  return `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" ${attrs}>${GARDEN_DEFS}${body}</svg>`;
}

/** Fallback focus anchors when a prop group is empty. */
export const ANCHORS: Record<MetricKey, { x: number; y: number; w: number; h: number }> = {
  thumb: { x: 160, y: 200, w: 120, h: 90 },
  headline: { x: 200, y: 260, w: 200, h: 140 },
  forwards: { x: 500, y: 300, w: 90, h: 120 },
  potato: { x: 82, y: 180, w: 62, h: 370 },
  laugh: { x: 520, y: 230, w: 24, h: 40 },
  seen: { x: 440, y: 520, w: 60, h: 60 },
};
