import {CONFIG} from './config.js';
import {CONTENT as C} from './content.js';
import {HINTS, HINT_RULES} from './hints.js';
import {plantSvg, potSvg, svgToImage} from './plant.js';
import {launchGame} from './games.js';
import {sceneSvg} from './scene.js';
import {drawCertificate, downloadCanvas, loadPhoto} from './cert.js';
import {getTeam, patchTeam, applyPatch, fetchTeams, watchTeams, watchTeam, deleteTeam, clearTeams, syncLabel, syncClock, now, SERVER_TIME} from './sync.js';
import {sfx, isMuted, toggleMute} from './sound.js';

/* ───────── 상태 ─────────
   기기(sf2-device) : 이 기기가 마지막으로 입장한 모둠, 비밀번호를 통과한 모드, 보던 화면
   모둠 기록(team)  : 학년·반·모둠, 연구원 이름, 낮·밤 진행 → sync.js가 저장·공유 (어느 기기에서 입장해도 이어짐) */
const KEYS = Object.keys(C.missions), GAME_KEYS = Object.keys(C.games);
const STAGE = ['새싹', '줄기', '꽃봉오리', '꽃'], GROW_TO = ['새싹으로', '줄기로', '꽃봉오리로', '꽃으로'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const load = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? f; } catch { return f; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장이 막힌 브라우저 */ } };
const norm = (s, cp) => { let v = String(s).trim().replace(/\s+/g, '').toUpperCase(); if (cp) v = v.replace(/0/g, 'O'); return v; };
const cleanName = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, CONFIG.nameMaxLength);
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const makeId = (g, c, t) => `g${g}-c${c}-t${t}`;
const limitMs = mode => (CONFIG.missionMinutes?.[mode] || 35) * 60000;

export const APP_VERSION = '2.1';
const ADMIN_HASH = 'ad5f52f58ed6ec6e7a641f2416f347674ac5933470079f2a18bc6269b1e80796';
async function sha256(s) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch { return ''; }
}

let device = load('sf2-device', {last: null, unlocked: {}, view: 'home', mode: 'day'});
const saveDevice = () => store('sf2-device', device);

let team = null, teamId = null, stopTeamWatch = null;
const app = document.querySelector('#app');
let view = 'home';
const blankForm = () => ({grade: CONFIG.grades.length === 1 ? CONFIG.grades[0] : null, classNo: null, teamNo: null, leader: '', members: Array(CONFIG.memberMax).fill(''), mode: device.mode || 'day', pw: '', error: ''});
let ui = {modal: null, tab: 'result', feedback: '', solved: null, slide: 0, pwFor: null, pwError: '', ticker: null, grow: false,
  adminFilter: 'all', adminBig: false, form: blankForm(), found: null, cert: null, certBusy: false, timeUpShown: false, armed: null};
let stopWatch = null, clock = null, teamsCache = {};

/* ───────── 모둠 기록 읽기 ───────── */
const Z = (mode = 'day') => team?.[mode] || {};
const doneList = () => KEYS.filter(k => Z().done?.[k]);
const bonusList = () => GAME_KEYS.filter(k => Z().bonus?.[k]);
const done = k => !!Z().done?.[k];
const cpDone = k => !C.missions[k].checkpoint || !!Z().checkpoint?.[k];
const opened = k => Z().hints?.[k] || 0;
const isComplete = () => doneList().length === KEYS.length && bonusList().length === GAME_KEYS.length;
const remaining = (rec, mode) => { const m = rec?.[mode]; if (!m?.startedAt) return limitMs(mode); return m.startedAt + limitMs(mode) - (m.finishedAt || now()); };
const timeUp = () => !!Z().startedAt && !Z().finishedAt && remaining(team, 'day') <= 0;
const usedMs = () => { const z = Z(); if (!z.startedAt) return 0; return Math.min(limitMs('day'), (z.finishedAt || now()) - z.startedAt); };
const teamLabel = (t = team) => t ? `${t.grade}학년 ${t.classNo}반 ${t.teamNo}모둠` : '';
const hintsTotal = () => KEYS.reduce((a, k) => a + opened(k), 0);

/* 기록 저장: 화면에 바로 반영하고 sync.js로 보낸다 */
function save(patch) {
  if (!team) return;
  applyPatch(team, patch);
  patchTeam(teamId, patch);
}
function checkComplete() {
  if (isComplete() && !Z().finishedAt) save({'day/finishedAt': SERVER_TIME});
}

function go(v) {
  view = v;
  if (['home', 'day', 'night', 'briefing'].includes(v)) { device.view = v; saveDevice(); }
  render();
}

