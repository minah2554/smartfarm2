import {CONFIG} from './config.js';
import {CONTENT as C} from './content.js';
import {HINTS, HINT_RULES} from './hints.js';
import {plantSvg, downloadPlant} from './plant.js';
import {launchGame} from './games.js';
import {sceneSvg} from './scene.js';
import {pushTeam, fetchTeams, clearTeams, watchTeams, syncLabel} from './sync.js';
import {sfx, isMuted, toggleMute} from './sound.js';

/* ───────── 상태 ─────────
   기기 상태(sf2-device): 지금 이 태블릿이 어느 반·모둠인지, 어떤 모드가 열렸는지
   모둠 진행(sf2-progress-{id}): 낮 미션 진행 기록 → sync.js로 관리자 화면에 공유 */
const KEYS = Object.keys(C.missions), GAME_KEYS = Object.keys(C.games);
const STAGE = ['새싹', '줄기', '꽃봉오리', '꽃'], GROW_TO = ['새싹으로', '줄기로', '꽃봉오리로', '꽃으로'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const load = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? f; } catch { return f; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장이 막힌 브라우저 */ } };
const norm = (s, cp) => { let v = String(s).trim().replace(/\s+/g, '').toUpperCase(); if (cp) v = v.replace(/0/g, 'O'); return v; };

let device = load('sf2-device', {classNo: null, teamNo: null, unlocked: {}, storySeen: false, view: 'start'});
const teamId = () => `c${device.classNo}-t${device.teamNo}`;
const teamName = () => `${CONFIG.grade} ${device.classNo}반 ${device.teamNo}모둠`;
const blankProgress = () => ({done: [], checkpoint: [], hints: {}, bonus: [], plantName: '', startedAt: null, finishedAt: null});
let P = device.classNo ? load(`sf2-progress-${teamId()}`, blankProgress()) : blankProgress();

const app = document.querySelector('#app');
let view = device.classNo ? (device.view || 'gate') : 'start';
let ui = {modal: null, tab: 'result', feedback: '', solved: null, slide: 0, pwFor: null, pwError: '', ticker: null, grow: false, adminFilter: 'all', adminBig: false, pick: {c: device.classNo, t: device.teamNo}};
let adminUnlocked = false, stopWatch = null, clock = null;

