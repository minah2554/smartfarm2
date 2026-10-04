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
export function toggleMute() { muted = !muted; try { localStorage.setItem('sf2-muted', muted ? '1' : '0'); } catch { /* 무시 */ } return muted; }