/* ───────── 공통 조각 ───────── */
function modeSwitch(cur, size = '') {
  return `<div class="mode-switch ${size} ${cur ? 'is-' + cur : 'is-none'}" role="radiogroup" aria-label="낮·밤 구역 전환">
    <button type="button" role="radio" aria-checked="${cur === 'day'}" data-mode="day"><span>☀️</span> 낮</button>
    <button type="button" role="radio" aria-checked="${cur === 'night'}" data-mode="night"><span>🌙</span> 밤</button>
    <i class="knob" aria-hidden="true"></i></div>`;
}
const muteBtn = () => `<button class="icon-btn" data-mute aria-label="효과음 ${isMuted() ? '켜기' : '끄기'}">${isMuted() ? '🔇' : '🔊'}</button>`;
const homeBtn = () => `<button class="home-btn" data-home aria-label="처음 화면으로">🏠 처음으로</button>`;
function timerChip(mode) {
  const z = Z(mode);
  if (!z.startedAt) return '';
  const left = remaining(team, mode), fin = !!z.finishedAt;
  return `<span class="timer ${fin ? 'fin' : left <= 5 * 60000 ? 'hurry' : ''} ${left <= 0 && !fin ? 'over' : ''}" aria-label="남은 시간">${fin ? '✔ 완료' : '⏳'} <b id="clock">${fin ? fmt(z.finishedAt - z.startedAt) : fmt(left)}</b></span>`;
}
function topbar(mode) {
  const certReady = mode === 'day' && (isComplete() || timeUp());
  return `<header class="topbar">${homeBtn()}<span class="team-badge">${esc(teamLabel())}</span>${timerChip(mode)}
    ${certReady ? `<button class="cert-btn" data-open="${isComplete() ? 'complete' : 'timeup'}">🏅 인증서</button>` : ''}
    <span class="grow"></span>${modeSwitch(mode)}${muteBtn()}<button class="text-btn" data-replay>브리핑</button></header>`;
}

/* ───────── 1. 처음 화면 : 연구원 출입증 ───────── */
function homeView() {
  const f = ui.form, E = C.entry;
  const chips = (list, sel, key, unit) => list.map(i => `<button type="button" class="chip ${sel === i ? 'on' : ''}" data-pick="${key}" data-val="${i}">${i}${unit}</button>`).join('');
  const range = n => Array.from({length: n}, (_, i) => i + 1);
  const ready = f.grade && f.classNo && f.teamNo;
  const needPw = !device.unlocked?.[f.mode];
  const rec = ui.found;
  const recLine = rec ? `<p class="found">📂 ${esc(E.resume)} <small>낮 ${['done', 'bonus'].reduce((a, k) => a + Object.keys(rec.day?.[k] || {}).length, 0)}/6 · ${esc(statusText(rec, 'day'))} · 밤 ${esc(statusText(rec, 'night'))}</small></p>` : '';
  return `<main class="home">
    <section class="home-hero">
      <p class="kicker">${esc(E.kicker)}</p>
      <h1 class="logo">스마트팜<br>바이오 랩</h1>
      <p class="lead">${esc(E.lead)}</p>
      <div class="home-art" aria-hidden="true">${plantSvg(['water', 'carbon'], [], '', true)}</div>
    </section>
    <form class="badge-card" id="entry-form" autocomplete="off">
      <div class="badge-head"><span class="chip-hole" aria-hidden="true"></span><div><p class="badge-kicker">SMART FARM BIO LAB</p><h2>${esc(E.badgeTitle)}</h2></div><span class="badge-photo" aria-hidden="true">🧑‍🔬</span></div>
      ${CONFIG.grades.length > 1 ? `<fieldset><legend>학년</legend><div class="chips">${chips(CONFIG.grades, f.grade, 'grade', '학년')}</div></fieldset>` : ''}
      <fieldset><legend>반</legend><div class="chips">${chips(range(CONFIG.classCount), f.classNo, 'classNo', '반')}</div></fieldset>
      <fieldset><legend>모둠</legend><div class="chips">${chips(range(CONFIG.teamCount), f.teamNo, 'teamNo', '모둠')}</div></fieldset>
      ${recLine}
      <label class="lbl">${esc(E.leaderLabel)}<input class="field" name="leader" data-field="leader" maxlength="${CONFIG.nameMaxLength}" value="${esc(f.leader)}" placeholder="이름"></label>
      <fieldset><legend>${esc(E.memberLabel)}</legend><div class="members">${f.members.map((m, i) => `<input class="field" data-member="${i}" maxlength="${CONFIG.nameMaxLength}" value="${esc(m)}" placeholder="연구원 ${i + 1}" aria-label="연구원 ${i + 1} 이름">`).join('')}</div></fieldset>
      <div class="entry-mode"><span class="legend">${esc(E.modeLabel)}</span>${modeSwitch(f.mode)}</div>
      ${needPw ? `<label class="lbl">${f.mode === 'day' ? '☀️ 낮' : '🌙 밤'} 구역 비밀번호<input class="field pw-field" type="password" data-field="pw" value="${esc(f.pw)}" placeholder="선생님이 알려 준 비밀번호"></label>` : `<p class="muted small">✔ 이 기기는 ${f.mode === 'day' ? '낮' : '밤'} 구역 출입이 승인되어 있어요.</p>`}
      <p class="feedback" aria-live="polite">${esc(f.error)}</p>
      <button class="primary wide" type="submit" ${ready ? '' : 'disabled'}>${ready ? `${esc(E.enter)} · ${CONFIG.missionMinutes[f.mode]}분 시작` : '학년·반·모둠을 골라 주세요'}</button>
    </form>
    <footer class="home-foot"><button class="text-btn" data-admin>🛰️ 교사용 대시보드</button><span>${esc(syncLabel())}</span><span class="f-ver">v${APP_VERSION}</span></footer>
  </main>`;
}

function passwordModal() {
  const kind = ui.pwFor, isAdmin = kind === 'admin', isDay = kind === 'day';
  return `<div class="overlay" data-backdrop><section class="modal pw ${isDay ? 'sunny' : isAdmin ? 'admin' : 'moony'}" role="dialog" aria-modal="true" aria-label="비밀번호 입력">
    <button class="close ghost" data-close>닫기</button>
    <div class="pw-icon">${isAdmin ? '🛰️' : isDay ? '☀️' : '🌙'}</div>
    <h2>${isAdmin ? '교사용 대시보드' : isDay ? '낮 구역 출입 승인' : '밤 구역 출입 승인'}</h2>
    <form id="pw-form"><input class="code-input" name="pw" type="password" autocomplete="off" aria-label="비밀번호" placeholder="비밀번호" required>
    <button class="primary wide" type="submit">입장</button></form>
    <p class="feedback" aria-live="polite">${esc(ui.pwError)}</p></section></div>`;
}

