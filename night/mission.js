/* [NIGHT] 🌙 밤 미션 화면 — 나이트 미션 웹앱의 LOCK 4~8 화면을 디자인·애니메이션 그대로 옮겨 왔어요.
   - 밤의 온실에서 장치를 누르면 이 화면이 온실 위에 열려요. '← 밤의 온실'로 돌아가요.
   - 기록은 낮 앱의 모둠 기록(api.save → night/…)에만 저장해요. 브라우저 저장소(localStorage)에 진행을 저장하지 않아요.
   - 문구·정답은 night-content.js, 힌트는 night-hints.js
   - LOCK 8 연구소장 승인은 '밤 구역 관리코드'를 서버(api/verify.js)가 확인해요. 번호는 코드에 없어요. */
import {NIGHT as N} from './night-content.js';
import {NIGHT_HINTS as HINTS} from './night-hints.js';
import {farmSVG} from './night-scene.js';

// 원래 디자인(글꼴·색)은 mission.css — .nm 안에서만 적용돼요 (낮 style.css는 그대로)
(() => {
  if (document.querySelector('link[data-night-mission]')) return;
  const f = document.createElement('link'); f.rel = 'stylesheet'; f.dataset.nightMission = 'font';
  f.href = 'https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&family=IBM+Plex+Mono:wght@500;700&display=swap';
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.nightMission = 'css'; l.href = new URL('./mission.css', import.meta.url).href;
  document.head.append(f, l);
})();

const KEYS = ['cargo', 'energy', 'twin', 'protocol', 'plan'];   // 화면 번호 1~5 = LOCK 4~8
const M = N.missions;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fill = (t, o) => String(t || '').replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const src = name => name ? `<source src="${N.assets}${name}.mp4" type="video/mp4"><source src="${N.assets}${name}.webm" type="video/webm">` : '';

let A = null, H = {}, L = null, cur = 1, phase = 'stage', lastView = '', timerT = null;
const mem = {team: null, s1: {}, s2f: [], g3: {a: null, b: null}, s4: [], pledges: [], spell: []};
let sel1 = null;
const q = (s, r) => (r || L || document).querySelector(s);
const qa = (s, r) => Array.from((r || L || document).querySelectorAll(s));

/* ── 모둠 기록 읽기 ── */
const T = () => A?.team;
const Z = () => T()?.night || {};
const key = n => KEYS[n - 1];
const sub = n => !!Z().checkpoint?.[key(n)];
const isDone = n => !!Z().done?.[key(n)];
const fragsGot = () => [1, 2, 3, 4, 5].filter(n => isDone(n) || (n === 5 && sub(5)));
const hintsOf = n => Z().hints?.[key(n)] || 0;
const totalHints = () => KEYS.reduce((a, k) => a + (Z().hints?.[k] || 0), 0);
const wrongs = () => Z().wrongs || 0;
const left = () => { const z = Z(), lim = (A.CONFIG.missionMinutes?.night || 35) * 60000; if (!z.startedAt) return lim; return z.startedAt + lim - (z.finishedAt || A.now()); };
// 모둠 입장 때 적은 이름 (모둠장 → 연구원 순서). 태블릿은 LOCK마다 이 순서대로 돌아가며 잡아요.
const people = () => { const t = T(); return [t?.leader, ...A.toList(t?.members)].map(x => String(x || '').trim()).filter(Boolean); };
function holderName(n) { const p = people(); return p.length ? p[(n - 1) % p.length] : '모둠장'; }
function freshMem() { Object.assign(mem, {team: T()?.id, s1: {}, s2f: [], g3: {a: null, b: null}, s4: [], pledges: [], spell: []}); sel1 = null; }

/* ── 바깥(index.js)에서 쓰는 함수 ── */
export const isOpen = () => !!L;
export function open(api, k, hooks) { A = api; H = hooks || {}; if (T()?.id !== mem.team) freshMem(); ensure(); cur = KEYS.indexOf(k) + 1; phase = 'stage'; render(); bgmSync(); }
export function openWarmth(api, hooks) { A = api; H = hooks || {}; ensure(); phase = 'warmth'; bgmSync(); renderWarmth(); }
export function openEnding(api, hooks) { A = api; H = hooks || {}; ensure(); phase = 'end'; bgmSync(); renderEnd(); }
export function close(silent) {
  if (!L) return;
  cancelAnimationFrame(warmRaf); warmS?.stop(); warmS = null; finishType();
  qa('video').forEach(v => { try { v.pause(); } catch { /* 무시 */ } });
  L.remove(); L = null; lastView = '';
  document.querySelectorAll('.nm-ov').forEach(o => o.remove());
  document.body.classList.remove('nm-open'); clearInterval(timerT); bgmSync();
  if (!silent) H.onClose?.();
}
export function sync(api) { A = api; bgmSync(); }

function ensure() {
  if (L) return;
  L = document.createElement('div'); L.className = 'nm nm-layer';
  L.innerHTML = '<div class="wrap" id="nmApp"></div>';
  document.body.append(L); document.body.classList.add('nm-open');
  clearInterval(timerT); timerT = setInterval(updTimer, 500);
}
function h(html) { const app = q('#nmApp'), k = phase + '|' + cur, y = L.scrollTop; app.innerHTML = html; L.scrollTop = k === lastView ? y : 0; lastView = k; }
function render() { if (!L) return; [null, renderS1, renderS2, renderS3, renderS4, renderS5][cur](); }

/* ── 소리: 효과음은 Web Audio 합성, 배경음은 bgm_night.mp3 · 모두 🔊 버튼을 따라요 ── */
const soundOn = () => !A?.isMuted?.();
const SFX = {ctx: null, next: null};
function sfxCtx() {
  if (!soundOn()) return null;
  try { if (!SFX.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; SFX.ctx = new AC(); } if (SFX.ctx.state === 'suspended') SFX.ctx.resume(); } catch { return null; }
  return SFX.ctx;
}
function tone(a, f, t0, dur, vol, type, f2) { const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05); }
function sfxPlay(kind) {
  const a = sfxCtx(); if (!a) return; const t = a.currentTime + 0.01;
  if (kind === 'correct') { tone(a, 659.25, t, 0.16, 0.16, 'triangle'); tone(a, 880, t + 0.11, 0.32, 0.16, 'triangle'); tone(a, 1760, t + 0.11, 0.25, 0.03, 'sine'); }
  else if (kind === 'wrong') { [0, 0.16].forEach((d, i) => { const o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; o.type = 'square'; o.frequency.setValueAtTime(i ? 175 : 220, t + d);
    g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.09, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.14); o.connect(lp); lp.connect(g); g.connect(a.destination); o.start(t + d); o.stop(t + d + 0.2); }); }
  else if (kind === 'pass') {
    const n = a.createBuffer(1, a.sampleRate * 0.12, a.sampleRate), dd = n.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (a.sampleRate * 0.02));
    const s = a.createBufferSource(); s.buffer = n; const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; const g = a.createGain(); g.gain.value = 0.35; s.connect(lp); lp.connect(g); g.connect(a.destination); s.start(t);
    tone(a, 90, t, 0.12, 0.2, 'sine', 55);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(a, f, t + 0.14 + k * 0.085, k === 3 ? 0.7 : 0.22, 0.13, 'triangle'));
    [2093, 2637, 3136].forEach((f, k) => tone(a, f, t + 0.5 + k * 0.06, 0.25, 0.025, 'sine'));
  }
}
/* 밤 배경음(bgm_night.mp3): 스토리 영상 '혈당 경보'가 끝나는 순간부터 → 작전 설명 → 밤의 온실 → LOCK 화면까지 끊김 없이.
   보너스 게임·엔딩에서는 멈추고, 🔊 음소거를 따라요. */
let bgmEl = null, outer = false, fadeT = null, bgmTimer = null, lastNight = 0;
const nightOnScreen = () => { if (document.querySelector('main.nz, .nz-pro')) { lastNight = Date.now(); return true; } return document.body.dataset.view === 'briefing' && Date.now() - lastNight < 5 * 60000; };   // 밤 스토리 영상 바로 뒤 작전 설명까지
export function music(api, on) { A = api || A; outer = !!on; if (!bgmTimer) bgmTimer = setInterval(bgmSync, 500); bgmSync(); }
function fadeTo(v, after) {
  clearInterval(fadeT); const from = bgmEl.volume, t0 = Date.now(), ms = 1600;
  fadeT = setInterval(() => { const k = Math.min(1, (Date.now() - t0) / ms); bgmEl.volume = Math.max(0, Math.min(1, from + (v - from) * k)); if (k >= 1) { clearInterval(fadeT); after?.(); } }, 50);
}
function bgmSync() {
  if (!A || !N.music?.file) return;
  const want = soundOn() && (L ? phase === 'stage' : outer && nightOnScreen());
  if (!bgmEl && want) { bgmEl = new Audio(N.assets + N.music.file); bgmEl.loop = true; bgmEl.volume = 0; bgmEl.dataset.on = ''; }
  if (!bgmEl) return;
  if (want && !bgmEl.dataset.on) { bgmEl.dataset.on = '1'; bgmEl.play()?.catch?.(() => { bgmEl.dataset.on = ''; }); fadeTo(N.music.volume ?? 0.3); }
  if (!want && bgmEl.dataset.on) { bgmEl.dataset.on = ''; fadeTo(0, () => { if (!bgmEl.dataset.on) bgmEl.pause(); }); }
}

