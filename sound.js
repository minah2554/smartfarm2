/* 짧은 효과음 (외부 파일 없음, WebAudio로 생성). 화면 오른쪽 위 🔊 버튼으로 끌 수 있다. */
let ctx = null, muted = false;
try { muted = localStorage.getItem('sf2-muted') === '1'; } catch { /* 무시 */ }
function tone(freq, start, dur, type = 'sine', gain = 0.08) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + start;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch { /* 소리를 못 내는 환경 */ }
}
export const sfx = {
  tap: () => tone(660, 0, 0.06, 'triangle', 0.05),
  error: () => { tone(180, 0, 0.18, 'sawtooth', 0.06); tone(140, 0.14, 0.22, 'sawtooth', 0.06); },
  unlock: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.07)),
  hint: () => tone(880, 0, 0.12, 'sine', 0.05),
  type: () => tone(1200 + Math.random() * 300, 0, 0.02, 'square', 0.015),
  clear: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.4, 'triangle', 0.07))
};
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; try { localStorage.setItem('sf2-muted', muted ? '1' : '0'); } catch { /* 무시 */ } if (muted) haltBgm(); else if (wanted) bgm.start(wanted); return muted; }

/* 배경음악 — 스토리 영상(발랄) · 보너스 게임 3종(긴장감). 외부 파일 없이 WebAudio 시퀀서로 만들어요.
   소리 크기는 THEMES의 volume(0.1~0.3 정도, 클수록 크게)으로 조절해요. */
const mid = m => 440 * Math.pow(2, (m - 69) / 12);
const triad = (r, minor) => [r, r + (minor ? 3 : 4), r + 7];
let noiseBuf = null;
function out() { return master; }
function note(m, t, dur, type, gain) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(mid(m), t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out()); o.start(t); o.stop(t + dur + 0.03);
}
function pad(ms, t, dur, gain) {
  ms.forEach(m => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(mid(m), t); o.detune.value = Math.random() * 8 - 4;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; o.connect(f).connect(g).connect(out()); o.start(t); o.stop(t + dur + 0.05); });
}
function kick(t, gain = 0.9) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g).connect(out()); o.start(t); o.stop(t + 0.2);
}
function noise(t, dur, gain, freq = 7000, kind = 'highpass') {
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noiseBuf; f.type = kind; f.frequency.value = freq;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(f).connect(g).connect(out()); src.start(t); src.stop(t + dur + 0.02);
}