/* ───────── 2. 작전 브리핑 (낮·밤 공통) ───────── */
function briefingView() {
  const s = C.briefing[ui.slide], last = ui.slide === C.briefing.length - 1, mode = device.mode || 'day';
  return `<main class="briefing">
    <div class="scan" aria-hidden="true"></div>
    <section class="brief-card">
      <p class="brief-tag"><span class="rec"></span>${esc(s.tag)} · ${ui.slide + 1}/${C.briefing.length}<span class="grow"></span>${timerChip(mode)}</p>
      ${ui.slide === 0 ? `<h1 class="glitch" data-text="SYSTEM FAILURE">SYSTEM FAILURE</h1>` : ''}
      ${s.text ? `<p class="brief-text" data-type="${esc(s.text)}"></p>` : ''}
      ${s.formula ? `<div class="formula" aria-label="물 더하기 이산화탄소, 빛 에너지와 엽록체로 포도당 더하기 산소">
        <span class="f water">물<small>H₂O</small></span><b>+</b><span class="f carbon">이산화탄소<small>CO₂</small></span>
        <span class="arrow"><small>☀️ 빛 에너지</small>⟶<small>🟢 엽록체</small></span>
        <span class="f sugar">포도당</span><b>+</b><span class="f oxy">산소</span></div>` : ''}
      ${s.split ? `<div class="split"><article class="zone-day"><h3>☀️ 낮 구역</h3><p>${esc(s.split.day)}</p></article><article class="zone-night"><h3>🌙 밤 구역</h3><p>${esc(s.split.night)}</p></article></div>` : ''}
      ${s.orders ? `<div class="orders"><span>${esc(teamLabel())} 첫 투입 구역</span><b class="o-${mode}">${mode === 'day' ? '☀️ 낮 구역' : '🌙 밤 구역'}</b></div>` : ''}
      <div class="brief-nav"><div class="dots">${C.briefing.map((_, i) => `<i class="${i === ui.slide ? 'on' : ''}"></i>`).join('')}</div>
        ${ui.slide ? '<button class="ghost" data-brief="-1">이전</button>' : ''}
        <button class="primary" data-brief="${last ? 'go' : '1'}">${last ? (mode === 'day' ? '☀️ 낮 구역 투입!' : '🌙 밤 구역 투입!') : '다음'}</button></div>
    </section></main>`;
}