const saveDevice = () => store('sf2-device', device);
function saveProgress() {
  store(`sf2-progress-${teamId()}`, P);
  pushTeam({id: teamId(), classNo: device.classNo, teamNo: device.teamNo, mode: view === 'night' ? 'night' : 'day',
    day: {done: P.done, checkpoint: P.checkpoint, hints: P.hints, bonus: P.bonus, startedAt: P.startedAt, finishedAt: P.finishedAt}, night: {done: []}});
}
const done = k => P.done.includes(k);
const cpDone = k => !C.missions[k].checkpoint || P.checkpoint.includes(k);
const opened = k => P.hints[k] || 0;
const elapsed = (from, to) => { if (!from) return '00:00'; const s = Math.max(0, Math.floor(((to || Date.now()) - from) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function go(v) { view = v; if (['gate', 'day', 'night', 'briefing'].includes(v)) { device.view = v; saveDevice(); } render(); }

/* ───────── 공통 조각 ───────── */
function modeSwitch(size = '') {
  const cur = view === 'night' ? 'night' : view === 'day' || view === 'briefing' ? 'day' : null;
  return `<div class="mode-switch ${size} ${cur ? 'is-' + cur : 'is-none'}" role="radiogroup" aria-label="낮·밤 모드 전환">
    <button role="radio" aria-checked="${cur === 'day'}" data-mode="day"><span>☀️</span> 낮</button>
    <button role="radio" aria-checked="${cur === 'night'}" data-mode="night"><span>🌙</span> 밤</button>
    <i class="knob" aria-hidden="true"></i></div>`;
}
const muteBtn = () => `<button class="icon-btn" data-mute aria-label="효과음 ${isMuted() ? '켜기' : '끄기'}">${isMuted() ? '🔇' : '🔊'}</button>`;

/* ───────── 1. 시작 화면 ───────── */
function startView() {
  const btns = (n, sel, key, unit) => Array.from({length: n}, (_, i) => i + 1).map(i => `<button class="chip ${sel === i ? 'on' : ''}" data-pick="${key}" data-val="${i}">${i}${unit}</button>`).join('');
  return `<main class="start">
    <div class="start-art" aria-hidden="true">${plantSvg(['water', 'carbon'], [], '', true)}</div>
    <section class="start-card">
      <p class="kicker">융합 방탈출 · ${esc(CONFIG.grade)} 과학</p>
      <h1 class="logo">스마트팜<br>바이오 랩</h1>
      <p class="lead">관리 AI가 고장 난 온실을 구하러 출동할 연구 모둠을 등록하세요.</p>
      <h2 class="pick-title">우리 반</h2><div class="chips">${btns(CONFIG.classCount, ui.pick.c, 'c', '반')}</div>
      <h2 class="pick-title">우리 모둠</h2><div class="chips">${btns(CONFIG.teamCount, ui.pick.t, 't', '모둠')}</div>
      <button class="primary wide" data-enter ${ui.pick.c && ui.pick.t ? '' : 'disabled'}>${ui.pick.c && ui.pick.t ? `${ui.pick.c}반 ${ui.pick.t}모둠으로 연구소 입장` : '반과 모둠을 골라 주세요'}</button>
    </section>
    <footer class="start-foot"><button class="text-btn" data-admin>🛰️ 관제 센터 (선생님)</button><span>${esc(syncLabel())}</span></footer>
  </main>`;
}

/* ───────── 2. 출입 게이트 (낮·밤 스위치) ───────── */
function gateView() {
  return `<main class="gate">
    <header class="topbar"><span class="team-badge">${esc(teamName())}</span><span class="grow"></span>${muteBtn()}<button class="text-btn" data-change-team>모둠 바꾸기</button></header>
    <section class="gate-card">
      <p class="kicker">연구소 출입 게이트</p>
      <h1>스위치를 돌려 입장할<br>시간대를 고르세요</h1>
      ${modeSwitch('big')}
      <p class="muted">선생님이 알려 주는 비밀번호가 있어야 문이 열려요.</p>
    </section>
  </main>`;
}

function passwordModal() {
  const isDay = ui.pwFor === 'day', isAdmin = ui.pwFor === 'admin';
  return `<div class="overlay" data-backdrop><section class="modal pw ${isDay ? 'sunny' : isAdmin ? 'admin' : 'moony'}" role="dialog" aria-modal="true" aria-label="비밀번호 입력">
    <button class="close ghost" data-close>닫기</button>
    <div class="pw-icon">${isAdmin ? '🛰️' : isDay ? '☀️' : '🌙'}</div>
    <h2>${isAdmin ? '관제 센터 접속' : isDay ? '낮 모드 출입 승인' : '밤 모드 출입 승인'}</h2>
    <form id="pw-form"><input class="code-input" name="pw" type="password" autocomplete="off" inputmode="text" aria-label="비밀번호" placeholder="비밀번호" required>
    <button class="primary wide" type="submit">입장</button></form>
    <p class="feedback" aria-live="polite">${esc(ui.pwError)}</p></section></div>`;
}

/* ───────── 3. 작전 브리핑 ───────── */
function briefingView() {
  const s = C.briefing[ui.slide], last = ui.slide === C.briefing.length - 1;
  return `<main class="briefing">
    <div class="scan" aria-hidden="true"></div>
    <section class="brief-card">
      <p class="brief-tag"><span class="rec"></span>${esc(s.tag)} · ${ui.slide + 1}/${C.briefing.length}</p>
      ${ui.slide === 0 ? `<h1 class="glitch" data-text="SYSTEM FAILURE">SYSTEM FAILURE</h1>` : ''}
      <p class="brief-text" data-type="${esc(s.text)}"></p>
      ${s.formula ? `<div class="formula" aria-label="물 더하기 이산화탄소, 빛 에너지와 엽록체로 포도당 더하기 산소">
        <span class="f water">물<small>H₂O</small></span><b>+</b><span class="f carbon">이산화탄소<small>CO₂</small></span>
        <span class="arrow"><small>☀️ 빛 에너지</small>⟶<small>🟢 엽록체</small></span>
        <span class="f sugar">포도당</span><b>+</b><span class="f oxy">산소</span></div>` : ''}
      <div class="brief-nav"><div class="dots">${C.briefing.map((_, i) => `<i class="${i === ui.slide ? 'on' : ''}"></i>`).join('')}</div>
        ${ui.slide ? '<button class="ghost" data-brief="-1">이전</button>' : ''}
        <button class="primary" data-brief="${last ? 'go' : '1'}">${last ? '작전 개시!' : '다음'}</button></div>
    </section></main>`;
}

/* ───────── 4. 낮 모드 온실 ───────── */
function dayView() {
  const n = P.done.length;
  const state = {done: P.done, bonus: P.bonus};
  return `<main class="day">
    <header class="topbar"><span class="team-badge">${esc(teamName())}</span>
      <span class="timer" aria-label="경과 시간">⏱ <b id="clock">${elapsed(P.startedAt, P.finishedAt)}</b></span>
      <span class="grow"></span>${modeSwitch()}${muteBtn()}<button class="text-btn" data-replay>브리핑</button></header>
    <section class="hud" aria-label="자원 상태">${KEYS.map(k => `<div class="res ${done(k) ? 'on' : ''}"><span class="res-icon">${C.missions[k].icon}</span><span><b>${esc(C.missions[k].reward)}</b><small>${done(k) ? '공급 중' : '차단됨'}</small></span></div>`).join('')}
      <div class="res growth"><span class="res-icon">🌱</span><span><b>${STAGE[n]}</b><small>성장 ${n}/3</small></span></div></section>
    <section class="stage-wrap"><div class="stage">
      ${sceneSvg(state, C.games)}
      <div class="plant-layer ${ui.grow ? 'grow' : ''}">${plantSvg(P.done, P.bonus, P.plantName, true)}</div>
      <div class="toast" id="toast" role="status"></div>
    </div></section>
    <section class="ticker ${n === 3 ? 'ok' : ''}" aria-live="polite"><span class="ai">${esc(C.aiName)}</span><span id="ticker">${esc(ui.ticker || (n === 3 ? C.aiLines.allClear : C.aiLines.idle[0]))}</span></section>
    <p class="howto">색이 다른 분자를 찾아 눌러 보세요 · 장치를 복구하면 시설물에서 보너스 게임이 열려요</p>
  </main>`;
}

function lockModal(k) {
  const m = C.missions[k], h = HINTS[k];
  return `<div class="overlay" data-backdrop><section class="modal terminal-modal ${k}" role="dialog" aria-modal="true" aria-label="${esc(m.title)}">
    <button class="close ghost" data-close>닫기</button>
    <p class="kicker">${esc(h?.lock || '')}</p>
    <h2>${m.icon} ${esc(m.title)}</h2>
    <div class="tabs" role="tablist"><button role="tab" aria-selected="${ui.tab === 'result'}" class="${ui.tab === 'result' ? 'active' : ''}" data-tab="result">${esc(C.labels.resultTab)}</button><button role="tab" aria-selected="${ui.tab === 'hint'}" class="${ui.tab === 'hint' ? 'active' : ''}" data-tab="hint">${esc(C.labels.hintTab)} ${opened(k) ? `<small>${opened(k)}/3</small>` : ''}</button></div>
    <div class="pane">${ui.tab === 'hint' ? hintPane(k) : resultPane(k)}</div></section></div>`;
}

function resultPane(k) {
  const m = C.missions[k], g = GAME_KEYS.find(x => C.games[x].unlockBy === k);
  if (ui.solved === k) return `<div class="unlocked"><svg class="padlock" viewBox="0 0 120 120" aria-hidden="true"><path class="shackle" d="M38 54 V38 a22 22 0 0 1 44 0" fill="none" stroke="#8BD450" stroke-width="12" stroke-linecap="round"/><rect x="26" y="52" width="68" height="54" rx="12" fill="#8BD450"/><circle cx="60" cy="76" r="8" fill="#0F3D3A"/></svg>
      <h3>${esc(m.reward)} 공급 재개!</h3><p>식물이 <b>${GROW_TO[P.done.length]}</b> 자랐어요.</p>
      ${g ? `<p class="bonus-note">🎁 <b>${esc(C.games[g].place)}</b>에서 보너스 게임이 열렸어요.</p>` : ''}
      <div class="row">${g && !P.bonus.includes(g) ? `<button class="primary" data-play="${g}">${esc(C.games[g].place)}로 가기</button>` : ''}<button class="ghost" data-close>온실로 돌아가기</button></div></div>`;
  if (done(k)) return `<p class="ok">✅ 복구 완료 — ${esc(m.reward)} 공급 중이에요.</p>`;
  if (!cpDone(k)) {
    const cp = m.checkpoint;
    return `<p class="step">${esc(cp.label)}</p><p>${esc(cp.prompt)}</p>
      <form id="cp-form" class="code-form"><input class="code-input" name="code" autocomplete="off" placeholder="${esc(cp.placeholder)}" aria-label="${esc(cp.placeholder)}" required><button class="primary" type="submit">${esc(cp.button)}</button></form>
      <p class="feedback" aria-live="polite">${esc(ui.feedback)}</p>`;
  }
  return `${m.checkpoint ? `<p class="ok">✅ ${esc(m.checkpoint.success)}</p><p class="step">${esc(m.finalLabel || '')}</p>` : ''}<p>${esc(m.prompt)}</p>
    <form id="code-form" class="code-form"><input class="code-input" name="code" autocomplete="off" placeholder="${esc(m.placeholder)}" aria-label="${esc(m.placeholder)}" required><button class="primary" type="submit">${esc(C.labels.submit)}</button></form>
    <p class="feedback" aria-live="polite">${esc(ui.feedback)}</p>`;
}

function hintPane(k) {
  const h = HINTS[k]; if (!h) return '<p>준비된 힌트가 없어요.</p>';
  const n = opened(k);
  return `<p class="muted">막혔을 때만 열어 보세요. 1단계부터 차례로 열려요.</p>${h.levels.map((lv, i) => {
    if (i < n) return `<article class="hint open"><h4>${esc(lv.title)}</h4><ul>${(lv.lines || []).map(t => `<li class="${/^\s/.test(t) ? 'sub' : ''}">${esc(t.trim())}</li>`).join('')}</ul>${lv.answer ? `<p class="answer">정답 <b>${esc(lv.answer)}</b></p>` : ''}</article>`;
    const can = !HINT_RULES?.sequential || i === n;
    return `<article class="hint locked"><h4>${esc(lv.title)}</h4>${can ? `<button class="ghost" data-hint="${i}">${i + 1}단계 힌트 열기</button>` : `<p class="muted">${esc(HINT_RULES.lockedText)}</p>`}</article>`;
  }).join('')}`;
}

function clearModal() {
  return `<div class="overlay" data-backdrop><section class="modal clear" role="dialog" aria-modal="true" aria-label="낮 모드 클리어">
    <div class="sunset" aria-hidden="true"></div>
    <p class="kicker">DAY CLEAR</p><h2>${esc(C.completion)}</h2>
    <p>복구 시간 <b>${elapsed(P.startedAt, P.finishedAt)}</b> · 보너스 ${P.bonus.length}/3</p>
    <div class="clear-plant">${plantSvg(P.done, P.bonus, P.plantName)}</div>
    <label class="name-label">${esc(C.labels.name)}<input id="plant-name" class="field" maxlength="24" value="${esc(P.plantName)}" autocomplete="off"></label>
    <div class="row"><button class="primary" data-download>${esc(C.labels.download)}</button><button class="ghost" data-close>온실 보기</button></div>
    <p class="muted">${esc(C.nightWaiting)}</p></section></div>`;
}

/* ───────── 5. 밤 모드 (준비 중) ───────── */
function nightView() {
  return `<main class="night">
    <header class="topbar"><span class="team-badge">${esc(teamName())}</span><span class="grow"></span>${modeSwitch()}${muteBtn()}</header>
    <section class="night-card"><div class="moon" aria-hidden="true"></div><p class="kicker">NIGHT MODE</p><h1>밤의 온실</h1>
      <p>${esc(C.nightWaiting)}</p><p class="muted">낮 진행: ${P.done.length}/3 · 낮 모드로 돌아가려면 스위치를 해로 돌리세요.</p></section></main>`;
}

/* ───────── 6. 관제 센터 ───────── */
let teamsCache = {};
function adminView() {
  const list = Object.values(teamsCache).filter(t => t && t.classNo);
  const classes = [...new Set(list.map(t => t.classNo))].sort((a, b) => a - b);
  const shown = list.filter(t => ui.adminFilter === 'all' || String(t.classNo) === String(ui.adminFilter))
    .sort((a, b) => a.classNo - b.classNo || a.teamNo - b.teamNo);
  const dayClear = list.filter(t => (t.day?.done || []).length === 3).length;
  const card = t => {
    const d = t.day || {}, dn = d.done || [], ago = Math.round((Date.now() - (t.updatedAt || 0)) / 1000);
    return `<article class="team-card ${dn.length === 3 ? 'clear' : ''}">
      <header><h3>${t.classNo}반 ${t.teamNo}모둠</h3><span class="mode-tag m-${t.mode}">${t.mode === 'night' ? '🌙 밤' : '☀️ 낮'}</span></header>
      <div class="track">${KEYS.map(k => `<span class="node ${dn.includes(k) ? 'on' : ''}" title="${esc(C.missions[k].reward)}">${C.missions[k].icon}</span>`).join('<i></i>')}</div>
      <dl><div><dt>낮</dt><dd>${dn.length}/3${(d.checkpoint || []).includes('light') && !dn.includes('light') ? ' · LOCK3 기준 승인' : ''}</dd></div>
        <div><dt>힌트</dt><dd>${KEYS.map(k => `${C.missions[k].icon}${(d.hints || {})[k] || 0}`).join(' ')}</dd></div>
        <div><dt>보너스</dt><dd>🏆 ${(d.bonus || []).length}/3</dd></div>
        <div><dt>시간</dt><dd>${elapsed(d.startedAt, d.finishedAt)}${d.finishedAt ? ' 완료' : ''}</dd></div>
        <div><dt>밤</dt><dd>${(t.night?.done || []).length}/3</dd></div></dl>
      <footer>${ago < 60 ? `${ago}초 전 갱신` : `${Math.round(ago / 60)}분 전 갱신`}</footer></article>`;
  };
  return `<main class="admin ${ui.adminBig ? 'big' : ''}">
    <header class="topbar"><span class="team-badge">🛰️ 관제 센터</span><span class="muted small">${esc(syncLabel())}</span><span class="grow"></span>
      <button class="ghost" data-big>${ui.adminBig ? '보통 크기' : '모니터 크게'}</button><button class="ghost" data-exit-admin>나가기</button></header>
    <section class="summary"><div><b>${list.length}</b><span>접속 모둠</span></div><div><b>${dayClear}</b><span>낮 클리어</span></div><div><b>${list.filter(t => (t.night?.done || []).length === 3).length}</b><span>밤 클리어</span></div></section>
    <nav class="filters"><button class="chip ${ui.adminFilter === 'all' ? 'on' : ''}" data-filter="all">전체</button>${classes.map(c => `<button class="chip ${String(ui.adminFilter) === String(c) ? 'on' : ''}" data-filter="${c}">${c}반</button>`).join('')}</nav>
    ${shown.length ? `<section class="team-grid">${shown.map(card).join('')}</section>` : `<section class="empty"><p>아직 접속한 모둠이 없어요.</p><p class="muted">태블릿에서 반·모둠을 고르고 낮 모드에 입장하면 여기에 나타나요.</p></section>`}
    <p class="reset-row"><button class="text-btn" data-clear-all>모든 모둠 기록 지우기</button></p>
  </main>`;
}

/* ───────── 렌더 ───────── */
function render() {
  clearInterval(clock); clock = null;
  if (view !== 'admin' && stopWatch) { stopWatch(); stopWatch = null; }
  document.body.dataset.view = view;
  let html = '';
  if (view === 'start') html = startView();
  else if (view === 'gate') html = gateView();
  else if (view === 'briefing') html = briefingView();
  else if (view === 'day') html = dayView() + (ui.modal === 'clear' ? clearModal() : ui.modal ? lockModal(ui.modal) : '');
  else if (view === 'night') html = nightView();
  else if (view === 'admin') html = adminView();
  if (ui.pwFor) html += passwordModal();
  app.innerHTML = html;
  ui.grow = false;
  bind();
  if (view === 'briefing') typeText();
  if (view === 'day' && !P.finishedAt) clock = setInterval(() => { const el = document.getElementById('clock'); if (el) el.textContent = elapsed(P.startedAt); }, 1000);
  if (view === 'day' && !ui.modal) startTicker();
  if (view === 'admin') { clock = setInterval(() => render(), 5000); }
  const focus = app.querySelector('.modal .code-input'); if (focus && !ui.solved) focus.focus();
}

let typeTimer = null;
function typeText() {
  clearInterval(typeTimer);
  const el = app.querySelector('.brief-text'); if (!el) return;
  const full = el.dataset.type; let i = 0;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = full; return; }
  typeTimer = setInterval(() => { i += 2; el.textContent = full.slice(0, i); if (i % 6 === 0) sfx.type(); if (i >= full.length) { el.textContent = full; clearInterval(typeTimer); } }, 28);
}
let tickTimer = null, tickIdx = 0;
function startTicker() {
  clearInterval(tickTimer);
  if (P.done.length === 3) return;
  tickTimer = setInterval(() => {
    const el = document.getElementById('ticker'); if (!el || ui.modal) return;
    if (ui.ticker) { ui.ticker = null; }
    tickIdx = (tickIdx + 1) % C.aiLines.idle.length; el.textContent = C.aiLines.idle[tickIdx];
  }, 4200);
}
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ───────── 동작 ───────── */
function askPassword(kind) { ui.pwFor = kind; ui.pwError = ''; render(); }
function enterMode(kind) {
  if (kind === 'day') {
    if (!P.startedAt) { P.startedAt = Date.now(); saveProgress(); }
    if (!device.storySeen) { ui.slide = 0; go('briefing'); } else go('day');
  } else { go('night'); saveProgress(); }
}
function pickMode(kind) {
  const cur = view === 'night' ? 'night' : (view === 'day' || view === 'briefing') ? 'day' : null;
  if (kind === cur) return;
  sfx.tap();
  if (device.unlocked?.[kind]) enterMode(kind); else askPassword(kind);
}
function openLock(k) { ui.modal = k; ui.tab = 'result'; ui.feedback = ''; ui.solved = null; sfx.tap(); render(); }
function closeModal() { ui.modal = null; ui.solved = null; ui.feedback = ''; render(); }
function shake() { const m = app.querySelector('.modal'); if (!m) return; m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); }
function startGame(g) {
  const cfg = C.games[g];
  if (!done(cfg.unlockBy)) { toast(C.aiLines.lockedGame); sfx.error(); return; }
  ui.modal = null; ui.solved = null; render();
  launchGame(g, key => { if (!P.bonus.includes(key)) { P.bonus.push(key); saveProgress(); ui.grow = true; sfx.clear(); } render(); });
}
function solve(k) {
  if (!done(k)) { P.done.push(k); ui.grow = true; }
  if (P.done.length === 3 && !P.finishedAt) P.finishedAt = Date.now();
  saveProgress(); ui.solved = k; ui.feedback = '';
  ui.ticker = `✔ ${C.missions[k].reward} 공급 재개 · 남은 오류 ${3 - P.done.length}개`;
  sfx.unlock(); render();
}

function bind() {
  const $ = s => app.querySelector(s), $$ = s => app.querySelectorAll(s);
  $$('[data-pick]').forEach(b => b.onclick = () => { ui.pick[b.dataset.pick] = Number(b.dataset.val); sfx.tap(); render(); });
  $('[data-enter]')?.addEventListener('click', () => {
    device.classNo = ui.pick.c; device.teamNo = ui.pick.t; device.unlocked = {}; device.storySeen = false;
    P = load(`sf2-progress-${teamId()}`, blankProgress());
    if (P.done.length || P.startedAt) device.storySeen = true;
    saveDevice(); go('gate');
  });
  $('[data-admin]')?.addEventListener('click', () => askPassword('admin'));
  $('[data-change-team]')?.addEventListener('click', () => { ui.pick = {c: device.classNo, t: device.teamNo}; device.view = 'start'; saveDevice(); go('start'); });
  $$('[data-mode]').forEach(b => b.onclick = () => pickMode(b.dataset.mode));
  $$('[data-mute]').forEach(b => b.onclick = () => { toggleMute(); render(); });
  $$('[data-close]').forEach(b => b.onclick = () => { if (ui.pwFor) { ui.pwFor = null; render(); } else closeModal(); });
  $$('[data-backdrop]').forEach(o => o.addEventListener('click', e => { if (e.target === o) { if (ui.pwFor) { ui.pwFor = null; render(); } else closeModal(); } }));

  $('#pw-form')?.addEventListener('submit', e => {
    e.preventDefault(); const kind = ui.pwFor;
    if (norm(e.currentTarget.elements.pw.value) !== norm(CONFIG.passwords[kind])) { ui.pwError = '비밀번호가 맞지 않아요. 선생님께 확인하세요.'; sfx.error(); render(); shake(); return; }
    ui.pwFor = null; sfx.unlock();
    if (kind === 'admin') { adminUnlocked = true; openAdmin(); return; }
    device.unlocked = {...device.unlocked, [kind]: true}; saveDevice(); enterMode(kind);
  });

  $$('[data-brief]').forEach(b => b.onclick = () => {
    const v = b.dataset.brief; sfx.tap();
    if (v === 'go') { device.storySeen = true; saveDevice(); go('day'); return; }
    ui.slide = Math.max(0, Math.min(C.briefing.length - 1, ui.slide + Number(v))); render();
  });
  $('[data-replay]')?.addEventListener('click', () => { ui.slide = 0; go('briefing'); });

  // 온실 장면
  const world = $('.world');
  if (world) {
    const act = e => {
      const el = e.target.closest('[data-lock],[data-decoy],[data-game]'); if (!el) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (el.dataset.lock) openLock(el.dataset.lock);
      else if (el.dataset.game) startGame(el.dataset.game);
      else {
        const k = el.dataset.decoy, lines = C.aiLines[{water: 'decoyWater', carbon: 'decoyCarbon', light: 'decoyLight'}[k]] || [];
        el.classList.remove('wiggle'); void el.getBoundingClientRect(); el.classList.add('wiggle'); sfx.tap();
        toast(lines[Math.floor(Math.random() * lines.length)] || '');
      }
    };
    world.addEventListener('click', act); world.addEventListener('keydown', act);
  }

  $$('[data-tab]').forEach(b => b.onclick = () => { ui.tab = b.dataset.tab; ui.feedback = ''; sfx.tap(); render(); });
  $$('[data-hint]').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.hint), k = ui.modal;
    if (HINT_RULES?.sequential && i !== opened(k)) return;
    P.hints[k] = Math.max(opened(k), i + 1); saveProgress(); sfx.hint(); render();
  });
  $('#cp-form')?.addEventListener('submit', e => {
    e.preventDefault(); const k = ui.modal, cp = C.missions[k].checkpoint;
    if (norm(e.currentTarget.elements.code.value, true) !== norm(cp.answer, true)) { ui.feedback = cp.wrong; sfx.error(); render(); shake(); return; }
    if (!P.checkpoint.includes(k)) P.checkpoint.push(k);
    saveProgress(); ui.feedback = ''; sfx.unlock(); render();
  });
  $('#code-form')?.addEventListener('submit', e => {
    e.preventDefault(); const k = ui.modal, m = C.missions[k];
    if (norm(e.currentTarget.elements.code.value) !== norm(m.answer)) { ui.feedback = m.wrong; sfx.error(); render(); shake(); return; }
    solve(k);
  });
  $$('[data-play]').forEach(b => b.onclick = () => startGame(b.dataset.play));
  $('#plant-name')?.addEventListener('input', e => { P.plantName = e.target.value; store(`sf2-progress-${teamId()}`, P); const cp = $('.clear-plant'); if (cp) cp.innerHTML = plantSvg(P.done, P.bonus, P.plantName); });
  $('#plant-name')?.addEventListener('change', () => saveProgress());
  $('[data-download]')?.addEventListener('click', () => downloadPlant(P.done, P.bonus, P.plantName));

  // 관제 센터
  $$('[data-filter]').forEach(b => b.onclick = () => { ui.adminFilter = b.dataset.filter; render(); });
  $('[data-big]')?.addEventListener('click', () => { ui.adminBig = !ui.adminBig; render(); });
  $('[data-exit-admin]')?.addEventListener('click', () => { adminUnlocked = false; go(device.classNo ? (device.view && device.view !== 'start' ? device.view : 'gate') : 'start'); });
  $('[data-clear-all]')?.addEventListener('click', async () => {
    if (!confirm('모든 모둠의 진행 기록을 지울까요? 태블릿에 남은 기록은 각 태블릿에서 새로 저장될 때 다시 나타나요.')) return;
    await clearTeams(); teamsCache = {}; render();
  });
}

async function openAdmin() {
  view = 'admin'; teamsCache = await fetchTeams(); render();
  if (stopWatch) stopWatch();
  stopWatch = watchTeams(async () => { teamsCache = await fetchTeams(); if (view === 'admin') render(); });
}

// 낮 모드에서 세 장치를 모두 복구한 뒤 창을 닫으면 클리어 화면을 한 번 띄운다
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (ui.pwFor) { ui.pwFor = null; render(); } else if (ui.modal) closeModal(); } });
app.addEventListener('click', e => {
  if (e.target.closest('[data-close]') && view === 'day' && P.done.length === 3 && !P.clearShown) {
    P.clearShown = true; store(`sf2-progress-${teamId()}`, P); sfx.clear(); ui.modal = 'clear'; render();
  }
});
if (view === 'admin' || (view === 'day' && !device.unlocked?.day) || (view === 'night' && !device.unlocked?.night)) view = device.classNo ? 'gate' : 'start';
render();
