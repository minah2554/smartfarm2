/* 🌙 밤 구역 보너스 게임 — '모두의 온기' (재가동 코어)
   연구원들이 동시에 패드를 누르고 버티면 코어가 점화돼요. 여러 손가락 터치가 안 되는 기기는 '한 명씩 채우기'.
   낮 games.js와 같은 모양(.overlay.game-layer > .modal.game)으로 띄워요. 설정은 night-content.js의 games.warmth. */
import {NIGHT as N} from './night-content.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/* 배경음악: night/assets의 음악 파일을 <audio>로 재생 (🔊 버튼을 따르고, 게임을 하는 동안만) */
function music(isMuted) {
  let a = null, fade = null;
  const vol = Math.max(0, Math.min(1, N.music?.volume ?? 0.3));
  return {
    start() {
      if (isMuted() || !N.music?.file) return;
      try {
        a = a || Object.assign(new Audio(N.assets + N.music.file), {loop: true, volume: 0});
        const p = a.play(); p?.catch?.(() => {});
        clearInterval(fade); fade = setInterval(() => { if (!a) return clearInterval(fade); a.volume = Math.min(vol, a.volume + vol / 15); if (a.volume >= vol) clearInterval(fade); }, 80);
      } catch { /* 소리를 못 내는 환경 */ }
    },
    stop() { clearInterval(fade); if (!a) return; const x = a; a = null; let v = x.volume; const t = setInterval(() => { v -= 0.04; if (v <= 0) { clearInterval(t); x.pause(); } else x.volume = v; }, 60); },
    sync() { if (isMuted()) this.stop(); else if (!a) this.start(); }
  };
}

/* 점화음 · 차오르는 소리 (WebAudio, 🔊가 꺼져 있으면 소리 없음) */
function warmSound(isMuted) {
  let A = null, hum = null, sparkT = 0;
  const ctx = () => { if (isMuted()) return null; try { A = A || new (window.AudioContext || window.webkitAudioContext)(); A.resume?.(); } catch { A = null; } return A; };
  function build() {
    if (hum || !ctx()) return;
    const out = A.createGain(); out.gain.value = 0; out.connect(A.destination);
    const lp = A.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 6; lp.connect(out);
    const o1 = A.createOscillator(), o2 = A.createOscillator(), o3 = A.createOscillator(), g3 = A.createGain();
    o1.type = o2.type = 'sawtooth'; o1.frequency.value = 110; o2.frequency.value = 110.8; o3.frequency.value = 55; g3.gain.value = 0.6;
    o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(out);
    [o1, o2, o3].forEach(o => o.start());
    hum = {out, lp, o1, o2, o3};
  }
  function blip(f, vol, dur) {
    if (!ctx()) return; const t = A.currentTime, o = A.createOscillator(), g = A.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(A.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  const kill = () => { if (!hum || !A) return; const h = hum; hum = null; h.out.gain.setTargetAtTime(0, A.currentTime, 0.1); setTimeout(() => { try { [h.o1, h.o2, h.o3].forEach(o => o.stop()); } catch { /* 무시 */ } }, 800); };
  return {
    touch() { build(); blip(520, 0.12, 0.12); blip(780, 0.06, 0.16); },
    update(charge, active) {
      if (isMuted()) { kill(); return; }
      if (!A) return; build(); if (!hum) return; const t = A.currentTime, f = 110 + charge * charge * 770;
      hum.o1.frequency.setTargetAtTime(f, t, 0.05); hum.o2.frequency.setTargetAtTime(f * 1.007, t, 0.05); hum.o3.frequency.setTargetAtTime(f / 2, t, 0.05);
      hum.lp.frequency.setTargetAtTime(380 + charge * 3600, t, 0.06);
      hum.out.gain.setTargetAtTime(active ? 0.035 + charge * 0.11 : (charge > 0.02 ? charge * 0.05 : 0), t, active ? 0.08 : 0.25);
      if (active && charge > 0.05 && t > sparkT) { blip(900 + Math.random() * 1500 + charge * 900, 0.018 + charge * 0.03, 0.09); sparkT = t + 0.2 - charge * 0.14; }
    },
    ignite() {
      kill(); if (!ctx()) return; const t = A.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => {
        const o = A.createOscillator(), g = A.createGain(), s0 = t + 0.3 + k * 0.07; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, s0); g.gain.exponentialRampToValueAtTime(0.11, s0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s0 + 2.6);
        o.connect(g).connect(A.destination); o.start(s0); o.stop(s0 + 2.7);
      });
    },
    stop: kill
  };
}