/* ───────── 3. 낮 구역 온실 ───────── */
function dayView() {
  const n = doneList().length, over = timeUp();
  return `<main class="day">
    ${topbar('day')}
    <section class="hud" aria-label="자원 상태">${KEYS.map(k => `<div class="res ${done(k) ? 'on' : ''}"><span class="res-icon">${C.missions[k].icon}</span><span><b>${esc(C.missions[k].reward)}</b><small>${done(k) ? '공급 중' : '차단됨'}</small></span></div>`).join('')}
      <div class="res growth"><span class="res-icon">🌱</span><span><b>${STAGE[n]}</b><small>성장 ${n}/3 · 보너스 ${bonusList().length}/3</small></span></div></section>
    <section class="stage-wrap"><div class="stage ${over ? 'is-over' : ''}">
      ${sceneSvg({done: doneList(), bonus: bonusList()}, C.games)}
      <div class="plant-layer ${ui.grow ? 'grow' : ''}">${plantSvg(doneList(), bonusList(), Z().plantName, true)}</div>
      ${over ? `<div class="over-band"><b>TIME OVER</b><button class="primary" data-open="timeup">🏅 인증서 받기</button></div>` : ''}
      <div class="toast" id="toast" role="status"></div>
    </div></section>
    <section class="ticker ${n === 3 ? 'ok' : ''}" aria-live="polite"><span class="ai">${esc(C.aiName)}</span><span id="ticker">${esc(ui.ticker || (n === 3 ? C.aiLines.allClear : C.aiLines.idle[0]))}</span></section>
    <p class="howto">색이 다른 분자를 찾아 눌러 보세요 · 장치를 복구하면 시설물에서 보너스 게임이 열려요 · 보너스까지 모두 끝내면 식물에 이름을 붙일 수 있어요</p>
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
      <h3>${esc(m.reward)} 공급 재개!</h3><p>식물이 <b>${GROW_TO[doneList().length]}</b> 자랐어요.</p>
      ${g ? `<p class="bonus-note">🎁 <b>${esc(C.games[g].place)}</b>에서 보너스 게임이 열렸어요.</p>` : ''}
      <div class="row">${g && !bonusList().includes(g) ? `<button class="primary" data-play="${g}">${esc(C.games[g].place)}로 가기</button>` : ''}<button class="ghost" data-close>온실로 돌아가기</button></div></div>`;
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

/* 기념 화분 · 인증서 */
function potOpts(nameOverride) {
  const n = doneList().length, complete = isComplete();
  return {stage: n, bonus: bonusList(), plantName: complete ? (nameOverride ?? Z().plantName ?? '') : '', tagText: complete ? '이름을 지어 주세요' : `${STAGE[n]} 단계`,
    leader: team.leader, members: team.members || [], teamLabel: teamLabel(),
    timeText: complete ? `⏱ 미션 완료 ${fmt(usedMs())}` : `⏱ 시간 종료 · 진행 ${n + bonusList().length}/6`};
}
function certPanel() {
  const ready = ui.cert && !ui.certBusy;
  return `<div class="cert-box">${ready ? `<img class="cert-img" src="${ui.cert.url}" alt="연구 인증서 미리보기">` : '<div class="cert-wait">인증서를 만드는 중…</div>'}</div>
    <div class="row"><button class="primary" data-dl-cert ${ready ? '' : 'disabled'}>${esc(C.labels.download)}</button><button class="ghost" data-dl-pot>${esc(C.labels.downloadPot)}</button><button class="ghost" data-close>온실 보기</button></div>
    <p class="muted small">저장이 안 되는 기기라면 인증서 그림을 길게 눌러 저장하세요.</p>`;
}
function completeModal() {
  const named = !!Z().plantName;
  return `<div class="overlay" data-backdrop><section class="modal clear" role="dialog" aria-modal="true" aria-label="낮 구역 완전 복구">
    <div class="sunset" aria-hidden="true"></div>
    <p class="kicker">DAY CLEAR · ${fmt(usedMs())}</p><h2>${esc(named ? `‘${Z().plantName}’이(가) 활짝 피었어요!` : C.completion)}</h2>
    ${named ? `${ui.cert?.photo ? `<p class="photo-note">📸 우리 식물이 실제로 이렇게 꽃을 피웠어요!</p>` : ''}${certPanel()}<button class="text-btn" data-rename>이름 다시 짓기</button>`
      : `<div class="pot-preview" id="pot-preview">${potSvg(potOpts(ui.nameDraft || ''))}</div>
      <form id="name-form" class="code-form"><input id="plant-name" class="field" maxlength="8" value="${esc(ui.nameDraft || '')}" placeholder="식물 이름 (8글자까지)" aria-label="${esc(C.labels.name)}" required>
      <button class="primary" type="submit">이름표 꽂기</button></form><p class="feedback" aria-live="polite">${esc(ui.feedback)}</p>`}
  </section></div>`;
}
function timeUpModal() {
  return `<div class="overlay" data-backdrop><section class="modal clear over" role="dialog" aria-modal="true" aria-label="시간 종료">
    <p class="kicker">TIME OVER</p><h2>${esc(C.timeUp)}</h2>
    <p>장치 복구 ${doneList().length}/3 · 보너스 ${bonusList().length}/3 · 우리 식물은 <b>${STAGE[doneList().length]}</b> 단계</p>
    ${certPanel()}</section></div>`;
}
function homeConfirm() {
  return `<div class="overlay" data-backdrop><section class="modal confirm" role="dialog" aria-modal="true" aria-label="처음 화면으로">
    <div class="pw-icon">🏠</div><h2>처음 화면으로 갈까요?</h2>
    <p>진행 기록은 저장돼요. 같은 학년·반·모둠으로 다시 입장하면 이어서 할 수 있어요.<br><b>타이머는 멈추지 않아요.</b></p>
    <div class="row"><button class="primary" data-go-home>처음으로</button><button class="ghost" data-close>계속하기</button></div></section></div>`;
}

/* ───────── 4. 밤 구역 ───────── */
function nightView() {
  return `<main class="night">
    ${topbar('night')}
    <section class="night-card"><div class="moon" aria-hidden="true"></div><p class="kicker">NIGHT ZONE</p><h1>밤의 온실</h1>
      <p>${esc(C.nightWaiting)}</p>
      <p class="muted">낮 구역 진행: 장치 ${doneList().length}/3 · 보너스 ${bonusList().length}/3 — 스위치를 해로 돌리면 낮 구역으로 이동해요.</p></section></main>`;
}

/* ───────── 5. 교사용 대시보드 ───────── */
function statusText(rec, mode) {
  const z = rec?.[mode];
  if (mode === 'night' && !CONFIG.nightEnabled && !z?.startedAt) return '준비 중';
  if (!z?.startedAt) return '시작 전';
  if (z.finishedAt) return `완료 ${fmt(z.finishedAt - z.startedAt)}`;
  const left = remaining(rec, mode);
  return left <= 0 ? '시간 종료' : `남은 ${fmt(left)}`;
}
function zoneRow(t, mode) {
  const z = t[mode] || {}, nodes = mode === 'day'
    ? [...KEYS.map(k => [C.missions[k].icon, !!z.done?.[k], C.missions[k].reward]), ...GAME_KEYS.map(g => [C.games[g].icon, !!z.bonus?.[g], C.games[g].title])]
    : Object.keys(z.done || {}).map(k => ['●', true, k]).concat(Array.from({length: Math.max(0, 3 - Object.keys(z.done || {}).length)}, () => ['●', false, '']));
  const st = statusText(t, mode), cls = z.finishedAt ? 'fin' : st === '시간 종료' ? 'over' : z.startedAt ? 'run' : 'idle';
  return `<div class="zone z-${mode} ${cls}"><span class="zl">${mode === 'day' ? '☀️ 낮' : '🌙 밤'}</span>
    <div class="nodes">${nodes.map(([ic, on, title], i) => `${mode === 'day' && i === KEYS.length ? '<i class="sep"></i>' : ''}<span class="nd ${on ? 'on' : ''}" title="${esc(title)}">${ic}</span>`).join('')}</div>
    <span class="tl" data-tl="${esc(t.id)}" data-mode="${mode}">${esc(st)}</span></div>`;
}
function adminView() {
  const list = Object.values(teamsCache).filter(t => t && t.classNo && t.grade);
  const groupKey = t => `${t.grade}-${t.classNo}`;
  const groups = [...new Set(list.map(groupKey))].sort((a, b) => { const [ga, ca] = a.split('-').map(Number), [gb, cb] = b.split('-').map(Number); return ga - gb || ca - cb; });
  const shown = ui.adminFilter === 'all' ? groups : groups.filter(g => g === ui.adminFilter);
  const count = (mode, fn) => list.filter(t => fn(t[mode] || {}, t)).length;
  const card = t => {
    const ago = Math.max(0, Math.round((now() - (t.updatedAt || 0)) / 1000));
    const where = t.mode === 'night' ? '🌙 밤' : '☀️ 낮';
    const crew = [t.leader ? `★ ${esc(t.leader)}` : '', ...(t.members || []).map(esc)].filter(Boolean).join(' · ');
    return `<article class="team-card ${t.day?.finishedAt ? 'clear' : ''}">
      <header><h3>${t.teamNo}모둠</h3><span class="mode-tag m-${t.mode === 'night' ? 'night' : 'day'}">${where}</span></header>
      <p class="crew">${crew || '<span class="muted">이름 없음</span>'}</p>
      ${zoneRow(t, 'day')}${zoneRow(t, 'night')}
      <footer><span>힌트 ${KEYS.map(k => `${C.missions[k].icon}${t.day?.hints?.[k] || 0}`).join(' ')}</span>${t.day?.plantName ? `<span>🌸 ${esc(t.day.plantName)}</span>` : ''}<span class="grow"></span><span>${ago < 60 ? `${ago}초 전` : `${Math.round(ago / 60)}분 전`}</span>
        <button class="del" data-del="${esc(t.id)}">${ui.armed === t.id ? '정말 삭제?' : '기록 삭제'}</button></footer></article>`;
  };
  return `<main class="admin ${ui.adminBig ? 'big' : ''}">
    <header class="topbar"><span class="team-badge">🛰️ 교사용 대시보드</span><span class="muted small">${esc(syncLabel())}</span><span class="f-ver">v${APP_VERSION}</span><span class="grow"></span>
      <button class="ghost" data-big>${ui.adminBig ? '보통 크기' : '모니터 크게'}</button><button class="ghost" data-exit-admin>나가기</button></header>
    <section class="summary">
      <div><b>${list.length}</b><span>접속 모둠</span></div>
      <div class="d"><b>${count('day', z => z.startedAt && !z.finishedAt && remaining({day: z}, 'day') > 0)}</b><span>☀️ 낮 진행 중</span></div>
      <div class="d"><b>${count('day', z => z.finishedAt)}</b><span>☀️ 낮 완료</span></div>
      <div class="n"><b>${count('night', z => z.startedAt && !z.finishedAt && remaining({night: z}, 'night') > 0)}</b><span>🌙 밤 진행 중</span></div>
      <div class="n"><b>${count('night', z => z.finishedAt)}</b><span>🌙 밤 완료</span></div></section>
    <nav class="filters"><button class="chip ${ui.adminFilter === 'all' ? 'on' : ''}" data-filter="all">전체 반</button>${groups.map(g => { const [gr, c] = g.split('-'); return `<button class="chip ${ui.adminFilter === g ? 'on' : ''}" data-filter="${g}">${gr}학년 ${c}반</button>`; }).join('')}</nav>
    ${shown.length ? shown.map(g => { const [gr, c] = g.split('-'); const teams = list.filter(t => groupKey(t) === g).sort((a, b) => a.teamNo - b.teamNo);
      return `<section class="class-block"><h2>${gr}학년 ${c}반 <small>${teams.length}모둠 · 낮 완료 ${teams.filter(t => t.day?.finishedAt).length} · 밤 완료 ${teams.filter(t => t.night?.finishedAt).length}</small></h2><div class="team-grid">${teams.map(card).join('')}</div></section>`; }).join('')
      : `<section class="empty"><p>아직 입장한 모둠이 없어요.</p><p class="muted">학생 기기에서 출입증을 발급하고 입장하면 여기에 실시간으로 나타나요.</p></section>`}
    <p class="reset-row"><button class="text-btn" data-clear-all>${ui.armed === '*' ? '한 번 더 누르면 모든 기록이 지워져요' : '모든 모둠 기록 지우기'}</button></p>
  </main>`;
}

/* ───────── 렌더 ───────── */
function render() {
  if (view !== 'admin' && stopWatch) { stopWatch(); stopWatch = null; }
  document.body.dataset.view = view;
  if (team && isComplete() && !Z().finishedAt) checkComplete();   // 다른 기기에서 마지막 미션을 끝낸 경우
  let html = '';
  if (view === 'home') html = homeView();
  else if (view === 'briefing') html = briefingView();
  else if (view === 'day') {
    html = dayView();
    if (ui.modal === 'complete') html += completeModal();
    else if (ui.modal === 'timeup') html += timeUpModal();
    else if (ui.modal === 'home') html += homeConfirm();
    else if (ui.modal) html += lockModal(ui.modal);
  } else if (view === 'night') html = nightView() + (ui.modal === 'home' ? homeConfirm() : '');
  else if (view === 'admin') html = adminView();
  if (ui.pwFor) html += passwordModal();
  app.innerHTML = html;
  ui.grow = false;
  bind();
  if (view === 'briefing') typeText();
  if (view === 'day' && !ui.modal) startTicker();
  const focus = app.querySelector('.modal .code-input'); if (focus && !ui.solved) focus.focus();
}

/* 1초마다: 타이머 숫자, 시간 종료 감지, 대시보드 남은 시간 */
function tick() {
  if (view === 'admin') {
    app.querySelectorAll('[data-tl]').forEach(el => { const t = teamsCache[el.dataset.tl]; if (t) el.textContent = statusText(t, el.dataset.mode); });
    return;
  }
  if (!team || !['day', 'night', 'briefing'].includes(view)) return;
  const mode = view === 'briefing' ? (device.mode || 'day') : view;
  const el = document.getElementById('clock'), z = Z(mode);
  if (el && z.startedAt && !z.finishedAt) {
    const left = remaining(team, mode); el.textContent = fmt(left);
    el.parentElement.classList.toggle('hurry', left <= 5 * 60000);
  }
  if (view === 'day' && timeUp() && !ui.timeUpShown) {
    ui.timeUpShown = true;
    document.querySelectorAll('.game-layer').forEach(x => x.remove());
    sfx.error(); openCertModal('timeup');
  }
}
setInterval(tick, 1000);

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
  if (doneList().length === 3) return;
  tickTimer = setInterval(() => {
    const el = document.getElementById('ticker'); if (!el || ui.modal) return;
    ui.ticker = null; tickIdx = (tickIdx + 1) % C.aiLines.idle.length; el.textContent = C.aiLines.idle[tickIdx];
  }, 4200);
}
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ───────── 동작 ───────── */
async function lookupTeam() {
  const f = ui.form; ui.found = null;
  if (!(f.grade && f.classNo && f.teamNo)) return;
  const id = makeId(f.grade, f.classNo, f.teamNo), rec = await getTeam(id);
  if (makeId(ui.form.grade, ui.form.classNo, ui.form.teamNo) !== id) return;   // 그사이 다른 모둠을 고른 경우
  ui.found = rec && rec.grade ? rec : null;
  if (ui.found && !f.leader.trim() && !f.members.some(m => m.trim())) {
    f.leader = ui.found.leader || '';
    f.members = Array.from({length: CONFIG.memberMax}, (_, i) => (ui.found.members || [])[i] || '');
  }
  render();
}

