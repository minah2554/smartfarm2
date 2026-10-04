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
export function toggleMute() { muted = !muted; try { localStorage.setItem('sf2-muted', muted ? '1' : '0'); } catch { /* 무시 */ } if (muted) haltBgm(); else if (bgmWanted) bgm.start(); return muted; }

/* 스토리 영상 배경음악 — 잔잔한 신스 패드 (외부 파일 없음). 볼륨은 BGM_VOLUME으로 조절 */
const BGM_VOLUME = 0.045;
const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];   // Am · F · C · G
const BAR = 4;   // 화음 하나의 길이(초)
let bgmWanted = false, bgmTimer = null, master = null, bar = 0, nextAt = 0;
function voice(freq, t, dur, type, gain) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function schedule() {
  while (nextAt < ctx.currentTime + BAR * 1.5) {
    const ch = CHORDS[bar % CHORDS.length], t = nextAt;
    ch.forEach(f => voice(f, t, BAR + 1.2, 'triangle', 0.22));
    voice(ch[0] / 2, t, BAR + 0.8, 'sine', 0.3);
    [0, 1, 2, 1].forEach((k, i) => voice(ch[k] * 2, t + i * (BAR / 4) + 0.1, 1.4, 'sine', 0.07));
    bar += 1; nextAt += BAR;
  }
}
function haltBgm() {
  clearInterval(bgmTimer); bgmTimer = null;
  if (master && ctx) { const m = master; m.gain.cancelScheduledValues(ctx.currentTime); m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); setTimeout(() => { try { m.disconnect(); } catch { /* 무시 */ } }, 2500); }
  master = null;
}
export const bgm = {
  start() {
    bgmWanted = true;
    if (muted || bgmTimer) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume?.();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      master = ctx.createGain(); master.gain.setValueAtTime(0.0001, ctx.currentTime); master.gain.exponentialRampToValueAtTime(BGM_VOLUME, ctx.currentTime + 2.5);
      master.connect(lp).connect(ctx.destination);
      bar = 0; nextAt = ctx.currentTime + 0.1; schedule(); bgmTimer = setInterval(schedule, 1000);
    } catch { /* 소리를 못 내는 환경 */ }
  },
  stop() { bgmWanted = false; haltBgm(); }
};