/* ── 관제 AI '플로' ── */
function monsterSVG(mood) {
  const alert = mood !== 'calm', screen = alert ? '#3a1730' : '#0f3a26', glow = alert ? '#ff8fc2' : '#7fe0a8';
  const eyes = alert
    ? `<rect x="48" y="70" width="18" height="8" rx="4" fill="${glow}"/><rect x="84" y="70" width="18" height="8" rx="4" fill="${glow}"/><path d="M58 102 Q75 94 92 102" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    : `<path d="M48 76 Q57 66 66 76" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M84 76 Q93 66 102 76" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M56 96 Q75 112 94 96" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 150 150" aria-hidden="true"><g class="body"><ellipse cx="75" cy="140" rx="40" ry="5" fill="${glow}" opacity=".25"/>` +
    '<path d="M75 30 C75 16 86 8 100 10 C98 24 88 30 75 30 Z" fill="#7fe0a8"/><line x1="75" y1="30" x2="75" y2="40" stroke="#7fe0a8" stroke-width="4"/>' +
    `<rect x="24" y="40" width="102" height="86" rx="24" fill="#e9ecff" stroke="#a9b0d6" stroke-width="3"/><rect x="36" y="52" width="78" height="62" rx="14" fill="${screen}"/>${eyes}` +
    `<rect x="44" y="126" width="8" height="10" rx="3" fill="#a9b0d6"/><rect x="98" y="126" width="8" height="10" rx="3" fill="#a9b0d6"/><circle cx="118" cy="46" r="6" fill="${alert ? '#ff6b6b' : '#7fe0a8'}"/></g></svg>`;
}
const monster = (cls, mood) => `<div class="monster ${cls || ''}">${monsterSVG(mood)}</div>`;