function startTeamWatch() {
  stopTeamWatch?.();
  stopTeamWatch = watchTeam(teamId, async () => {
    const rec = await getTeam(teamId); if (!rec || !team) return;
    const sig = r => JSON.stringify([r.day, r.night, r.leader, r.members, r.storySeen]);
    if (sig(rec) === sig(team)) { team = rec; return; }
    team = rec;
    const typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && app.contains(document.activeElement);
    if (!typing && !document.querySelector('.game-layer') && view !== 'briefing') render();
  });
}

async function enterTeam() {
  const f = ui.form;
  f.leader = cleanName(f.leader); f.members = f.members.map(cleanName);
  if (!f.leader) { f.error = '대표 연구원(팀장) 이름을 적어 주세요.'; sfx.error(); render(); return; }
  if (!device.unlocked?.[f.mode]) {
    if (norm(f.pw) !== norm(CONFIG.passwords[f.mode])) { f.error = '비밀번호가 맞지 않아요. 선생님께 확인하세요.'; f.pw = ''; sfx.error(); render(); return; }
    device.unlocked = {...device.unlocked, [f.mode]: true};
  }
  teamId = makeId(f.grade, f.classNo, f.teamNo);
  team = (await getTeam(teamId)) || {id: teamId};
  const patch = {id: teamId, grade: f.grade, classNo: f.classNo, teamNo: f.teamNo, leader: f.leader, members: f.members.filter(Boolean)};
  if (!team.createdAt) patch.createdAt = SERVER_TIME;
  save(patch);
  device.last = {grade: f.grade, classNo: f.classNo, teamNo: f.teamNo};
  f.error = ''; f.pw = ''; sfx.unlock();
  ui.timeUpShown = timeUp(); ui.cert = null;
  startTeamWatch();
  enterMode(f.mode);
}

