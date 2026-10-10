// Wolisz?! - tiny WebAudio blips, started on the first user gesture.

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
  return ctx;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(v) {
  muted = v;
}

function tone(freq, dur, type = 'square', vol = 1, slide = 0, delay = 0) {
  if (muted) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.6, lp = 1200) {
  if (muted) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lp;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

export const sfx = {
  click: () => tone(660, 0.07, 'square', 0.6),
  pick: () => { tone(523, 0.08, 'square', 0.7); tone(784, 0.12, 'square', 0.7, 0, 0.08); },
  next: () => { tone(392, 0.1, 'triangle', 0.8); tone(523, 0.1, 'triangle', 0.8, 0, 0.1); tone(659, 0.16, 'triangle', 0.8, 0, 0.2); },
  jump: () => tone(300, 0.14, 'square', 0.35, 400),
  land: () => noise(0.08, 0.4, 500),
  plop: () => tone(180, 0.18, 'sine', 1, -120),
  zap: () => tone(900, 0.2, 'sawtooth', 0.5, -700),
  fart: () => { tone(110, 0.3, 'sawtooth', 0.7, -50); noise(0.25, 0.5, 700); },
  boom: () => { noise(0.5, 1, 900); tone(80, 0.4, 'sine', 1, -40); },
  whoosh: () => noise(0.25, 0.5, 2400),
  slip: () => tone(700, 0.35, 'triangle', 0.6, -500),
  splat: () => noise(0.12, 0.6, 800),
  place: () => tone(240, 0.08, 'square', 0.6),
  shout: () => { tone(320, 0.35, 'sawtooth', 0.6, 400); noise(0.3, 0.4, 3000); },
  pop: () => tone(1200, 0.1, 'sine', 0.5, 600),
  join: () => { tone(440, 0.08, 'square', 0.5); tone(660, 0.1, 'square', 0.5, 0, 0.08); },
  stink: () => tone(120, 0.3, 'sawtooth', 0.5, -30),
};
