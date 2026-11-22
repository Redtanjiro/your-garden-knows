// Tiny synthesised sounds. No files, nothing loaded from anywhere.
let ctx: AudioContext | null = null;
let on = true;
export const soundOn = () => on;
export function setSound(v: boolean) {
  on = v;
}
function ac() {
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
function tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + at;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
export const sfx = {
  buzz() {
    if (!on) return;
    tone(180, 0, 0.09, 'square', 0.03);
    tone(180, 0.14, 0.09, 'square', 0.03);
  },
  tap() {
    if (!on) return;
    tone(660, 0, 0.06, 'sine', 0.05);
  },
  grow() {
    if (!on) return;
    tone(392, 0, 0.12, 'triangle', 0.05);
    tone(523, 0.08, 0.16, 'triangle', 0.04);
  },
  calm() {
    if (!on) return;
    tone(523, 0, 0.14, 'sine', 0.04);
    tone(784, 0.1, 0.22, 'sine', 0.03);
  },
  reveal() {
    if (!on) return;
    [392, 494, 587, 784].forEach((f, i) => tone(f, i * 0.12, 0.5, 'sine', 0.035));
  },
};