function enterMode(mode) {
  device.mode = mode; saveDevice();
  const patch = {mode};
  if ((mode === 'day' || CONFIG.nightEnabled) && !Z(mode).startedAt) patch[`${mode}/startedAt`] = SERVER_TIME;
  save(patch);
  ui.modal = null;
  if (!team.storySeen) { ui.slide = 0; go('briefing'); } else go(mode);
}
function pickModeInGame(kind) {
  const cur = view === 'night' ? 'night' : 'day';
  if (kind === cur) return;
  sfx.tap();
  if (device.unlocked?.[kind]) enterMode(kind); else { ui.pwFor = kind; ui.pwError = ''; render(); }
}
function openLock(k) {
  if (timeUp()) { toast('시간이 끝났어요. 인증서를 받아 보세요!'); sfx.error(); return; }
  ui.modal = k; ui.tab = 'result'; ui.feedback = ''; ui.solved = null; sfx.tap(); render();
}
function closeModal() {
  const was = ui.modal;
  ui.modal = null; ui.solved = null; ui.feedback = '';
  if (was !== 'complete' && was !== 'home' && view === 'day' && isComplete() && !Z().plantName) { openCertModal('complete'); return; }
  render();
}
function shake() { const m = app.querySelector('.modal'); if (!m) return; m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); }
function startGame(g) {
  const cfg = C.games[g];
  if (timeUp()) { toast('시간이 끝났어요. 인증서를 받아 보세요!'); sfx.error(); return; }
  if (!done(cfg.unlockBy)) { toast(C.aiLines.lockedGame); sfx.error(); return; }
  ui.modal = null; ui.solved = null; render();
  launchGame(g, key => {
    if (timeUp()) return;
    if (!Z().bonus?.[key]) { save({[`day/bonus/${key}`]: SERVER_TIME}); ui.grow = true; sfx.clear(); checkComplete(); }
    if (isComplete() && !Z().plantName) openCertModal('complete'); else render();
  });
}
function solve(k) {
  if (!done(k)) { save({[`day/done/${k}`]: SERVER_TIME}); ui.grow = true; }
  checkComplete();
  ui.solved = k; ui.feedback = '';
  ui.ticker = `✔ ${C.missions[k].reward} 공급 재개 · 남은 오류 ${3 - doneList().length}개`;
  sfx.unlock(); render();
}