const THEMES = {
  // ☀️ 스토리 영상: C장조 · 발랄하고 상쾌하게 (C → G → Am → F)
  prologue: { bpm: 120, volume: 0.24, chords: [[48, 0], [43, 0], [45, 1], [41, 0]],
    melody: [[72, , 76, , 79, , 76, , 77, , 76, , 74, , 72], [71, , 74, , 79, , 74, , 76, , 74, , 71], [72, , 76, , 81, , 79, , 76, , , 74, 76], [77, , 76, , 74, , 72, , 74, , 76, , 79, , 84]],
    step(t, s, b, d) { const [r, mi] = this.chords[b % 4], tri = triad(r, mi), mel = this.melody[b % 4][s];
      if (s % 8 === 0) kick(t, 0.55);
      if (s % 4 === 2) noise(t, 0.05, 0.12);
      if (s % 4 === 0) note(r - 12 + (s === 8 ? 7 : 0), t, d * 3, 'triangle', 0.5);
      if (s === 6 || s === 14) note(r, t, d * 1.5, 'triangle', 0.35);
      if (s === 4 || s === 12) tri.forEach(m => note(m + 12, t, d * 1.6, 'triangle', 0.12));
      if (mel) note(mel, t, d * 1.8, 'square', 0.09);
      if (mel && b % 2) note(mel + 12, t + d * 0.5, d, 'sine', 0.05); } },

  // 👀 순간 관찰: D단조 · 째깍째깍 초침 + 심장 박동 (집중)
  observation: { bpm: 100, volume: 0.3, chords: [[50, 1], [46, 0], [48, 0], [45, 0]],
    step(t, s, b, d) { const [r, mi] = this.chords[b % 4], tri = triad(r, mi);
      if (s % 4 === 0) note(96, t, 0.03, 'sine', 0.25); else if (s % 2 === 0) note(91, t, 0.02, 'sine', 0.12);
      if (s === 0 || s === 3) kick(t, s ? 0.45 : 0.7);
      if (s === 0) pad(tri.map(m => m + 12), t, d * 16, 0.05);
      if (s % 2 === 0) note(tri[(s / 2) % 3] + 24 + (b % 4 === 3 && s > 8 ? 1 : 0), t, d * 1.2, 'triangle', 0.07); } },

  // 🔍 숨은 물건 찾기: E단조 · 살금살금 탐색 (피치카토 베이스 + 반음 모티프)
  hidden: { bpm: 126, volume: 0.25, chords: [[40, 1], [36, 0], [45, 1], [47, 0]],
    walk: [0, 7, 12, 7, 3, 7, 10, 7],
    step(t, s, b, d) { const [r] = this.chords[b % 4];
      if (s % 2 === 0) note(r + 12 + this.walk[s / 2], t, d * 1.1, 'triangle', 0.45);
      if (s === 4 || s === 12) noise(t, 0.12, 0.35, 1800, 'bandpass');
      if (s % 4 === 2) noise(t, 0.04, 0.08);
      if (b % 2 === 0 && [0, 3, 6].includes(s)) note(r + 36 + [0, 3, 2][[0, 3, 6].indexOf(s)], t, d * 1.6, 'square', 0.06);
      if (b % 2 === 1 && [8, 10, 11].includes(s)) note(r + 31 + [0, 1, 0][[8, 10, 11].indexOf(s)], t, d * 1.2, 'square', 0.05); } },

  // 🎨 컬러 터치: A단조 · 빠른 아케이드 (질주하는 베이스 + 16분 아르페지오)
  color: { bpm: 152, volume: 0.18, chords: [[45, 1], [41, 0], [43, 0], [40, 0]],
    step(t, s, b, d) { const [r, mi] = this.chords[b % 4], tri = triad(r, mi);
      if (s % 4 === 0) kick(t, 0.75);
      if (s % 2 === 1) noise(t, 0.03, 0.07); if (s === 4 || s === 12) noise(t, 0.1, 0.3, 2000, 'bandpass');
      if (s % 2 === 0) note(r - 12 + (s % 4 ? 12 : 0), t, d * 1.6, 'square', 0.16);
      note([...tri, tri[0] + 12][s % 4] + 24, t, d * 0.9, 'square', 0.045); } }
};

let wanted = null, playing = null, bgmTimer = null, master = null, step = 0, nextAt = 0;
function schedule() {
  const th = THEMES[playing], d = 60 / th.bpm / 4;
  while (nextAt < ctx.currentTime + 0.3) { th.step(nextAt, step % 16, Math.floor(step / 16), d); step += 1; nextAt += d; }
}
function haltBgm() {
  clearInterval(bgmTimer); bgmTimer = null; playing = null;
  if (master && ctx) { const m = master; m.gain.cancelScheduledValues(ctx.currentTime); m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15); setTimeout(() => { try { m.disconnect(); } catch { /* 무시 */ } }, 1500); }
  master = null;
}
export const bgm = {
  start(theme = 'prologue') {
    if (!THEMES[theme]) return;
    wanted = theme;
    if (muted || playing === theme) return;
    haltBgm();
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume?.();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
      master = ctx.createGain(); master.gain.setValueAtTime(0.0001, ctx.currentTime); master.gain.exponentialRampToValueAtTime(THEMES[theme].volume, ctx.currentTime + 0.8);
      master.connect(lp).connect(ctx.destination);
      playing = theme; step = 0; nextAt = ctx.currentTime + 0.05; schedule(); bgmTimer = setInterval(schedule, 100);
    } catch { /* 소리를 못 내는 환경 */ }
  },
  // theme을 주면 그 음악이 나올 때만 멈춰요 (예: 화면이 바뀌어도 게임 음악은 유지)
  stop(theme) { if (theme && wanted !== theme) return; wanted = null; haltBgm(); },
  playing: () => playing
};