/* people: 모둠원 이름 목록 · onWin(): 성공 시 · ctx.isMuted */
export function launchWarmth(people, onWin, ctx = {}) {
  const G = N.games.warmth, isMuted = ctx.isMuted || (() => false);
  const names = people.filter(Boolean).slice(0, G.maxPads || 6);
  const n = Math.max(G.minPads || 2, names.length || 3); while (names.length < n) names.push(`연구원 ${names.length + 1}`);
  const pads = names.map((nm, i) => { const a = (-90 + i * 360 / n) * Math.PI / 180, x = 50 + 37 * Math.cos(a), y = 48 + 37 * Math.sin(a);
    return `<div class="wpad" data-i="${i}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"><div class="wring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="wr-bg" cx="50" cy="50" r="44"/><circle class="wr-fg" cx="50" cy="50" r="44"/>
      <path d="M50 24c-12 0-20 9-20 21v10M50 32c-7 0-12 5-12 13v14M50 40c-3 0-5 2-5 5v20M50 32c7 0 12 5 12 13v8M50 24c12 0 20 9 20 21v4M55 45v12c0 6-2 10-5 14" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg></div><span>${esc(nm)}</span></div>`; }).join('');
  const layer = document.createElement('div'); layer.className = 'overlay game-layer night-game';
  layer.innerHTML = `<section class="modal game wide warmth" role="dialog" aria-modal="true" aria-label="${esc(G.title)}">
    <button class="close ghost" type="button">닫기</button>
    <p class="kicker">보너스 게임 · ${esc(G.place)} · 05:58</p><h2 id="wTitle">${G.icon} ${esc(G.title)}</h2>
    <p id="wSub">${esc(G.instruction)}</p>
    <div class="wstage" id="wstage"><canvas id="wcv"></canvas><div class="core" id="core"><div class="core-in"></div><span id="corePct">0%</span></div>${pads}</div>
    <div class="wgauge" aria-hidden="true"><i id="wg"></i></div><p class="wcount" id="wcount">0 / ${n} 연결</p>
    <button class="text-btn" type="button" id="seqBtn">여러 손가락 터치가 안 되나요? 한 명씩 채우기</button></section>`;
  document.body.append(layer);
  const $ = s => layer.querySelector(s), stage = $('#wstage'), cv = $('#wcv'), g2 = cv.getContext('2d'), padEls = [...layer.querySelectorAll('.wpad')], core = $('#core');
  const snd = warmSound(isMuted), bgm = music(isMuted);
  let active = padEls.map(() => null), fill = padEls.map(() => 0), seq = false, charge = 0, done = false, parts = [], last = performance.now(), raf = 0, closed = false;
  const size = () => { const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr; g2.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const close = () => { if (closed) return; closed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', size); snd.stop(); bgm.stop(); layer.remove(); ctx.onClose?.(); };
  size(); window.addEventListener('resize', size); bgm.start();
  $('.close').onclick = close;
  stage.addEventListener('contextmenu', e => e.preventDefault());
  padEls.forEach((pd, i) => {
    pd.addEventListener('pointerdown', e => { e.preventDefault(); if (done) return; active[i] = e.pointerId; try { pd.setPointerCapture(e.pointerId); } catch { /* 무시 */ } pd.classList.add('on'); snd.touch(); });
    const up = e => { if (active[i] === e.pointerId) { active[i] = null; pd.classList.remove('on'); } };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => pd.addEventListener(ev, up));
  });
  $('#seqBtn').onclick = () => { seq = !seq; $('#seqBtn').textContent = seq ? '다 함께 동시에 누르기로 돌아가기' : '여러 손가락 터치가 안 되나요? 한 명씩 채우기';
    $('#wSub').textContent = seq ? `한 명씩 자기 패드를 ${G.seqSec}초 동안 눌러 온기를 채우세요. 모두 채우면 코어가 점화돼요.` : G.instruction; fill = fill.map(() => 0); charge = 0; };
  const center = el => { const a = el.getBoundingClientRect(), b = stage.getBoundingClientRect(); return {x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2}; };
  function loop(t) {
    if (!layer.isConnected) { close(); return; }
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    const on = active.map(a => a !== null), cnt = on.filter(Boolean).length;
    if (seq) { on.forEach((o, i) => { if (o) fill[i] = Math.min(1, fill[i] + dt / G.seqSec); }); charge = fill.reduce((a, b) => a + b, 0) / fill.length; }
    else { charge = cnt === padEls.length ? Math.min(1, charge + dt / G.holdSec) : Math.max(0, charge - dt / 1.2); fill = on.map(o => o ? Math.max(charge, 0.15) : 0); }
    padEls.forEach((pd, i) => { pd.style.setProperty('--heat', (seq ? fill[i] : on[i] ? 1 : 0).toFixed(3)); pd.querySelector('.wr-fg').style.strokeDashoffset = (276 * (1 - (seq ? fill[i] : on[i] ? charge : 0))).toFixed(1);
      if (on[i] || (seq && fill[i] >= 1)) { const c = center(pd), k = center(core); if (Math.random() < 0.6) parts.push({x: c.x + (Math.random() - 0.5) * 30, y: c.y + (Math.random() - 0.5) * 30, tx: k.x, ty: k.y, t: 0, s: 2 + Math.random() * 3, h: 20 + Math.random() * 30}); } });
    $('#wcount').textContent = `${seq ? fill.filter(f => f >= 1).length : cnt} / ${padEls.length} ${seq ? '완료' : '연결'}`;
    $('#wg').style.width = (charge * 100).toFixed(1) + '%'; $('#corePct').textContent = Math.round(charge * 100) + '%';
    core.style.setProperty('--c', charge.toFixed(3));
    if (!done) snd.update(charge, seq ? on.some(Boolean) : cnt > 0);
    g2.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => (p.t += dt * 1.1) < 1);
    parts.forEach(p => { const e = p.t * p.t * (3 - 2 * p.t), x = p.x + (p.tx - p.x) * e, y = p.y + (p.ty - p.y) * e - Math.sin(p.t * Math.PI) * 30;
      g2.beginPath(); g2.fillStyle = `hsla(${p.h},100%,${60 + 20 * p.t}%,${1 - p.t * 0.6})`; g2.arc(x, y, p.s * (1 - p.t * 0.4), 0, 7); g2.fill(); });
    if (charge >= 1 && !done) { done = true; ignite(); }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  function ignite() {
    snd.ignite(); bgm.stop(); core.classList.add('ignite');
    $('#wTitle').textContent = '코어 점화! 시스템 재가동'; $('#wSub').textContent = '모두의 온기가 바이오 랩에 전달되었어요.'; $('#seqBtn').hidden = true;
    layer.querySelector('.modal').classList.add('dawn');
    setTimeout(() => { if (closed) return; closed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', size); snd.stop(); layer.remove(); onWin(); }, 3400);
  }
  return {close};
}