/* 인증서 */
function openCertModal(kind) {
  ui.modal = kind; ui.feedback = ''; render();
  if (kind === 'timeup' || Z().plantName) buildCert();
}
async function buildCert() {
  ui.certBusy = true; ui.cert = null;
  const complete = isComplete(), locks = doneList().length, bonus = bonusList().length;
  let photo = null;
  if (complete) {
    if (!Z().photo && C.photos?.length) save({'day/photo': C.photos[Math.floor(Math.random() * C.photos.length)]});
    photo = await loadPhoto(C.photos || [], Z().photo);
  }
  const tier = C.certificate.tiers.find(t => locks >= t.locks && bonus >= t.bonus) || C.certificate.tiers[C.certificate.tiers.length - 1];
  const d = new Date(), o = potOpts();
  try {
    const canvas = await drawCertificate({
      title: C.certificate.title, tier, complete, photo: photo?.img || null, speed: complete && usedMs() <= C.certificate.speedMinutes * 60000,
      plantName: o.plantName, tagText: o.tagText, leader: team.leader, members: team.members || [], teamLabel: teamLabel(),
      stage: locks, bonus: bonusList(), timeText: o.timeText,
      statsText: `장치 복구 ${locks}/3 · 보너스 게임 ${bonus}/3 · 힌트 ${hintsTotal()}단계 사용`,
      dateText: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    });
    ui.cert = {canvas, url: canvas.toDataURL('image/png'), photo: !!photo};
  } catch { ui.cert = null; }
  ui.certBusy = false;
  if (ui.modal === 'complete' || ui.modal === 'timeup') render();
}
async function downloadPot() {
  const img = await svgToImage(potSvg(potOpts()));
  const c = document.createElement('canvas'); c.width = 1200; c.height = 1440;
  c.getContext('2d').drawImage(img, 0, 0, 1200, 1440);
  downloadCanvas(c, `smartfarm_pot_${team.grade}-${team.classNo}-${team.teamNo}.png`);
}

function goHome() {
  stopTeamWatch?.(); stopTeamWatch = null;
  const t = team;
  ui.modal = null; ui.form = blankForm(); ui.found = t && t.grade ? t : null;
  if (t) Object.assign(ui.form, {grade: t.grade, classNo: t.classNo, teamNo: t.teamNo, leader: t.leader || '', mode: device.mode || 'day',
    members: Array.from({length: CONFIG.memberMax}, (_, i) => (t.members || [])[i] || '')});
  team = null; teamId = null; go('home');
}

async function openAdmin() {
  view = 'admin'; teamsCache = await fetchTeams(); render();
  stopWatch?.();
  stopWatch = watchTeams(async () => { teamsCache = await fetchTeams(); if (view === 'admin') render(); });
}