/* ── 화면 공통 ── */
function hud() {
  const got = fragsGot(), hp = got.length * 20;
  const fr = [1, 2, 3, 4, 5].map(i => got.includes(i) ? `<div class="frag on" title="LOCK ${i + 3} 명령어 조각">${esc(M[key(i)].frag)}</div>` : `<div class="frag" title="LOCK ${i + 3} 명령어 조각"><small style="font-size:10px;opacity:.7">L${i + 3}</small></div>`).join('');
  const st = [1, 2, 3, 4, 5].map(j => `<span class="${isDone(j) ? 'done' : j === cur ? 'cur' : ''}"></span>`).join('');
  return `<div class="nmhud"><div class="hud-in">
    <button type="button" class="btn nghost nsmall nm-back" id="nmBack">← 밤의 온실</button>
    <div class="nmtimer" id="nmTimer" aria-live="off">--:--</div>
    <div class="hp"><div class="hp-label"><span>시스템 복구율</span><span class="mono">${hp}%</span></div><div class="hp-bar"><div class="hp-fill" style="width:${hp}%"></div></div></div>
    <div class="frags">${fr}</div>
    <button type="button" class="nm-mute" id="nmMute" aria-pressed="${soundOn()}" aria-label="${soundOn() ? '소리 끄기' : '소리 켜기'}">${soundOn() ? '🔊' : '🔇'}</button>
  </div><div class="steps">${st}</div></div>`;
}
function updTimer() {
  const el = q('#nmTimer'); if (!el || !A) return;
  const ms = left(); el.textContent = A.fmt(Math.max(0, ms)); el.classList.toggle('over', ms <= 0);
  bgmSync(); watchApproval();
}
const consoleBar = no => `<div class="consolebar"><span><span class="led"></span>SMART-FARM BIO LAB · NIGHT CONTROL</span><span>LAB TIME <b>${esc(M[key(no)].time)}</b></span><span><span class="led red"></span>GLUCOSE ALERT · LOCK ${no + 3}</span></div>`;
function stageShell(no, title, speech, body, top) {
  return hud() + '<div class="screen" style="padding-top:16px">' + consoleBar(no) +
    `<div class="tablet-bar"><span>이번 LOCK 태블릿 담당</span><b>${esc(holderName(no))}</b><small>화면을 소리 내어 읽으며 진행하고 코드를 입력합니다</small></div>` +
    `<div class="stage-head"><span class="stage-no">LOCK ${no + 3} · ${no} / 5</span><h2>${esc(title)}</h2></div>` +
    `<div class="speech-row">${monster('small', 'alert')}<div class="speech"><b>${esc(N.aiName)}</b><br>${speech}</div></div>` +
    (top || '') + body +
    '<div class="nrow" style="justify-content:space-between">' +
      `<button class="btn nghost nsmall" id="hintBtn">힌트 보기 (−${N.certificate.score.hint}점)</button>` +
      `<span class="dim" id="nmCount" style="font-size:13px">오답 ${wrongs()}회 · 힌트 ${totalHints()}회</span>` +
    '</div></div>';
}
const partA = (title, inner) => `<section class="panel part${sub(cur) ? ' cleared' : ''}" id="partA"><div class="part-title"><span class="lock-ico">${sub(cur) ? '✓' : 'A'}</span>${esc(title)}</div>${inner}</section>`;
const partB = (title, inner) => `<section class="panel part${sub(cur) ? '' : ' locked'}" id="partB"><div class="part-title"><span class="lock-ico">B</span>${esc(title)}</div>${inner}</section>`;
function bindCommon() {
  q('#nmBack')?.addEventListener('click', () => close());
  q('#nmMute')?.addEventListener('click', e => { A.toggleMute(); const b = e.currentTarget, on = soundOn(); b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기'); bgmSync(); });
  bindHint(); updTimer();
}
function setFb(id, msg, good) { const f = document.getElementById(id); if (!f) return; if (good) sfxPlay(SFX.next || 'correct'); SFX.next = null; f.textContent = msg; f.className = 'nfb ' + (good ? 'good' : 'bad'); }
function wrong(el) {
  sfxPlay('wrong'); A.save({'night/wrongs': wrongs() + 1});
  if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  const m = q('.monster'); if (m) { m.classList.remove('laugh'); void m.offsetWidth; m.classList.add('laugh'); }
  const c = q('#nmCount'); if (c) c.textContent = `오답 ${wrongs()}회 · 힌트 ${totalHints()}회`;
}
function clearA() {
  A.save({[`night/checkpoint/${key(cur)}`]: A.SERVER_TIME});
  const a = q('#partA'), b = q('#partB');
  if (a) { a.classList.add('cleared'); q('.lock-ico', a).textContent = '✓'; }
  if (b) { b.classList.remove('locked'); b.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  const m = q('.monster'); if (m) { m.classList.remove('hit'); void m.offsetWidth; m.classList.add('hit'); }
}
function overlay(inner, onClose, wide) {
  const d = document.createElement('div'); d.className = 'nm nm-ov';
  d.innerHTML = `<div class="noverlay"><div class="nmodal${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${inner}</div></div>`;
  document.body.appendChild(d);
  const ok = q('#ovOk', d); if (ok) { ok.focus(); ok.onclick = () => { d.remove(); onClose?.(); }; }
  const mp = q('#ovMap', d); if (mp) mp.onclick = () => { d.remove(); close(); };
  return d;
}
function nextOpen() { return [1, 2, 3, 4].find(n => !isDone(n)) || (!isDone(5) ? 5 : null); }
function clearStage() {
  const st = cur, f = M[key(st)].frag;
  A.save({[`night/done/${key(st)}`]: A.SERVER_TIME}); H.checkComplete?.();
  const nx = nextOpen();
  overlay(`<div class="eyebrow">LOCK ${st + 3} RESTORED</div><p>재가동 명령어 조각을 확보했습니다.</p><div class="big-frag">${esc(f)}</div>` +
    `<p class="mono" style="color:var(--amber)">LOCK ${st + 3} 조각</p>` +
    `<p class="dim" style="font-size:14px">연구원 수첩 1쪽 '명령어 조각 수집판'의 LOCK ${st + 3} 칸에 적어 두세요. 조각의 순서는 마지막에 직접 알아내야 해요.</p>` +
    (nx ? `<div class="hint-box" style="text-align:center"><b>태블릿을 넘기세요</b><br>다음 LOCK ${nx + 3} 담당: <b>${esc(holderName(nx))}</b><br><small>밤의 온실에서 색이 다른 신호를 찾아 LOCK ${nx + 3}을 여세요</small></div>` : '') +
    `<button class="btn" id="ovMap" style="justify-self:center">${nx ? '태블릿을 넘겼어요 · 밤의 온실로' : '밤의 온실로'}</button>`);
}
function bindHint() {
  const b = q('#hintBtn'); if (!b) return;
  b.onclick = () => {
    const k = key(cur), used = hintsOf(cur), list = HINTS[k] || [];
    let shown = ''; for (let i = 0; i < used && i < list.length; i++) shown += `<div class="hint-box"><b>힌트 ${i + 1}</b><br>${esc(list[i])}</div>`;
    const more = used < list.length;
    const d = overlay('<h3>힌트 상자</h3>' + (shown || '<p class="dim">아직 연 힌트가 없어요.</p>') +
      (more ? `<p class="dim" style="font-size:14px">새 힌트를 열면 연구 점수가 ${N.certificate.score.hint}점 줄어요. 팀장이 결정하세요.</p><div class="nrow" style="justify-content:center"><button class="btn nghost nsmall" id="hClose">닫기</button><button class="btn nsmall" id="hOpen">힌트 ${used + 1} 열기</button></div>`
        : '<p class="dim" style="font-size:14px">이 LOCK의 힌트를 모두 열었어요.</p><button class="btn nghost nsmall" id="hClose">닫기</button>'));
    q('#hClose', d).onclick = () => d.remove();
    if (more) q('#hOpen', d).onclick = () => { A.save({[`night/hints/${k}`]: used + 1}); d.remove(); const c = q('#nmCount'); if (c) c.textContent = `오답 ${wrongs()}회 · 힌트 ${totalHints()}회`; b.click(); };
  };
}

/* 다이얼 자물쇠 */
function dialHTML(n, id) {
  let d = ''; for (let i = 0; i < n; i++) d += `<div class="dial" data-i="${i}"><button type="button" class="up" aria-label="${i + 1}번째 자리 올리기">▲</button><div class="d" tabindex="0" role="spinbutton" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0" aria-label="${i + 1}번째 자리">0</div><button type="button" class="dn" aria-label="${i + 1}번째 자리 내리기">▼</button></div>`;
  return `<div class="dial-box"><div class="dials" id="${id}">${d}</div>` +
    `<label class="check"><input type="checkbox" id="${id}-chk"> <span>${esc(N.inspector)}</span></label>` +
    `<button class="btn" id="${id}-go">코드 락 해제</button><p class="nfb" id="${id}-fb"></p></div>`;
}
function bindDial(id, m, onOk) {
  const box = document.getElementById(id); if (!box) return;
  qa('.dial', box).forEach(dl => {
    const dEl = q('.d', dl); let v = 0, y0 = null;
    const set = n => { v = (n + 10) % 10; dEl.textContent = v; dEl.setAttribute('aria-valuenow', v); };
    q('.up', dl).onclick = () => set(v + 1);
    q('.dn', dl).onclick = () => set(v - 1);
    dEl.addEventListener('keydown', e => { if (e.key === 'ArrowUp') { set(v + 1); e.preventDefault(); } if (e.key === 'ArrowDown') { set(v - 1); e.preventDefault(); } if (/^[0-9]$/.test(e.key)) set(+e.key); });
    dEl.addEventListener('wheel', e => { e.preventDefault(); set(v + (e.deltaY < 0 ? 1 : -1)); }, {passive: false});
    dEl.addEventListener('pointerdown', e => { y0 = e.clientY; dEl.setPointerCapture(e.pointerId); });
    dEl.addEventListener('pointermove', e => { if (y0 === null) return; const dy = e.clientY - y0; if (Math.abs(dy) > 22) { set(v + (dy < 0 ? 1 : -1)); y0 = e.clientY; } });
    dEl.addEventListener('pointerup', () => { y0 = null; });
  });
  document.getElementById(id + '-go').onclick = () => {
    const code = qa('.d', box).map(x => x.textContent).join(''), chk = document.getElementById(id + '-chk');
    if (!chk.checked) { setFb(id + '-fb', N.inspectorMissing); return; }
    if (code === m.answer) { SFX.next = 'pass'; setFb(id + '-fb', '승인 완료. 코드 락이 해제되었습니다.', true); onOk(); }
    else { wrong(box); setFb(id + '-fb', m.wrongs?.[code] || '코드 불일치. 연구원 수첩의 풀이를 다시 확인하고 검사원이 재승인하세요.'); chk.checked = false; }
  };
}

/* 영상 칸 · 영상이 없으면 대체 애니메이션 */
function protocolArt() {
  /* 10초 장면: 경보 중인 바이오 트윈 홀로그램 → 진짜 프로토콜 아이콘 6개가 하나씩 날아와 스며듦 → 혈당 그래프가 잔잔해지고 빨간 경보가 초록으로 */
  const G = '#7fe0a8', R = '#ff6b6b', P = '#ff8fc2';
  const ICONS = [
    {k: '물·흰우유', d: '<path d="M-9 -13 L9 -13 L7 13 L-7 13 Z"/><path d="M-8 -1 L8 -1" opacity=".7"/><rect x="-4" y="3" width="6" height="6" rx="1.5" opacity=".8"/>'},
    {k: '채소 먼저', d: '<path d="M0 13 C-15 3 -11 -12 0 -14 C11 -12 15 3 0 13 Z"/><path d="M0 13 L0 -9 M0 0 L-6 -5 M0 5 L6 -1"/>'},
    {k: '현미·잡곡', d: '<path d="M-14 -1 L14 -1 A14 13 0 0 1 -14 -1 Z"/><circle cx="-6" cy="-7" r="2.2"/><circle cx="0" cy="-9" r="2.2"/><circle cx="6" cy="-7" r="2.2"/><path d="M-9 12 L9 12"/>'},
    {k: '식후 걷기', d: '<ellipse cx="-6" cy="4" rx="4.5" ry="7.5"/><ellipse cx="6" cy="-5" rx="4.5" ry="7.5"/><circle cx="-6" cy="-6.5" r="1.4"/><circle cx="6" cy="-15.5" r="1.4"/>'},
    {k: '원물 간식', d: '<path d="M0 -6 C-14 -14 -16 10 -2 13 C-1 12 1 12 2 13 C16 10 14 -14 0 -6 Z"/><path d="M0 -6 L1 -13 M1 -11 C5 -15 9 -13 9 -11"/>'},
    {k: '영양정보 확인', d: '<rect x="-13" y="-13" width="17" height="22" rx="2"/><path d="M-10 -7 L0 -7 M-10 -2 L-2 -2"/><circle cx="4" cy="3" r="7"/><path d="M9 8 L14 13"/>'}
  ];
  const HX = 170, HY = 178, T0 = 1.0, STEP = 1.0, FLY = 0.9;
  const arr = i => T0 + i * STEP + FLY, END = arr(5) + 0.4;
  const JAG = [0, 46, 88, 24, 96, -34, 70, -44, 52, 6, -10], NN = JAG.length;
  const line = k => { const a = 1 - k / 6; let s = ''; for (let i = 0; i < NN; i++) { const x = 392 + i * 21, y = 190 - (a * 0.8 * JAG[i] + (1 - a) * 12 * Math.sin(i * 0.95)); s += (i ? ' L' : 'M') + x + ' ' + y.toFixed(1); } return s; };
  const vals = [line(0)], kt = [0];
  for (let k = 1; k <= 6; k++) { vals.push(line(k - 1)); kt.push(arr(k - 1)); vals.push(line(k)); kt.push(arr(k - 1) + 0.45); }
  vals.push(line(6)); kt.push(9.9);
  const DUR = 9.9, ktStr = kt.map(t => (t / DUR).toFixed(4)).join(';');
  const body = 'M150 124 Q170 117 190 124 L211 136 Q220 142 218 162 L211 214 L199 212 L203 166 L196 160 L195 232 L191 300 L177 300 L173 240 L167 240 L163 300 L149 300 L145 232 L144 160 L137 166 L141 212 L129 214 L122 162 Q120 142 129 136 Z';
  let s = '<svg viewBox="0 0 640 360" font-family="Pretendard, Noto Sans KR, sans-serif">' +
    '<defs><linearGradient id="pbody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff" stop-opacity=".55"/><stop offset="1" stop-color="#7ab8ff" stop-opacity=".15"/></linearGradient>' +
    '<radialGradient id="pglow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    '<filter id="pblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter></defs>' +
    '<rect width="640" height="360" fill="#060b1a"/>' +
    '<g stroke="rgba(127,224,168,.07)">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<line x1="${i * 80}" y1="0" x2="${i * 80}" y2="360"/>`).join('') + [0, 1, 2, 3, 4].map(i => `<line x1="0" y1="${i * 80 + 20}" x2="640" y2="${i * 80 + 20}"/>`).join('') + '</g>' +
    `<ellipse cx="${HX}" cy="190" rx="78" ry="120" fill="${R}" opacity=".35" filter="url(#pblur)"><animate attributeName="fill" from="${R}" to="${G}" begin="${END}s" dur="0.8s" fill="freeze"/><animate attributeName="opacity" values=".2;.45;.2" dur="1.6s" repeatCount="indefinite"/></ellipse>` +
    `<ellipse cx="${HX}" cy="306" rx="64" ry="11" fill="none" stroke="#7ab8ff" stroke-opacity=".6" stroke-width="2"/><ellipse cx="${HX}" cy="306" rx="40" ry="6" fill="#7ab8ff" opacity=".25"/>` +
    `<g><circle cx="${HX}" cy="96" r="21" fill="url(#pbody)" stroke="#cfeeff" stroke-opacity=".8" stroke-width="1.5"/>` +
    `<path d="${body}" fill="url(#pbody)" stroke="#cfeeff" stroke-opacity=".8" stroke-width="1.5"/>` +
    '<rect x="118" y="74" width="104" height="2" fill="#cfeeff" opacity=".55"><animate attributeName="y" values="74;300;74" dur="3.2s" repeatCount="indefinite"/></rect>' +
    `<circle cx="${HX}" cy="${HY}" r="15" fill="${R}" opacity=".75"><animate attributeName="r" values="12;18;12" dur="0.9s" repeatCount="indefinite"/><animate attributeName="fill" from="${R}" to="${G}" begin="${END}s" dur="0.8s" fill="freeze"/></circle></g>` +
    '<rect x="376" y="58" width="244" height="214" rx="12" fill="rgba(20,28,56,.85)" stroke="#39436f" stroke-width="1.5"/>' +
    '<text x="392" y="84" fill="#a9b0d6" font-size="13" font-family="monospace" letter-spacing="1">BIO-TWIN #0214</text><text x="392" y="102" fill="#6f78a8" font-size="11" font-family="monospace">GLUCOSE mg/dL</text>' +
    '<g stroke="rgba(238,240,255,.08)">' + [110, 150, 190, 230].map(y => `<line x1="392" x2="604" y1="${y}" y2="${y}"/>`).join('') + '</g>' +
    `<path fill="none" stroke="${P}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" d="${vals[0]}"><animate attributeName="d" dur="${DUR}s" fill="freeze" keyTimes="${ktStr}" values="${vals.join(';')}"/><animate attributeName="stroke" from="${P}" to="${G}" begin="${END}s" dur="0.8s" fill="freeze"/></path>` +
    `<g><rect x="520" y="70" width="88" height="24" rx="6" fill="${R}"><animate attributeName="opacity" values="1;.35;1" dur="0.8s" repeatCount="indefinite"/><set attributeName="visibility" to="hidden" begin="${END}s"/></rect><text x="564" y="87" fill="#fff" font-size="13" text-anchor="middle" font-family="monospace">ALERT<set attributeName="visibility" to="hidden" begin="${END}s"/></text></g>` +
    `<g visibility="hidden"><set attributeName="visibility" to="visible" begin="${END}s"/><rect x="514" y="70" width="94" height="24" rx="6" fill="${G}"/><text x="561" y="87" fill="#06221a" font-size="13" text-anchor="middle" font-family="monospace" font-weight="700">STABLE ✓</text></g>` +
    `<text x="392" y="260" fill="#a9b0d6" font-size="13">혈당 경보 <tspan fill="${R}">발령 중<set attributeName="visibility" to="hidden" begin="${END}s"/></tspan></text>` +
    `<text x="452" y="260" fill="${G}" font-size="13" visibility="hidden"><set attributeName="visibility" to="visible" begin="${END}s"/>해제 · 안정 범위</text>` +
    [[22, 22], [618, 22], [612, 288], [384, 288]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${R}"><animate attributeName="opacity" values="1;.2;1" dur="0.8s" repeatCount="${Math.floor(END / 0.8)}"/><animate attributeName="fill" from="${R}" to="${G}" begin="${END}s" dur="0.5s" fill="freeze"/></circle>`).join('') +
    '<text x="40" y="34" fill="#a9b0d6" font-size="12" font-family="monospace" letter-spacing="2">PROTOCOL INSTALL</text>' +
    '<rect x="40" y="42" width="220" height="8" rx="4" fill="rgba(255,255,255,.08)"/>' +
    `<rect x="40" y="42" width="0" height="8" rx="4" fill="${G}">` + [0, 1, 2, 3, 4, 5].map(i => `<animate attributeName="width" to="${((i + 1) * 220 / 6).toFixed(1)}" begin="${arr(i)}s" dur="0.35s" fill="freeze"/>`).join('') + '</rect>' +
    [0, 1, 2, 3, 4, 5, 6].map(i => { const on = i === 0 ? '' : `<set attributeName="visibility" to="visible" begin="${arr(i - 1)}s"/>`, off = i === 6 ? '' : `<set attributeName="visibility" to="hidden" begin="${arr(i)}s"/>`; return `<text x="272" y="51" fill="${i === 6 ? G : '#eef0ff'}" font-size="13" font-family="monospace" visibility="${i === 0 ? 'visible' : 'hidden'}">${i} / 6${on}${off}</text>`; }).join('');
  ICONS.forEach((ic, i) => {
    const sx = 60 + i * 104, sy = 338, b = T0 + i * STEP, a = arr(i);
    s += `<g transform="translate(${sx} ${sy})"><rect x="-46" y="-22" width="92" height="34" rx="9" fill="rgba(20,28,56,.9)" stroke="#39436f"><animate attributeName="stroke" to="${G}" begin="${b}s" dur="0.2s" fill="freeze"/></rect>` +
      `<text x="0" y="-1" fill="#a9b0d6" font-size="12" text-anchor="middle">${ic.k}<animate attributeName="fill" to="${G}" begin="${a}s" dur="0.3s" fill="freeze"/></text></g>`;
    s += `<g opacity="0"><set attributeName="opacity" to="1" begin="${b}s"/><animate attributeName="opacity" to="0" begin="${a - 0.15}s" dur="0.2s" fill="freeze"/>` +
      `<animateTransform attributeName="transform" type="translate" values="${sx} ${sy - 46};${(sx + HX) / 2} ${sy - 150};${HX} ${HY}" keyTimes="0;.5;1" calcMode="spline" keySplines=".3 0 .6 1;.4 0 .7 1" begin="${b}s" dur="${FLY}s" fill="freeze"/>` +
      `<circle r="22" fill="rgba(127,224,168,.16)" stroke="${G}" stroke-width="1.5"/><g fill="none" stroke="${G}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ic.d}</g></g>`;
    s += `<circle cx="${HX}" cy="${HY}" r="10" fill="none" stroke="${G}" stroke-width="3" opacity="0"><animate attributeName="r" from="10" to="70" begin="${a}s" dur="0.8s" fill="freeze"/><animate attributeName="opacity" values="0;.9;0" begin="${a}s" dur="0.8s" fill="freeze"/></circle>`;
  });
  s += `<circle cx="${HX}" cy="180" r="100" fill="url(#pglow)" opacity="0"><animate attributeName="opacity" values="0;.18;.06;.18" keyTimes="0;.2;.6;1" begin="${END}s" dur="2.4s" repeatCount="indefinite"/></circle>`;
  return s + '</svg>';
}
function protocolSlot() {
  return '<div class="monitor"><div class="mon-head"><span><span class="led red"></span>SRV-07 · 프로토콜 서버실</span><span>REC</span></div>' +
    `<div class="scr"><div class="vfb" id="protoArt">${protocolArt()}</div></div>` +
    '<div class="vctl"><button class="btn nghost nsmall" id="protoReplay">다시 보기</button></div></div>';
}
const tubeSVG = (n, max, color) => { const hh = Math.round(50 * Math.min(1, n / max)); return `<svg class="tube" viewBox="0 0 34 64" aria-hidden="true"><rect x="7" y="2" width="20" height="58" rx="10" fill="rgba(255,255,255,.05)" stroke="#a9b0d6" stroke-width="1.5"/><rect x="9" y="${58 - hh}" width="16" height="${hh}" rx="7" fill="${color}" opacity=".85"/><rect x="4" y="1" width="26" height="4" rx="2" fill="#a9b0d6"/></svg>`; };

/* ═════ LOCK 4. 당 화물 분류기 ═════ */
function renderS1() {
  const m = M.cargo, cp = m.checkpoint, placed = mem.s1;
  const pool = cp.items.filter(s => !placed[s.id]).map(s => `<button class="card" data-id="${s.id}" draggable="true"><span class="mono" style="color:var(--amber)">${s.no}</span> ${esc(s.name)}<small>${esc(s.sub)}</small></button>`).join('');
  const tanks = cp.tanks.map(t => { const ins = cp.items.filter(s => placed[s.id] === t.id); return `<div class="tank" data-tank="${t.id}" role="button" tabindex="0" aria-label="${esc(t.name)} 탱크">${tubeSVG(ins.length, t.max, t.color)}<span class="tank-name">${esc(t.name)}</span><span class="tank-sub">${esc(t.sub)}</span>${ins.map(s => `<button class="card" data-id="${s.id}" data-back="1">${esc(s.name)}</button>`).join('')}</div>`; }).join('');
  h(stageShell(1, m.title, m.speech,
    partA(m.partA,
      '<div class="hint-box" style="font-size:14px"><b>분류 단서 · 당을 구슬이라고 생각해 보세요</b><br><span class="mono">●</span> 단당류: 더 이상 쪼개지지 않는 가장 작은 당<br><span class="mono">●–●</span> 이당류: 단당류 2개가 손잡은 당 (설명에 \'+\'가 있으면 힌트!)<br><span class="mono">●–●–●–●…</span> 다당류: 포도당 수백 개 이상이 이어진 당, 거의 달지 않음<br><span class="mono">✕</span> 당류 아님: 당이 아닌데 단맛만 내는 첨가물</div>' +
      '<p class="dim" style="font-size:14.5px">카드를 누른 뒤 탱크를 누르세요. (컴퓨터에서는 끌어다 놓아도 돼요) 탱크 속 카드를 누르면 다시 빠져요.</p>' +
      `<div class="cards" id="pool">${pool || '<span class="dim">모든 카드를 넣었어요. 판정해 보세요!</span>'}</div>` +
      `<div class="tanks">${tanks}</div>` +
      `<div class="nrow" style="justify-content:flex-end"><button class="btn leaf" id="judge1"${sub(1) ? ' disabled' : ''}>분류 판정</button></div><p class="nfb" id="fb1"></p>`) +
    partB(m.partB, `<p>${m.prompt}</p>` + dialHTML(3, 'd1')), ''));
  qa('#pool .card').forEach(c => {
    if (c.dataset.id === sel1) c.classList.add('sel');
    c.onclick = () => { qa('#pool .card').forEach(x => x.classList.remove('sel')); sel1 = c.dataset.id; c.classList.add('sel'); };
    c.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', c.dataset.id));
  });
  qa('.tank').forEach(t => {
    const drop = id => { if (!id || sub(1)) return; mem.s1[id] = t.dataset.tank; sel1 = null; renderS1(); };
    t.onclick = e => { if (sel1) { drop(sel1); return; } const bk = e.target.closest('[data-back]'); if (bk && !sub(1)) { delete mem.s1[bk.dataset.id]; renderS1(); } };
    t.addEventListener('keydown', e => { if (e.key === 'Enter') drop(sel1); });
    t.addEventListener('dragover', e => { e.preventDefault(); t.classList.add('hot'); });
    t.addEventListener('dragleave', () => t.classList.remove('hot'));
    t.addEventListener('drop', e => { e.preventDefault(); drop(e.dataTransfer.getData('text/plain')); });
  });
  q('#judge1').onclick = () => {
    const n = Object.keys(mem.s1).length;
    if (n < cp.items.length) { setFb('fb1', `아직 ${cp.items.length - n}장이 남았어요.`); return; }
    const bad = cp.items.filter(s => mem.s1[s.id] !== s.cat).length;
    if (!bad) { setFb('fb1', cp.success, true); clearA(); }
    else { wrong(q('.tanks')); setFb('fb1', fill(cp.wrong, {n: bad})); }
  };
  bindDial('d1', m, () => newsBriefing(clearStage)); bindCommon();
}
function newsBriefing(done) {
  const s = N.news;
  const clip = s.video ? `<figure class="nclip"><div class="nclip-scr"><video muted loop playsinline autoplay preload="auto">${src(s.video)}</video><span class="nclip-tag">자료 화면</span></div><figcaption>${esc(s.clipCaption)}</figcaption></figure>` : '';
  const d = overlay(`<div class="breaking">${esc(s.tag)}</div><div class="article"><h4>${esc(s.title)}</h4>${clip}${s.paragraphs.map(p => `<p>${p}</p>`).join('')}<p class="src">${esc(s.source)}</p></div>` +
    `<p class="dim" style="font-size:14px;text-align:center">${s.note}</p><button class="btn" id="ovOk" style="justify-self:center">${esc(s.done)}</button>`, done, true);
  const f = q('.nclip', d); if (!f) return;
  const v = q('video', f), ss = qa('source', v), gone = () => { f.hidden = true; };
  ss[ss.length - 1]?.addEventListener('error', gone); v.addEventListener('error', gone);
  v.play?.()?.catch?.(() => {});
  setTimeout(() => { if (v.readyState === 0 && v.networkState === 3) gone(); }, 3000);
}

/* ═════ LOCK 5. 에너지 계량 센터 ═════ */
function labelsHTML() {
  return '<div class="labels">' +
   '<div class="nl"><div class="pname">피치 아이스티 · 총 내용량 500mL</div><div class="top"><span>영양정보</span><b>총 내용량 500mL</b></div><div class="basis"><span>100mL당 40kcal</span></div>' +
   '<table><tr><td>나트륨 10mg</td><td>1%</td></tr><tr><td>탄수화물 10g</td><td>3%</td></tr><tr class="hl"><td>당류 9g</td><td>9%</td></tr><tr><td>단백질 0g</td><td>0%</td></tr></table><div class="note">1일 영양성분 기준치에 대한 비율(%)은 2,000kcal 기준</div></div>' +
   '<div class="nl"><div class="pname">초코칩 쿠키 · 30g 봉지 × 4개입</div><div class="top"><span>영양정보</span><b>총 내용량 ??? (찢어짐)</b></div><div class="basis"><span>1봉지(30g)당 150kcal</span></div>' +
   '<table><tr><td>나트륨 85mg</td><td>4%</td></tr><tr><td>탄수화물 19g</td><td>6%</td></tr><tr class="hl"><td>당류 9g</td><td>9%</td></tr><tr><td>지방 7g</td><td>13%</td></tr><tr><td>단백질 2g</td><td>4%</td></tr></table><div class="note">1일 영양성분 기준치에 대한 비율(%)은 2,000kcal 기준</div></div>' +
  '</div>';
}
function gaugeHTML() {
  const ok = sub(2);
  let ticks = ''; for (let i = 0; i <= 10; i++) { const a = (-90 + i * 18) * Math.PI / 180, x1 = 110 + 80 * Math.sin(a), y1 = 110 - 80 * Math.cos(a), x2 = 110 + 92 * Math.sin(a), y2 = 110 - 92 * Math.cos(a); ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#a9b0d6" stroke-width="2"/>`; }
  return `<div class="monitor"><div class="mon-head"><span><span class="led ${ok ? '' : 'amb'}"></span>ENERGY METER · 에너지 계량기</span><span>${ok ? 'CALIBRATED' : 'CALIBRATING…'}</span></div>` +
   `<div class="gauge"><svg viewBox="0 0 220 130" aria-hidden="true"><path d="M18 110 A92 92 0 0 1 202 110" fill="none" stroke="#28325c" stroke-width="14"/>${ticks}` +
   '<text x="22" y="128" fill="#a9b0d6" font-size="11">0</text><text x="190" y="128" fill="#a9b0d6" font-size="11">10</text><text x="110" y="14" fill="#a9b0d6" font-size="11" text-anchor="middle">5</text>' +
   `<g class="needle${ok ? '' : ' cal'}" style="${ok ? 'transform:rotate(-18deg)' : ''}"><line x1="110" y1="110" x2="110" y2="30" stroke="#ff8fc2" stroke-width="4" stroke-linecap="round"/></g><circle cx="110" cy="110" r="8" fill="#eef0ff"/></svg>` +
   `<div class="readout"><span>탄수화물 1g당 에너지</span><b>${ok ? '4 kcal' : '-- kcal'}</b><span>${ok ? '계량기 보정 완료 · 배송량 계산을 시작하세요' : 'A 단계의 기능 카드를 맞히면 계량기가 보정됩니다'}</span></div></div></div>`;
}
function renderS2() {
  const m = M.energy, cp = m.checkpoint;
  const cards = cp.items.map(f => `<button class="card${mem.s2f.includes(f.id) ? ' sel' : ''}" data-id="${f.id}" aria-pressed="${mem.s2f.includes(f.id)}">${esc(f.text)}</button>`).join('');
  h(stageShell(2, m.title, m.speech,
    partA(m.partA, `<div class="pick" id="funcs">${cards}</div><div class="nrow" style="justify-content:flex-end"><button class="btn leaf" id="judge2"${sub(2) ? ' disabled' : ''}>판정</button></div><p class="nfb" id="fb2"></p>`) +
    partB(m.partB, `<p>${m.prompt}</p>` + labelsHTML() + dialHTML(4, 'd2')),
    gaugeHTML()));
  qa('#funcs .card').forEach(c => c.onclick = () => { if (sub(2)) return; const i = mem.s2f.indexOf(c.dataset.id); if (i >= 0) mem.s2f.splice(i, 1); else mem.s2f.push(c.dataset.id); c.classList.toggle('sel'); c.setAttribute('aria-pressed', c.classList.contains('sel')); });
  q('#judge2').onclick = () => {
    const okIds = cp.items.filter(f => f.ok).map(f => f.id);
    const right = mem.s2f.length === okIds.length && okIds.every(id => mem.s2f.includes(id));
    if (right) { setFb('fb2', cp.success, true); clearA(); const g = q('.needle'); if (g) { g.classList.remove('cal'); g.style.transform = 'rotate(-18deg)'; } const rb = q('.readout b'); if (rb) rb.textContent = '4 kcal'; }
    else { wrong(q('#funcs')); setFb('fb2', mem.s2f.length !== cp.need ? fill(cp.wrongCount, {need: cp.need, n: mem.s2f.length}) : cp.wrong); }
  };
  bindDial('d2', m, clearStage); bindCommon();
}

/* ═════ LOCK 6. 바이오 트윈 진단실 ═════ */
function graphSVG() {
  const Aa = [[0, 90], [30, 180], [60, 150], [90, 100], [120, 70]], B = [[0, 90], [30, 120], [60, 130], [90, 115], [120, 95]];
  const X = t => 60 + t * 4, Y = v => 230 - (v - 50) * 1.3, path = p => p.map((d, i) => (i ? 'L' : 'M') + X(d[0]) + ' ' + Y(d[1])).join(' ');
  let grid = ''; [60, 100, 140, 180].forEach(v => { grid += `<line x1="60" x2="540" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(238,240,255,.12)"/><text x="52" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#a9b0d6">${v}</text>`; });
  let xt = ''; [0, 30, 60, 90, 120].forEach(t => { xt += `<text x="${X(t)}" y="252" text-anchor="middle" font-size="12" fill="#a9b0d6">${t}분</text>`; });
  const dots = (p, c) => p.map(d => `<circle cx="${X(d[0])}" cy="${Y(d[1])}" r="4.5" fill="${c}"/>`).join('');
  return '<svg class="graph" viewBox="0 0 580 270" role="img" aria-label="식사 후 혈당 변화 그래프: A는 30분에 180까지 치솟았다가 120분에 70으로 떨어지고, B는 130 이하로 완만하다">' +
    `<text x="60" y="22" font-size="14" fill="#eef0ff">식사 후 혈당 변화 (mg/dL)</text>${grid}${xt}` +
    `<path class="drawline" d="${path(Aa)}" fill="none" stroke="#ff8fc2" stroke-width="3"/>${dots(Aa, '#ff8fc2')}` +
    `<path class="drawline" style="animation-delay:.6s" d="${path(B)}" fill="none" stroke="#7fe0a8" stroke-width="3"/>${dots(B, '#7fe0a8')}` +
    Aa.slice(1).map(d => { const below = d[0] >= 90; return `<text x="${X(d[0]) + (d[0] === 90 ? 12 : 0)}" y="${below ? Y(d[1]) + 22 : Y(d[1]) - 10}" fill="#ff8fc2" font-size="13" font-weight="700" text-anchor="middle">${d[1]}</text>`; }).join('') +
    B.slice(1).map(d => { const up = d[0] >= 60; return `<text x="${X(d[0])}" y="${up ? Y(d[1]) - 10 : Y(d[1]) + 20}" fill="#7fe0a8" font-size="13" font-weight="700" text-anchor="middle">${d[1]}</text>`; }).join('') +
    `<g class="pulse"><rect x="${X(30) + 24}" y="${Y(180) - 14}" width="52" height="20" rx="4" fill="#ff6b6b"/><text x="${X(30) + 50}" y="${Y(180)}" fill="#fff" font-size="12" text-anchor="middle" font-family="monospace">HIGH</text></g>` +
    '<line x1="330" x2="352" y1="18" y2="18" stroke="#ff8fc2" stroke-width="3"/><text x="358" y="22" font-size="13" fill="#ff8fc2">A 콜라 + 도넛</text>' +
    '<line x1="330" x2="352" y1="38" y2="38" stroke="#7fe0a8" stroke-width="3"/><text x="358" y="42" font-size="13" fill="#7fe0a8">B 현미밥 + 달걀 + 나물</text>' +
    `<line x1="60" x2="540" y1="${Y(90)}" y2="${Y(90)}" stroke="#ffc861" stroke-dasharray="4 4"/><text x="70" y="${Y(90) + 16}" font-size="11.5" fill="#ffc861">식사 전 90</text>` +
  '</svg>';
}
function renderS3() {
  const m = M.twin, cp = m.checkpoint, g3 = mem.g3;
  const opt = (name, vals, c) => `<div class="q-opts" data-q="${name}">${vals.map(v => `<button class="card${c === v ? ' sel' : ''}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
  h(stageShell(3, m.title, m.speech,
    partA(m.partA,
      `<div class="monitor"><div class="mon-head"><span><span class="led red"></span>BIO-TWIN #0214 · CGM 연속 혈당 측정</span><span>mg/dL</span></div>${graphSVG()}<div class="vnote">${esc(cp.note)}</div></div>` +
      cp.questions.map(x => `<div class="nq"><p><b>${esc(x.q.split(' ')[0])}</b> ${esc(x.q.split(' ').slice(1).join(' '))}</p>${opt(x.id, x.opts, g3[x.id])}</div>`).join('') +
      `<div class="nrow" style="justify-content:flex-end"><button class="btn leaf" id="judge3"${sub(3) ? ' disabled' : ''}>판정</button></div><p class="nfb" id="fb3"></p>`) +
    partB(m.partB, `<p>${m.prompt}</p>` +
      `<div class="charts">${m.logs.map(l => `<div class="chart"><b>로그 ${esc(l.id)}</b><br>${esc(l.text)}</div>`).join('')}</div>` +
      `<div class="dz">${m.diagnoses.map((d, i) => `<div><span>${'①②③④⑤'[i]}</span>${esc(d)}</div>`).join('')}</div>` + dialHTML(4, 'd3')), ''));
  qa('.q-opts').forEach(g => qa('.card', g).forEach(c => c.onclick = () => { if (sub(3)) return; g3[g.dataset.q] = c.dataset.v; qa('.card', g).forEach(x => x.classList.remove('sel')); c.classList.add('sel'); }));
  q('#judge3').onclick = () => {
    if (cp.questions.some(x => !g3[x.id])) { setFb('fb3', cp.missing); return; }
    if (cp.questions.every(x => g3[x.id] === x.answer)) { setFb('fb3', cp.success, true); clearA(); }
    else { wrong(q('#partA')); setFb('fb3', cp.wrong); }
  };
  bindDial('d3', m, clearStage); bindCommon();
}

/* ═════ LOCK 7. 혈당 안정 프로토콜 ═════ */
function renderS4() {
  const m = M.protocol, cp = m.checkpoint;
  const w = cp.items.map((x, i) => { const n = i + 1, on = mem.s4.includes(n); return `<button class="card weapon${on ? ' sel' : ''}" data-n="${n}" aria-pressed="${on}"><span class="no">${String(n).padStart(2, '0')}</span>${esc(x.text)}</button>`; }).join('');
  const sets = m.sets.map(x => { const [no, ...rest] = x.split(' '); return `<div><b>${esc(no)}</b> ${esc(rest.join(' '))}</div>`; }).join('');
  h(stageShell(4, m.title, m.speech,
    partA(m.partA,
      `<div class="armory" id="armory">${w}</div><div class="install" aria-hidden="true"><i id="inst" style="width:${sub(4) ? 100 : 0}%"></i></div><div class="nrow" style="justify-content:space-between"><span class="dim" id="cnt4">설치 ${mem.s4.length} / ${cp.need}</span><button class="btn leaf" id="judge4"${sub(4) ? ' disabled' : ''}>설치 완료</button></div><p class="nfb" id="fb4"></p>`) +
    partB(m.partB, `<p>${m.prompt}</p><div class="intake">${m.intake.map(x => `<span>${esc(x)}</span>`).join('')}</div><p>${esc(m.condition)}</p><div class="menu">${sets}</div><p>${m.codeFormat}</p>` + dialHTML(4, 'd4')),
    sub(4) ? '' : protocolSlot()));
  q('#protoReplay')?.addEventListener('click', () => { const a = q('#protoArt'); if (a) a.innerHTML = protocolArt(); });
  qa('#armory .card').forEach(c => c.onclick = () => { if (sub(4)) return; const n = +c.dataset.n, i = mem.s4.indexOf(n); if (i >= 0) mem.s4.splice(i, 1); else mem.s4.push(n); c.classList.toggle('sel'); c.setAttribute('aria-pressed', c.classList.contains('sel')); q('#cnt4').textContent = `설치 ${mem.s4.length} / ${cp.need}`; });
  q('#judge4').onclick = () => {
    const real = cp.items.map((x, i) => x.ok ? i + 1 : 0).filter(Boolean);
    const hit = mem.s4.filter(n => real.includes(n)).length, fake = mem.s4.length - hit;
    if (hit === cp.need && !fake) { const ib = q('#inst'); if (ib) ib.style.width = '100%'; setFb('fb4', cp.success, true); setTimeout(clearA, 900); }
    else { wrong(q('#armory')); setFb('fb4', fill(cp.wrong, {hit, fake})); }
  };
  bindDial('d4', m, clearStage); bindCommon();
}

/* ═════ LOCK 8. 내일 아침 운영 계획 + 재가동 명령어 ═════ */
function termHTML() {
  const ok = sub(5);
  const lines = ['<span class="wa">[05:30] BIO-TWIN #0214 상태 점검 시작</span>',
    ...[1, 2, 3, 4].map(n => isDone(n) ? `[OK] LOCK ${n + 3} ${esc(M[key(n)].title)} · 복구` : `<span class="er">[ERR] LOCK ${n + 3} ${esc(M[key(n)].title)} · 미복구</span>`),
    ok ? '[OK] 운영 계획 승인 · 연구소장' : '<span class="er">[WAIT] 내일 아침 운영 계획 미승인 · 재가동 잠김</span>',
    ok ? '<span class="wa">[READY] 재가동 명령어 입력 대기</span>' : ''];
  return `<div class="monitor"><div class="mon-head"><span><span class="led ${ok ? '' : 'amb'}"></span>REBOOT CONSOLE</span><span>06:00까지 ${ok ? '준비 완료' : '대기'}</span></div><div class="term">${lines.filter(Boolean).join('<br>')}</div></div>`;
}
function renderS5() {
  const m = M.plan, cp = m.checkpoint;
  if (!mem.pledges.length) {
    const saved = Object.values(Z().pledges || {}).filter(Boolean);
    if (saved.length) mem.pledges = saved.map(p => ({who: p.who || '', when: p.when || '', what: p.what || '', much: p.much || ''}));
    else { const p = people(); mem.pledges = Array.from({length: Math.max(cp.min, Math.min(cp.max, p.length))}, (_, i) => ({who: p[i] || '', when: '', what: '', much: ''})); }
  }
  const rows = mem.pledges.map((p, i) => `<div class="pledge" data-i="${i}">` +
    `<input class="input who" placeholder="이름" value="${esc(p.who)}" data-k="who" aria-label="이름" maxlength="10">` +
    `<input class="input" placeholder="${esc(cp.placeholders.when)}" value="${esc(p.when)}" data-k="when" aria-label="언제">` +
    `<input class="input" placeholder="${esc(cp.placeholders.what)}" value="${esc(p.what)}" data-k="what" aria-label="무엇을">` +
    `<input class="input" placeholder="${esc(cp.placeholders.much)}" value="${esc(p.much)}" data-k="much" aria-label="얼마나"></div>`).join('');
  const tiles = [1, 2, 3, 4, 5].map(st => { const used = mem.spell.includes(st); return `<button class="tile${used ? ' used' : ''}" data-st="${st}"${used ? ' disabled' : ''}><small>L${st + 3}</small>${esc(M[key(st)].frag)}</button>`; }).join('');
  let slots = ''; for (let i = 0; i < 5; i++) { const st = mem.spell[i]; slots += `<div class="slot">${st ? esc(M[key(st)].frag) : ''}</div>`; }
  h(stageShell(5, m.title, m.speech,
    partA(m.partA,
      `<div class="pledges" id="pledges">${rows}</div>` +
      `<div class="nrow" style="justify-content:space-between">${mem.pledges.length < cp.max ? '<button class="btn nghost nsmall" id="addP">+ 한 줄 추가</button>' : '<span></span>'}<button class="btn leaf" id="judge5"${sub(5) ? ' disabled' : ''}>서약 제출 · 연구소장 승인 요청</button></div>` +
      '<p class="nfb" id="fb5"></p>') +
    partB(m.partB,
      `<p class="nsmall">${m.prompt}</p>` +
      `<div class="order-tiles" id="tiles">${tiles}</div><div class="spell" id="spell">${slots}</div>` +
      `<div class="nrow" style="justify-content:center"><button class="btn nghost nsmall" id="resetSpell">다시 놓기</button><button class="btn" id="cast"${mem.spell.length < 5 ? ' disabled' : ''}>시스템 재가동!</button></div>` +
      '<p class="nfb" id="fb6" style="text-align:center"></p>'),
    termHTML()));
  qa('#pledges input').forEach(inp => inp.oninput = () => { const i = +inp.parentNode.dataset.i; mem.pledges[i][inp.dataset.k] = inp.value; });
  q('#addP')?.addEventListener('click', () => { if (mem.pledges.length < cp.max) { mem.pledges.push({who: '', when: '', what: '', much: ''}); renderS5(); } });
  q('#judge5').onclick = () => {
    const good = mem.pledges.filter(p => p.who.trim() && p.when.trim().length >= 2 && p.what.trim().length >= 4 && p.much.trim().length >= 2);
    if (good.length < cp.min) { setFb('fb5', fill(cp.tooFew, {n: good.length})); return; }
    if (good.some(p => /^(당|설탕)?\s*(줄이기|안\s*먹기|줄인다)$/.test(p.what.trim()))) { setFb('fb5', cp.vague); return; }
    A.save({'night/pledges': pledgeRec(), 'night/approvalRequested': A.SERVER_TIME});   // 서약이 교사용 대시보드로 가요
    openApprovalPad();
  };
  if (!sub(5) && Z().approvedAt) setTimeout(approveSuccess, 50);
  else if (!sub(5) && Z().approvalRequested) setTimeout(openApprovalPad, 50);
  q('#resetSpell').onclick = () => { mem.spell = []; renderS5(); };
  qa('#tiles .tile').forEach(t => t.onclick = () => { if (!sub(5)) return; const st = +t.dataset.st; if (!mem.spell.includes(st) && mem.spell.length < 5) { mem.spell.push(st); renderS5(); } });
  q('#cast').onclick = () => {
    const word = mem.spell.map(st => M[key(st)].frag).join('');
    if (word === m.answer) { sfxPlay('pass'); A.save({'night/done/plan': A.SERVER_TIME}); mem.spell = []; phase = 'warmth'; bgmSync(); renderWarmth(); }
    else { wrong(q('#spell')); setFb('fb6', m.wrongs?.[word] || fill(m.wrong, {word})); mem.spell = []; setTimeout(() => { if (L && phase === 'stage' && cur === 5) renderS5(); }, 1200); }
  };
  bindCommon();
}
/* 연구소장 승인 패드 — 원래 나이트 미션과 같아요
   ① 서약을 내면 교사용 대시보드에 서약이 뜨고, 선생님이 대시보드에서 [승인]을 누르면 이 패드가 저절로 열려요.
   ② '선생님이 이 태블릿에서 직접 승인'을 누르면 선생님이 밤 구역 관리코드를 눌러 승인해요(서버가 확인). */
const PIN_LEN = 4;
let pad = null;
function pledgeRec() { const pl = {}; mem.pledges.filter(p => p.who.trim() || p.what.trim()).forEach((p, i) => { pl[i] = {who: p.who.trim(), when: p.when.trim(), what: p.what.trim(), much: p.much.trim()}; }); return pl; }
function openApprovalPad() {
  if (pad && document.body.contains(pad.el)) return;
  const dots = '<i></i>'.repeat(PIN_LEN);
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'clr', 0, 'del'].map(k => k === 'clr' ? '<button class="pk fn" data-k="clr" aria-label="모두 지우기">C</button>' : k === 'del' ? '<button class="pk fn" data-k="del" aria-label="한 칸 지우기">⌫</button>' : `<button class="pk" data-k="${k}">${k}</button>`).join('');
  const d = overlay('<div class="pinpad"><div class="eyebrow">DIRECTOR APPROVAL</div><h3>연구소장 승인</h3>' +
    `<p class="dim" style="font-size:14px">${M.plan.checkpoint.approval}</p>` +
    `<div class="pdots" id="pdots">${dots}</div><p class="nfb" id="fbPin" style="text-align:center"><span class="blinkw">● 연구소장 승인 대기 중…</span></p><div class="pkeys" id="pkeys">${keys}</div>` +
    '<div class="nrow" style="justify-content:center"><button class="btn nghost nsmall" id="padLocal">선생님이 이 태블릿에서 직접 승인</button><button class="btn nghost nsmall" id="pinX">닫기</button></div></div>');
  const ov = q('.noverlay', d); ov.classList.add('waiting');
  let val = '', busy = false;
  const dotEls = qa('#pdots i', d), paint = () => dotEls.forEach((e, i) => e.classList.toggle('on', i < val.length));
  const fbp = (msg, good) => { const f = q('#fbPin', d); f.textContent = msg; f.className = 'nfb ' + (good ? 'good' : 'bad'); };
  const finish = () => { done(); approveSuccess(); };
  async function check() {
    busy = true; fbp('확인 중…');
    const r = await A.checkCode('night', val);
    if (r === 'ok') { dotEls.forEach(e => e.classList.add('ok')); fbp('승인되었습니다', true); sfxPlay('correct'); setTimeout(finish, 600); return; }
    const pd = q('#pdots', d); pd.classList.remove('shake'); void pd.offsetWidth; pd.classList.add('shake'); sfxPlay('wrong');
    fbp(r === 'server' ? '승인 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.' : M.plan.checkpoint.approvalWrong);
    setTimeout(() => { val = ''; paint(); busy = false; }, 450);
  }
  const press = k => { if (busy || ov.classList.contains('waiting')) return; if (k === 'clr') val = ''; else if (k === 'del') val = val.slice(0, -1); else if (val.length < PIN_LEN) val += String(k); paint(); if (val.length === PIN_LEN) check(); };
  qa('.pk', d).forEach(b => b.onclick = () => press(b.dataset.k));
  const onKey = e => { if (!document.body.contains(d)) { done(); return; } if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
  document.addEventListener('keydown', onKey);
  const done = () => { document.removeEventListener('keydown', onKey); d.remove(); pad = null; };
  q('#pinX', d).onclick = done;
  q('#padLocal', d).onclick = e => { ov.classList.remove('waiting'); fbp('선생님이 밤 구역 관리코드를 눌러 주세요'); e.currentTarget.remove(); };
  // 대시보드 승인이 들어오면: 숫자가 저절로 채워지며 열림
  const remoteFill = () => { busy = true; ov.classList.remove('waiting'); let i = 0; const ks = qa('.pk:not(.fn)', d);
    (function step() { if (i >= PIN_LEN) { dotEls.forEach(e => e.classList.add('ok')); fbp('연구소장 승인 완료', true); sfxPlay('correct'); setTimeout(finish, 700); return; }
      const k = ks[Math.floor(Math.random() * ks.length)]; k.classList.add('flash'); setTimeout(() => k.classList.remove('flash'), 260);
      dotEls[i].classList.add('on'); i++; setTimeout(step, 380); })(); };
  pad = {el: d, remoteFill, filling: false};
}
function watchApproval() {   // 0.5초마다 (updTimer)
  if (!pad || pad.filling || !Z().approvedAt || sub(5)) return;
  pad.filling = true; pad.remoteFill();
}
function approveSuccess() {
  if (sub(5)) return;
  if (pad) { pad.el.remove(); pad = null; }
  A.save({'night/pledges': pledgeRec(), 'night/checkpoint/plan': A.SERVER_TIME});
  renderS5(); SFX.next = 'pass'; setFb('fb5', `연구소장 승인 완료! 마지막 조각 ⑤ '${M.plan.frag}'를 확보했습니다.`, true);
  q('#partB')?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

/* ═════ 보너스 게임: 모두의 온기 (동시 터치) ═════ */
let warmRaf = null, warmS = null;
function warmSfx() {
  let a = sfxCtx(), hum = null, sparkT = 0, alive = true;
  const build = () => {
    if (hum || !a) return;
    const out = a.createGain(); out.gain.value = 0; out.connect(a.destination);
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 6; lp.connect(out);
    const o1 = a.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 110;
    const o2 = a.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 110.8;
    const o3 = a.createOscillator(); o3.type = 'sine'; o3.frequency.value = 55;
    const g3 = a.createGain(); g3.gain.value = 0.6;
    o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(out);
    const trem = a.createOscillator(); trem.frequency.value = 6; const tg = a.createGain(); tg.gain.value = 0; trem.connect(tg); tg.connect(out.gain);
    [o1, o2, o3, trem].forEach(o => o.start());
    hum = {out, lp, o1, o2, o3, trem, tg};
  };
  const blip = (f, vol, dur, type) => {
    if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  const kill = (hh, ms) => setTimeout(() => { try { [hh.o1, hh.o2, hh.o3, hh.trem].forEach(o => o.stop()); } catch { /* 무시 */ } }, ms);
  return {
    touch() { a = a || sfxCtx(); if (!a) return; build(); blip(520, 0.12, 0.12); blip(780, 0.06, 0.16); },
    update(charge, active) {
      if (!a || !alive) return; build(); if (!hum) return; const t = a.currentTime;
      const f = 110 + charge * charge * 770;
      hum.o1.frequency.setTargetAtTime(f, t, 0.05); hum.o2.frequency.setTargetAtTime(f * 1.007, t, 0.05); hum.o3.frequency.setTargetAtTime(f / 2, t, 0.05);
      hum.lp.frequency.setTargetAtTime(380 + charge * 3600, t, 0.06);
      hum.out.gain.setTargetAtTime(active ? (0.035 + charge * 0.11) : (charge > 0.02 ? charge * 0.05 : 0), t, active ? 0.08 : 0.25);
      hum.trem.frequency.setTargetAtTime(5 + charge * 14, t, 0.1); hum.tg.gain.setTargetAtTime(active ? 0.012 + charge * 0.03 : 0, t, 0.1);
      if (active && charge > 0.05 && t > sparkT) { blip(900 + Math.random() * 1500 + charge * 900, 0.018 + charge * 0.03, 0.09, 'triangle'); sparkT = t + 0.2 - charge * 0.14; }
    },
    ignite() {
      if (!a) return; const t = a.currentTime;
      if (hum) { hum.out.gain.setTargetAtTime(0, t, 0.12); kill(hum, 1500); hum = null; }
      const n = a.createBuffer(1, a.sampleRate * 1.2, a.sampleRate), dd = n.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
      const s = a.createBufferSource(); s.buffer = n; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(5000, t + 0.9);
      const ng = a.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.22, t + 0.35); ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
      s.connect(bp); bp.connect(ng); ng.connect(a.destination); s.start(t);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f;
        const s0 = t + 0.55 + k * 0.07; g.gain.setValueAtTime(0.0001, s0); g.gain.exponentialRampToValueAtTime(0.11, s0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s0 + 2.6);
        o.connect(g); g.connect(a.destination); o.start(s0); o.stop(s0 + 2.7); });
    },
    stop() { alive = false; if (hum && a) { hum.out.gain.setTargetAtTime(0, a.currentTime, 0.1); kill(hum, 800); hum = null; } }
  };
}
function renderWarmth() {
  const G = N.games.warmth, ppl = people();
  const NN = Math.max(G.minPads, Math.min(G.maxPads, ppl.length || 3)); while (ppl.length < NN) ppl.push('연구원 ' + (ppl.length + 1));
  let pads = ''; for (let i = 0; i < NN; i++) { const ang = -90 + i * 360 / NN, rad = ang * Math.PI / 180, x = 50 + 37 * Math.cos(rad), y = 48 + 37 * Math.sin(rad);
    pads += `<div class="wpad" data-i="${i}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"><div class="wring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="wr-bg" cx="50" cy="50" r="44"/><circle class="wr-fg" cx="50" cy="50" r="44"/>` +
      `<path d="M50 24c-12 0-20 9-20 21v10M50 32c-7 0-12 5-12 13v14M50 40c-3 0-5 2-5 5v20M50 32c7 0 12 5 12 13v8M50 24c12 0 20 9 20 21v4M55 45v12c0 6-2 10-5 14" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg></div><span>${esc(ppl[i])}</span></div>`; }
  const subTxt = seq => seq ? `한 명씩 자기 패드를 <b>${G.seqSec}초</b> 동안 눌러 온기를 채우세요. 다 채우면 코어가 점화됩니다.` : `연구원 ${NN}명이 <b>동시에</b> 손가락을 패드에 올리고 <b>${G.holdSec}초</b> 동안 떼지 마세요.`;
  phase = 'warmth';
  h('<div class="warm-night" id="wNight"></div><div class="warm-day" id="wDay"><div class="warm-sun"></div></div>' +
    '<div class="nm-warmtop"><button type="button" class="btn nghost nsmall" id="nmBack">← 밤의 온실</button></div>' +
    `<div class="warm" id="warm"><div class="eyebrow">05:58 · FINAL SEQUENCE · 보너스 게임</div><h2 id="wTitle">모두의 온기를 모아 주세요</h2>` +
    `<p class="dim" id="wSub">바이오 랩 코어가 식어 있어요. ${subTxt(false)}</p>` +
    `<div class="wstage" id="wstage"><canvas id="wcv"></canvas><div class="core" id="core"><div class="core-in"></div><span id="corePct">0%</span></div>${pads}</div>` +
    `<div class="wgauge"><i id="wg"></i></div><p class="mono" id="wcount" style="text-align:center;color:var(--amber)">0 / ${NN} 연결</p>` +
    '<button class="linkish" id="seqBtn">여러 손가락 터치가 안 되나요? 한 명씩 채우기</button></div>');
  q('#nmBack').onclick = () => close();
  const stage = q('#wstage'), cv = q('#wcv'), ctx = cv.getContext('2d'), padEls = qa('.wpad'), core = q('#core');
  warmS?.stop(); const sfx = warmS = warmSfx();
  let active = padEls.map(() => null), fl = padEls.map(() => 0), seq = false, charge = 0, done = false, parts = [], last = performance.now();
  const size = () => { const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); window.addEventListener('resize', size);
  stage.addEventListener('contextmenu', e => e.preventDefault());
  padEls.forEach((pd, i) => {
    pd.addEventListener('pointerdown', e => { e.preventDefault(); if (done) return; active[i] = e.pointerId; try { pd.setPointerCapture(e.pointerId); } catch { /* 무시 */ } pd.classList.add('on'); sfx.touch(); });
    const up = e => { if (active[i] === e.pointerId) { active[i] = null; pd.classList.remove('on'); } };
    pd.addEventListener('pointerup', up); pd.addEventListener('pointercancel', up); pd.addEventListener('lostpointercapture', up);
  });
  q('#seqBtn').onclick = () => { seq = !seq; q('#seqBtn').textContent = seq ? '다 함께 동시에 누르기로 돌아가기' : '여러 손가락 터치가 안 되나요? 한 명씩 채우기'; q('#wSub').innerHTML = subTxt(seq); fl = fl.map(() => 0); charge = 0; };
  const center = el => { const a = el.getBoundingClientRect(), b = stage.getBoundingClientRect(); return {x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2}; };
  function loop(t) {
    if (!document.body.contains(stage)) { window.removeEventListener('resize', size); sfx.stop(); return; }
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    const on = active.map(a => a !== null), n = on.filter(Boolean).length;
    if (seq) { on.forEach((o, i) => { if (o) fl[i] = Math.min(1, fl[i] + dt / G.seqSec); }); charge = fl.reduce((a, b) => a + b, 0) / fl.length; }
    else { if (n === padEls.length) charge = Math.min(1, charge + dt / G.holdSec); else charge = Math.max(0, charge - dt / 1.2); fl = on.map(o => o ? Math.max(charge, 0.15) : 0); }
    padEls.forEach((pd, i) => { pd.style.setProperty('--heat', (seq ? fl[i] : (on[i] ? 1 : 0)).toFixed(3)); q('.wr-fg', pd).style.strokeDashoffset = (276 * (1 - (seq ? fl[i] : (on[i] ? charge : 0)))).toFixed(1);
      if (on[i] || (seq && fl[i] >= 1)) { const c = center(pd), k = center(core); if (Math.random() < 0.6) parts.push({x: c.x + (Math.random() - 0.5) * 30, y: c.y + (Math.random() - 0.5) * 30, tx: k.x, ty: k.y, t: 0, s: 2 + Math.random() * 3, h: 20 + Math.random() * 30}); } });
    q('#wcount').textContent = (seq ? fl.filter(f => f >= 1).length : n) + ' / ' + padEls.length + (seq ? ' 완료' : ' 연결');
    q('#wg').style.width = (charge * 100).toFixed(1) + '%'; q('#corePct').textContent = Math.round(charge * 100) + '%';
    core.style.setProperty('--c', charge.toFixed(3));
    if (!done) sfx.update(charge, seq ? on.some(Boolean) : n > 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => { p.t += dt * 1.1; return p.t < 1; });
    parts.forEach(p => { const e = p.t * p.t * (3 - 2 * p.t), x = p.x + (p.tx - p.x) * e, y = p.y + (p.ty - p.y) * e - Math.sin(p.t * Math.PI) * 30;
      ctx.beginPath(); ctx.fillStyle = `hsla(${p.h},100%,${60 + 20 * p.t}%,${1 - p.t * 0.6})`; ctx.shadowColor = 'rgba(255,170,80,.9)'; ctx.shadowBlur = 12; ctx.arc(x, y, p.s * (1 - p.t * 0.4), 0, 7); ctx.fill(); });
    ctx.shadowBlur = 0;
    if (charge >= 1 && !done) { done = true; ignite(); }
    warmRaf = requestAnimationFrame(loop);
  }
  cancelAnimationFrame(warmRaf); warmRaf = requestAnimationFrame(loop);
  function ignite() {
    sfx.ignite(); core.classList.add('ignite'); q('#wTitle').textContent = '코어 점화! 시스템 재가동'; q('#wSub').textContent = '모두의 온기가 바이오 랩에 전달되었습니다.';
    q('#seqBtn').hidden = true; q('.nm-warmtop').hidden = true;
    A.save({'night/bonus/warmth': A.SERVER_TIME}); H.checkComplete?.();
    const sun = q('.warm-sun'), cr = core.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
    Object.assign(sun.style, {left: cx + 'px', top: cy + 'px', bottom: 'auto', marginLeft: '-100px', marginTop: '-100px', transform: 'scale(.4)'});
    setTimeout(() => { if (!L) return; q('#wDay')?.classList.add('on'); q('#warm')?.classList.add('dawn'); sun.classList.add('bloom'); void sun.offsetWidth; sun.style.transform = 'scale(1.9)'; }, 900);
    setTimeout(() => { if (!L) return; cancelAnimationFrame(warmRaf); window.removeEventListener('resize', size); phase = 'end'; renderEnd(); }, 5200);
  }
}

/* ═════ 엔딩 06:00 ═════ */
let typing = null;
function typeText(el, txt) { let i = 0; finishType(); typing = {el, txt, timer: setInterval(() => { i++; el.textContent = txt.slice(0, i); if (i >= txt.length) finishType(); }, 28)}; }
function finishType() { if (typing) { clearInterval(typing.timer); typing.el.textContent = typing.txt; typing = null; } }
function renderEnd() {
  const E = N.ending;
  phase = 'end';
  h(`<div class="ending" style="padding-top:24px">` +
    `<div class="eyebrow">${esc(E.eyebrow)}</div><h2>${esc(E.word)}</h2>` +
    `<div class="sunrise"></div><div class="hero-frame end-frame">${farmSVG({phase: 'end'})}<div class="hero-tag"><span class="led"></span>06:00 SYSTEM REBOOT</div></div>` +
    `<div class="hero-log">${[4, 5, 6, 7, 8].map(n => `<span class="hl-ok">✓ LOCK ${n}</span>`).join('')}<span class="hl-ok">✓ 모두의 온기</span></div>` +
    `<div id="mon">${monster('calm', 'calm')}</div>` +
    '<div class="speech" style="max-width:560px;text-align:left;border-color:var(--leaf)"><b style="color:var(--leaf)">바이오 트윈 #0214</b><br><span id="typed"></span></div>' +
    `<p class="quote" id="quote" hidden>${esc(E.quote)}</p>` +
    '<div class="nm-certbox" id="cert" hidden><div class="nm-certimg" id="certImg">인증서를 만드는 중…</div>' +
      `<div class="nrow" style="justify-content:center"><button class="btn" id="certDl" disabled>${esc(N.labels.download)}</button><button class="btn nghost" id="nmBack">밤의 온실 보기</button></div>` +
      '<p class="dim" style="font-size:13px;text-align:center">저장이 안 되는 기기라면 인증서 그림을 길게 눌러 저장하세요.</p></div>' +
  '</div>');
  typeText(q('#typed'), E.lines);
  const hc = q('#heroClock'), led = q('#heroLed'), mins = ['05:00', '05:15', '05:30', '05:45', '06:00']; let mi = 0;
  const clk = setInterval(() => { if (!hc || !document.body.contains(hc)) { clearInterval(clk); return; } mi++; hc.textContent = mins[mi]; if (mi >= mins.length - 1) { clearInterval(clk); led?.setAttribute('fill', '#7fe0a8'); } }, 1100);
  setTimeout(() => { const e = q('#quote'); if (!e) return; finishType(); e.hidden = false; }, 3600);
  setTimeout(() => { const c = q('#cert'); if (c) c.hidden = false; }, 4800);
  q('#nmBack').onclick = () => close();
  Promise.resolve(H.buildCert?.()).then(cert => {
    const box = q('#certImg'), dl = q('#certDl'); if (!box || !cert) return;
    box.innerHTML = `<img src="${cert.url}" alt="밤 구역 연구 인증서">`; dl.disabled = false; dl.onclick = () => H.download?.(cert);
  });
}