function bind() {
  const $ = s => app.querySelector(s), $$ = s => app.querySelectorAll(s);

  // 처음 화면
  $$('[data-pick]').forEach(b => b.onclick = () => { ui.form[b.dataset.pick] = Number(b.dataset.val); ui.form.error = ''; sfx.tap(); render(); lookupTeam(); });
  $$('[data-field]').forEach(i => i.oninput = () => { ui.form[i.dataset.field] = i.value; });
  $$('[data-member]').forEach(i => i.oninput = () => { ui.form.members[Number(i.dataset.member)] = i.value; });
  $('#entry-form')?.addEventListener('submit', e => { e.preventDefault(); enterTeam(); });
  $('[data-admin]')?.addEventListener('click', () => { ui.pwFor = 'admin'; ui.pwError = ''; render(); });
  $$('[data-mode]').forEach(b => b.onclick = () => {
    if (view === 'home') { ui.form.mode = b.dataset.mode; ui.form.error = ''; sfx.tap(); render(); }
    else pickModeInGame(b.dataset.mode);
  });
  $$('[data-mute]').forEach(b => b.onclick = () => { toggleMute(); render(); });
  $$('[data-close]').forEach(b => b.onclick = () => { if (ui.pwFor) { ui.pwFor = null; render(); } else closeModal(); });
  $$('[data-backdrop]').forEach(o => o.addEventListener('click', e => { if (e.target === o) { if (ui.pwFor) { ui.pwFor = null; render(); } else closeModal(); } }));
  $('[data-home]')?.addEventListener('click', () => { ui.modal = 'home'; sfx.tap(); render(); });
  $('[data-go-home]')?.addEventListener('click', goHome);

  $('#pw-form')?.addEventListener('submit', async e => {
    e.preventDefault(); const kind = ui.pwFor;
    const raw = e.currentTarget.elements.pw.value;
    const val = norm(raw);
    const hash = await sha256(raw.trim().toLowerCase());
    const isAdmin = kind === 'admin';
    const isMatch = isAdmin
      ? (hash === ADMIN_HASH || (CONFIG.passwords?.admin && val === norm(CONFIG.passwords.admin)))
      : (val === norm(CONFIG.passwords?.[kind]));
    if (!isMatch) { ui.pwError = '비밀번호가 맞지 않아요. 선생님께 확인하세요.'; sfx.error(); render(); shake(); return; }
    ui.pwFor = null; sfx.unlock();
    if (kind === 'admin') { openAdmin(); return; }
    device.unlocked = {...device.unlocked, [kind]: true}; saveDevice(); enterMode(kind);
  });

  // 브리핑
  $$('[data-brief]').forEach(b => b.onclick = () => {
    const v = b.dataset.brief; sfx.tap();
    if (v === 'go') { if (!team.storySeen) save({storySeen: true}); go(device.mode || 'day'); return; }
    ui.slide = Math.max(0, Math.min(C.briefing.length - 1, ui.slide + Number(v))); render();
  });
  $('[data-replay]')?.addEventListener('click', () => { ui.slide = 0; ui.modal = null; go('briefing'); });

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

  // 암호 장치
  $$('[data-tab]').forEach(b => b.onclick = () => { ui.tab = b.dataset.tab; ui.feedback = ''; sfx.tap(); render(); });
  $$('[data-hint]').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.hint), k = ui.modal;
    if (HINT_RULES?.sequential && i !== opened(k)) return;
    save({[`day/hints/${k}`]: Math.max(opened(k), i + 1)}); sfx.hint(); render();
  });
  $('#cp-form')?.addEventListener('submit', e => {
    e.preventDefault(); const k = ui.modal, cp = C.missions[k].checkpoint;
    if (timeUp()) return;
    if (norm(e.currentTarget.elements.code.value, true) !== norm(cp.answer, true)) { ui.feedback = cp.wrong; sfx.error(); render(); shake(); return; }
    save({[`day/checkpoint/${k}`]: SERVER_TIME}); ui.feedback = ''; sfx.unlock(); render();
  });
  $('#code-form')?.addEventListener('submit', e => {
    e.preventDefault(); const k = ui.modal, m = C.missions[k];
    if (timeUp()) return;
    if (norm(e.currentTarget.elements.code.value) !== norm(m.answer)) { ui.feedback = m.wrong; sfx.error(); render(); shake(); return; }
    solve(k);
  });
  $$('[data-play]').forEach(b => b.onclick = () => startGame(b.dataset.play));

  // 이름표·인증서
  $('#plant-name')?.addEventListener('input', e => { ui.nameDraft = e.target.value; const p = $('#pot-preview'); if (p) p.innerHTML = potSvg(potOpts(ui.nameDraft)); });
  $('#name-form')?.addEventListener('submit', e => {
    e.preventDefault(); const name = cleanName(ui.nameDraft).slice(0, 8);
    if (!name) { ui.feedback = '식물 이름을 적어 주세요.'; render(); return; }
    save({'day/plantName': name}); ui.nameDraft = ''; sfx.clear(); openCertModal('complete');
  });
  $('[data-rename]')?.addEventListener('click', () => { ui.nameDraft = Z().plantName; save({'day/plantName': null}); ui.cert = null; render(); });
  $$('[data-open]').forEach(b => b.onclick = () => openCertModal(b.dataset.open));
  $('[data-dl-cert]')?.addEventListener('click', () => { if (ui.cert) downloadCanvas(ui.cert.canvas, `smartfarm_certificate_${team.grade}-${team.classNo}-${team.teamNo}.png`); });
  $('[data-dl-pot]')?.addEventListener('click', downloadPot);

  // 대시보드
  $$('[data-filter]').forEach(b => b.onclick = () => { ui.adminFilter = b.dataset.filter; render(); });
  $('[data-big]')?.addEventListener('click', () => { ui.adminBig = !ui.adminBig; render(); });
  $('[data-exit-admin]')?.addEventListener('click', () => { stopWatch?.(); stopWatch = null; go('home'); });
  const arm = key => { ui.armed = key; render(); setTimeout(() => { if (ui.armed === key) { ui.armed = null; if (view === 'admin') render(); } }, 3000); };
  $$('[data-del]').forEach(b => b.onclick = async () => {
    const id = b.dataset.del;
    if (ui.armed !== id) { arm(id); return; }
    ui.armed = null; await deleteTeam(id); delete teamsCache[id]; render();
  });
  $('[data-clear-all]')?.addEventListener('click', async () => {
    if (ui.armed !== '*') { arm('*'); return; }
    ui.armed = null; await clearTeams(); teamsCache = {}; render();
  });
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (ui.pwFor) { ui.pwFor = null; render(); } else if (ui.modal && view !== 'home') closeModal();
});

/* ───────── 시작: 이 기기가 보던 모둠이 있으면 그대로 이어서 ───────── */
(async function boot() {
  syncClock();
  const last = device.last;
  if (last && ['day', 'night', 'briefing'].includes(device.view)) {
    teamId = makeId(last.grade, last.classNo, last.teamNo);
    team = await getTeam(teamId);
    if (team && device.unlocked?.[device.mode || 'day']) {
      ui.timeUpShown = timeUp();
      startTeamWatch();
      view = device.view === 'briefing' && team.storySeen ? (device.mode || 'day') : device.view;
      render(); return;
    }
    team = null; teamId = null;
  }
  if (last) Object.assign(ui.form, {grade: last.grade, classNo: last.classNo, teamNo: last.teamNo});
  view = 'home'; render();
  if (last) lookupTeam();
})();
