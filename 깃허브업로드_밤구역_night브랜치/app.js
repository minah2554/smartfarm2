import {CONFIG} from './config.js';
import {CONTENT as C} from './content.js';
import {HINTS, HINT_RULES} from './hints.js';
import {plantSvg, potSvg, svgToImage} from './plant.js';
import {launchGame} from './games.js';
import {sceneSvg} from './scene.js';
import {prologueScene} from './prologue.js';
import {drawCertificate, downloadCanvas, loadPhoto} from './cert.js';
import {getTeam, patchTeam, applyPatch, fetchTeams, watchTeams, watchTeam, deleteTeam, clearTeams, syncLabel, syncClock, now, SERVER_TIME, addHall, fetchHall, clearHall} from './sync.js';
import {sfx, isMuted, toggleMute, bgm} from './sound.js';
import * as NZ from './night/index.js';   // [NIGHT] 밤 구역 화면

/* ───────── 상태 ─────────
   기기(sf2-device) : 이 기기가 마지막으로 입장한 모둠, 보던 화면 (관리코드는 입장할 때마다 새로 확인)
   모둠 기록(team)  : 학년·반·모둠, 연구원 이름, 낮·밤 진행 → sync.js가 저장·공유 (어느 기기에서 입장해도 이어짐) */
const KEYS = Object.keys(C.missions), GAME_KEYS = Object.keys(C.games);
const STAGE = ['새싹', '줄기', '꽃봉오리', '꽃'], GROW_TO = ['새싹으로', '줄기로', '꽃봉오리로', '꽃으로'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const load = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? f; } catch { return f; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장이 막힌 브라우저 */ } };
const norm = (s, cp) => { let v = String(s).trim().replace(/\s+/g, '').toUpperCase(); if (cp) v = v.replace(/0/g, 'O'); return v; };
const cleanName = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, CONFIG.nameMaxLength);
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const toList = v => Array.isArray(v) ? v.filter(Boolean) : v && typeof v === 'object' ? Object.values(v).filter(Boolean) : [];   // Firebase가 배열을 객체로 돌려줄 때 대비
const makeId = (g, c, t) => `g${g}-c${c}-t${t}`;
const limitMs = mode => (CONFIG.missionMinutes?.[mode] || 35) * 60000;

let device = load('sf2-device', {last: null, view: 'home', mode: 'day'});
delete device.unlocked;   // 예전 버전에서 저장된 '출입 승인' 기록은 쓰지 않음
const saveDevice = () => store('sf2-device', device);
// 관리코드 통과 기록은 이 탭(세션)에만 — 새로고침하면 이어지고, 처음 화면으로 나가거나 브라우저를 닫으면 다시 물어봄
const session = {
  ok: m => { try { return sessionStorage.getItem('sf2-ok-' + m) === '1'; } catch { return false; } },
  set: m => { try { sessionStorage.setItem('sf2-ok-' + m, '1'); } catch { /* 무시 */ } },
  clear: () => { try { ['day', 'night'].forEach(m => sessionStorage.removeItem('sf2-ok-' + m)); } catch { /* 무시 */ } }
};

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
const usedMs = () => { const z = Z(); if (!z.startedAt || (z.finishedAt && z.finishedAt <= z.startedAt)) return 0; return Math.min(limitMs('day'), (z.finishedAt || now()) - z.startedAt); };
const teamLabel = (t = team) => t ? `${t.grade}학년 ${t.classNo}반 ${t.teamNo}모둠` : '';
/* 연구 점수 = 미션 + 시간 − 힌트 (content.js의 certificate.score) */
function scoreOf(t) {
  const z = t?.day || {}, S = C.certificate.score, tiers = C.certificate.tiers;
  const locks = KEYS.filter(k => z.done?.[k]).length, bonus = GAME_KEYS.filter(g => z.bonus?.[g]).length;
  const mission = locks * S.lock + bonus * S.bonus;
  let time = 0;
  if (z.finishedAt && z.startedAt) { const min = (z.finishedAt - z.startedAt) / 60000; time = (S.time.find(r => min <= r.within) || {points: 0}).points; }
  const hint = KEYS.reduce((a, k) => { const n = z.hints?.[k] || 0; return a + Math.min(n, 2) * S.hint + (n >= 3 ? S.answerHint : 0); }, 0);
  const total = Math.max(0, mission + time - hint);
  return {locks, bonus, mission, time, hint, total, tier: tiers.find(r => total >= r.min) || tiers[tiers.length - 1]};
}
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
  if (['home', 'day', 'night', 'briefing', 'prologue'].includes(v)) { device.view = v; saveDevice(); }
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
const LOGO = `<svg class="brand-logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0E3B39"/><circle cx="47" cy="17" r="7" fill="#FFD23F"/><path d="M12 50 V32 Q12 18 32 14 Q52 18 52 32 V50" fill="none" stroke="#E6FAF2" stroke-width="4" stroke-linecap="round"/><path d="M32 50 V36" stroke="#8BD450" stroke-width="4" stroke-linecap="round"/><path d="M32 38 C24 38 20 33 20 27 C27 27 32 31 32 38Z M32 36 C32 29 37 25 44 25 C44 31 40 36 32 36Z" fill="#8BD450"/><path d="M8 50 H56" stroke="#C79A6B" stroke-width="5" stroke-linecap="round"/></svg>`;
const siteFooter = () => `<footer class="site-foot">${LOGO}<span class="brand">스마트팜 바이오 랩</span><span class="ver">${esc(C.footer?.version || '')}</span><span class="note">${esc(C.footer?.note || '')}</span><span class="grow"></span><span class="sync">${esc(syncLabel())}</span><span class="copy">${esc(C.footer?.copyright || '')}</span></footer>`;
const homeBtn = () => `<button class="home-btn" data-home aria-label="처음 화면으로">🏠 처음으로</button>`;
function timerChip(mode) {
  const z = Z(mode);
  if (!z.startedAt) return '';
  const left = remaining(team, mode), fin = !!z.finishedAt;
  return `<span class="timer ${fin ? 'fin' : left <= 5 * 60000 ? 'hurry' : ''} ${left <= 0 && !fin ? 'over' : ''}" aria-label="남은 시간">${fin ? '✔ 완료' : '⏳'} <b id="clock">${fin ? (z.finishedAt - z.startedAt > 0 ? fmt(z.finishedAt - z.startedAt) : '') : fmt(left)}</b></span>`;
}
function topbar(mode) {
  const M = C.menu || {story: '스토리 영상', brief: '작전 설명', rules: '점수 안내'};
  const certReady = mode === 'day' && (isComplete() || timeUp());
  if (mode === 'night') {   // [NIGHT] 밤도 같은 상단 메뉴 3개 (스토리 영상 · 작전 설명 · 점수 안내)와 인증서 버튼
    const nReady = NZ.certReady(nightApi);
    return `<header class="topbar">${homeBtn()}<span class="team-badge">${esc(teamLabel())}</span>${timerChip(mode)}
    ${nReady ? `<button class="cert-btn" data-n-open="${NZ.certKind(nightApi)}">🏅 인증서</button>` : ''}
    <span class="grow"></span>${modeSwitch(mode)}${muteBtn()}<button class="text-btn" data-n-story>${esc(M.story)}</button><button class="text-btn" data-replay>${esc(M.brief)}</button><button class="text-btn" data-n-rules>${esc(M.rules)}</button></header>`;
  }
  return `<header class="topbar">${homeBtn()}<span class="team-badge">${esc(teamLabel())}</span>${timerChip(mode)}
    ${certReady ? `<button class="cert-btn" data-open="${isComplete() ? 'complete' : 'timeup'}">🏅 인증서</button>` : ''}
    <span class="grow"></span>${modeSwitch(mode)}${muteBtn()}${mode === 'day' ? `<button class="text-btn" data-prologue>${esc(M.story)}</button>` : ''}<button class="text-btn" data-replay>${esc(M.brief)}</button>${mode === 'day' ? `<button class="text-btn" data-rules>${esc(M.rules)}</button>` : ''}</header>`;
}

/* ───────── 1. 처음 화면 : 연구원 출입증 ───────── */
function homeView() {
  const f = ui.form, E = C.entry;
  const chips = (list, sel, key, unit) => list.map(i => `<button type="button" class="chip ${sel === i ? 'on' : ''}" data-pick="${key}" data-val="${i}">${i}${unit}</button>`).join('');
  const range = n => Array.from({length: n}, (_, i) => i + 1);
  const ready = f.grade && f.classNo && f.teamNo;
  const rec = ui.found;
  const recLine = rec ? `<p class="found">📂 ${esc(E.resume)} <small>낮 ${['done', 'bonus'].reduce((a, k) => a + Object.keys(rec.day?.[k] || {}).length, 0)}/6 · ${esc(statusText(rec, 'day'))} · 밤 ${esc(statusText(rec, 'night'))}</small></p>` : '';
  return `<main class="home">
    <section class="home-hero">
      <p class="kicker">${esc(E.kicker)}</p>
      <h1 class="logo">${E.title || '스마트팜<br>바이오 랩'}</h1>
      ${E.subtitle ? `<p class="subtitle">${esc(E.subtitle)}</p>` : ''}
      <p class="lead">${esc(E.lead)}</p>
      <button type="button" class="home-art" data-admin aria-label="교사용 대시보드 열기">${plantSvg(['water', 'carbon'], [], '', true)}</button>
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
      <label class="lbl">${f.mode === 'day' ? '☀️ 낮 구역' : '🌙 밤 구역'} 책임자 관리코드<input class="field pw-field" type="password" data-field="pw" value="${esc(f.pw)}" placeholder="${f.mode === 'day' ? '낮' : '밤'} 연구 책임자에게 받은 관리코드" autocomplete="off"></label>
      <p class="feedback" aria-live="polite">${esc(f.error)}</p>
      <button class="primary wide" type="submit" ${ready ? '' : 'disabled'}>${ready ? `${esc(E.enter)} · ${CONFIG.missionMinutes[f.mode]}분 시작` : '학년·반·모둠을 골라 주세요'}</button>
    </form>
  </main>${siteFooter()}`;
}

function passwordModal() {
  const kind = ui.pwFor, isAdmin = kind === 'admin', isDay = kind === 'day';
  return `<div class="overlay" data-backdrop><section class="modal pw ${isDay ? 'sunny' : isAdmin ? 'admin' : 'moony'}" role="dialog" aria-modal="true" aria-label="관리코드 입력">
    <button class="close ghost" data-close>닫기</button>
    <div class="pw-icon">${isAdmin ? '🛰️' : isDay ? '☀️' : '🌙'}</div>
    <h2>${isAdmin ? '교사용 대시보드' : isDay ? '낮 구역 출입 승인' : '밤 구역 출입 승인'}</h2>
    <form id="pw-form"><input class="code-input" name="pw" type="password" autocomplete="off" aria-label="관리코드" placeholder="${isAdmin ? '관리자 코드' : '책임자 관리코드'}" required>
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
      ${s.glitch ? `<h1 class="glitch" data-text="SYSTEM FAILURE">SYSTEM FAILURE</h1>` : ''}
      ${s.journey ? `<ol class="journey" aria-label="당의 여정">${(C.journey || []).map((j, i) => `<li class="j-${j.zone}"><span class="j-icon">${j.icon}</span><b>${esc(j.title)}</b><small>${esc(j.sub)}</small></li>${i < C.journey.length - 1 ? '<li class="j-arrow" aria-hidden="true">➜</li>' : ''}`).join('')}</ol>` : ''}
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

/* ───────── 2-1. 낮 구역 프롤로그 (영상 + 자막) ───────── */
function prologueView() {
  const P = C.prologue || [], i = Math.min(ui.pro || 0, P.length - 1), s = P[i], last = i === P.length - 1, replay = !!Z('day').introSeen;
  return `<main class="prologue">
    <section class="cine" aria-label="낮 구역 스토리 영상">
      <div class="cine-stage" data-pro-tap>${prologueScene(s.scene)}</div>
      <div class="cine-top"><span class="rec"></span><span class="ctag">${esc(s.tag)}</span><span class="grow"></span><button class="icon-btn" data-pro-mute aria-label="소리 ${isMuted() ? '켜기' : '끄기'}">${isMuted() ? '🔇' : '🔊'}</button>${timerChip('day')}</div>
      <div class="cine-sub" data-pro-tap><p class="sub-text" data-type="${esc(s.text)}"></p></div>
      <div class="cine-bar" aria-hidden="true">${P.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"><b></b></i>`).join('')}</div>
      <div class="cine-ctl">${i ? '<button class="ghost" data-pro="-1">◀ 이전</button>' : ''}<span class="grow"></span>
        ${replay && !last ? '<button class="text-btn" data-pro="skip">건너뛰기</button>' : ''}
        ${last ? `<button class="primary" data-pro="end">${team.storySeen ? '☀️ 낮 구역 입장' : `${esc((C.menu || {}).brief || '작전 설명')} 보기 ▶`}</button>` : '<button class="primary" data-pro="1">다음 ▶</button>'}</div>
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
  </main>${siteFooter()}`;
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
    timeText: complete ? (usedMs() > 0 ? `⏱ 미션 완료 ${fmt(usedMs())}` : '⏱ 미션 완료') : `⏱ 시간 종료 · 진행 ${n + bonusList().length}/6`};
}
const crewText = () => [team.leader ? `★ ${team.leader}` : '', ...toList(team.members)].filter(Boolean).join('  ');
const potCaption = () => `<p class="pot-crew">${esc(crewText())}</p><p class="pot-time">${esc(potOpts().timeText)}</p>`;
function certPanel() {
  const ready = ui.cert && !ui.certBusy;
  return `<div class="cert-box">${ready ? `<img class="cert-img" src="${ui.cert.url}" alt="연구 인증서 미리보기">` : '<div class="cert-wait">인증서를 만드는 중…</div>'}</div>
    <div class="row"><button class="primary" data-dl-cert ${ready ? '' : 'disabled'}>${esc(C.labels.download)}</button><button class="ghost" data-close>온실 보기</button></div>
    <p class="muted small">저장이 안 되는 기기라면 인증서 그림을 길게 눌러 저장하세요.</p>`;
}
function completeModal() {
  const named = !!Z().plantName;
  return `<div class="overlay" data-backdrop><section class="modal clear" role="dialog" aria-modal="true" aria-label="낮 구역 완전 복구">
    <div class="sunset" aria-hidden="true"></div>
    <p class="kicker">DAY CLEAR${usedMs() > 0 ? ` · ${fmt(usedMs())}` : ''}</p><h2>${esc(named ? `‘${Z().plantName}’이(가) 활짝 피었어요!` : C.completion)}</h2>${!named && C.completionStory ? `<p class="clear-story">${esc(C.completionStory)}</p>` : ''}
    ${named ? `${ui.cert?.photo ? `<p class="photo-note">📸 우리 식물이 실제로 이렇게 꽃을 피웠어요!</p>` : ''}${certPanel()}<button class="text-btn" data-rename>이름 다시 짓기</button>`
      : `<div class="pot-preview" id="pot-preview">${potSvg(potOpts(ui.nameDraft || ''))}</div>${potCaption()}
      <form id="name-form" class="code-form"><input id="plant-name" class="field" maxlength="8" value="${esc(ui.nameDraft || '')}" placeholder="식물 이름 (8글자까지)" aria-label="${esc(C.labels.name)}" required>
      <button class="primary" type="submit">이름표 꽂기</button></form><p class="feedback" aria-live="polite">${esc(ui.feedback)}</p>`}
  </section></div>`;
}
/* 낮 구역 첫 입장 안내: 인증서 점수·등급·시간 */
function rulesModal() {
  const S = C.certificate.score, T = C.certificate.tiers, ok = !!Z().rulesOk, min = CONFIG.missionMinutes.day;
  const maxMission = KEYS.length * S.lock + GAME_KEYS.length * S.bonus, maxTime = Math.max(...S.time.map(t => t.points));
  return `<div class="overlay" data-backdrop><section class="modal rules" role="dialog" aria-modal="true" aria-label="연구 인증서 안내">
    ${ok ? '<button class="close ghost" data-close>닫기</button>' : ''}
    <p class="kicker">FARM-OS 작전 안내 · 낮 구역</p>
    <h2>📋 연구 인증서는 이렇게 받아요</h2>
    <p class="rule-lead">제한 시간 <b>${min}분</b> — 타이머는 이미 흐르고 있어요! ⏳</p>
    <article class="rule-box"><h3>🎯 미션 완료 조건</h3>
      <ul><li>암호 장치 ${KEYS.length}개 + 보너스 게임 ${GAME_KEYS.length}개를 모두 성공하면 <b>식물 이름표</b>를 꽂고 <b>꽃 화분 기념사진 인증서</b>를 받아요.</li>
      <li>시간 안에 다 못 끝내도 괜찮아요. <b>키운 만큼</b> 인증서를 받아요.</li>
      <li>보너스 게임을 하나 성공할 때마다 식물에 <b>🍅 토마토</b>가 하나씩 열려요 (최대 ${GAME_KEYS.length}개).</li></ul></article>
    <article class="rule-box"><h3>🧮 연구 점수 계산 (최고 ${maxMission + maxTime}점)</h3>
      <table class="rule-table"><tbody>
        <tr><th>암호 장치 복구</th><td>1개당 <b>+${S.lock}</b>점</td><td class="muted">최대 ${KEYS.length * S.lock}점</td></tr>
        <tr><th>보너스 게임 성공</th><td>1개당 <b>+${S.bonus}</b>점</td><td class="muted">최대 ${GAME_KEYS.length * S.bonus}점</td></tr>
        <tr><th>완료 시간 보너스</th><td colspan="2">${S.time.map(t => `${t.within}분 안 <b>+${t.points}</b>`).join(' · ')}<br><small class="muted">모든 미션(장치+보너스)을 끝냈을 때만</small></td></tr>
        <tr><th>힌트 사용</th><td colspan="2">1·2단계 열 때마다 <b class="neg">−${S.hint}</b> · 3단계(정답) <b class="neg">−${S.answerHint}</b></td></tr>
      </tbody></table></article>
    <article class="rule-box"><h3>🏅 연구원 등급</h3>
      <div class="tier-row">${T.map(t => `<span class="tier"><b>${t.badge}</b>${esc(t.title)}<small>${t.min}점 이상</small></span>`).join('')}</div>
      <p class="muted small">⚡ ${C.certificate.speedMinutes}분 안에 모두 끝내면 인증서에 스피드 도장이 찍혀요.</p></article>
    ${ok ? '' : `<label class="agree"><input type="checkbox" id="rules-agree"> 확인했습니다</label>
    <button class="primary wide" data-rules-ok disabled>작전 시작!</button>`}
  </section></div>`;
}
function timeUpModal() {
  return `<div class="overlay" data-backdrop><section class="modal clear over" role="dialog" aria-modal="true" aria-label="시간 종료">
    <p class="kicker">TIME OVER</p><h2>${esc(C.timeUp)}</h2>
    <p>장치 복구 ${doneList().length}/3 · 보너스 ${bonusList().length}/3 · 우리 식물은 <b>${STAGE[doneList().length]}</b> 단계 · 연구 점수 <b>${scoreOf(team).total}점</b></p>
    ${certPanel()}</section></div>`;
}
function homeConfirm() {
  return `<div class="overlay" data-backdrop><section class="modal confirm" role="dialog" aria-modal="true" aria-label="처음 화면으로">
    <div class="pw-icon">🏠</div><h2>처음 화면으로 갈까요?</h2>
    <p>진행 기록은 저장돼요. 같은 학년·반·모둠으로 다시 입장하면 이어서 할 수 있어요.<br><b>타이머는 멈추지 않아요.</b></p>
    <div class="row"><button class="primary" data-go-home>처음으로</button><button class="ghost" data-close>계속하기</button></div></section></div>`;
}

/* ───────── 4. 밤 구역 ───────── */
// [NIGHT] 밤 구역 화면은 night/ 폴더에서 그려요. 모둠 기록·저장·타이머·상단 바는 이 앱 것을 그대로 넘겨줘요.
const nightApi = {
  get team() { return team; }, save, SERVER_TIME, now, render, go, sfx, isMuted, toggleMute, fmt, toList, esc, CONFIG, menu: C.menu,
  topbar: () => topbar('night'), timerChip, siteFooter, teamLabel: () => teamLabel(), checkCode, downloadCanvas,
  briefing: () => { ui.slide = 0; go('briefing'); }
};
function nightView() {
  if (!CONFIG.nightEnabled) return `<main class="night">
    ${topbar('night')}
    <section class="night-card"><div class="moon" aria-hidden="true"></div><p class="kicker">NIGHT ZONE</p><h1>밤의 온실</h1>
      <p>${esc(C.nightWaiting)}</p>
      <p class="muted">낮 구역 진행: 장치 ${doneList().length}/3 · 보너스 ${bonusList().length}/3 — 스위치를 해로 돌리면 낮 구역으로 이동해요.</p></section></main>${siteFooter()}`;
  return NZ.view(nightApi);   // [NIGHT]
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
    : (() => {   // 밤: 미션·보너스 개수는 config.js의 nightSlots (밤 구역이 정함)
        const got = [...Object.keys(z.done || {}), ...Object.keys(z.bonus || {})];
        const slots = Math.max(got.length, Number(CONFIG.nightSlots) || 0);
        return Array.from({length: slots}, (_, i) => ['●', i < got.length, got[i] || '']);
      })();
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
    const crew = [t.leader ? `★ ${esc(t.leader)}` : '', ...toList(t.members).map(esc)].filter(Boolean).join(' · ');
    return `<article class="team-card ${t.day?.finishedAt ? 'clear' : ''}">
      <header><h3>${t.teamNo}모둠</h3><span class="mode-tag m-${t.mode === 'night' ? 'night' : 'day'}">${where}</span></header>
      <p class="crew">${crew || '<span class="muted">이름 없음</span>'}</p>
      ${zoneRow(t, 'day')}${zoneRow(t, 'night')}
      <footer><span>힌트 ${KEYS.map(k => `${C.missions[k].icon}${t.day?.hints?.[k] || 0}`).join(' ')}</span><span class="pts">🏅 ${scoreOf(t).total}점</span>${t.day?.plantName ? `<span>🌸 ${esc(t.day.plantName)}</span>` : ''}<span class="grow"></span><span>${ago < 60 ? `${ago}초 전` : `${Math.round(ago / 60)}분 전`}</span>
        <button class="del" data-del="${esc(t.id)}">${ui.armed === t.id ? '정말 삭제?' : '기록 삭제'}</button></footer></article>`;
  };
  return `<main class="admin ${ui.adminBig ? 'big' : ''}">
    <header class="topbar"><span class="team-badge">🛰️ 교사용 대시보드</span><span class="muted small">${esc(syncLabel())}</span><span class="grow"></span>
      <button class="ghost ${ui.adminHall ? 'on' : ''}" data-hall-toggle aria-expanded="${!!ui.adminHall}">🏛️ 명예의 전당</button><button class="ghost" data-big>${ui.adminBig ? '보통 크기' : '모니터 크게'}</button><button class="ghost" data-exit-admin>나가기</button></header>
    <section class="summary">
      <div><b>${list.length}</b><span>접속 모둠</span></div>
      <div class="d"><b>${count('day', z => z.startedAt && !z.finishedAt && remaining({day: z}, 'day') > 0)}</b><span>☀️ 낮 진행 중</span></div>
      <div class="d"><b>${count('day', z => z.finishedAt)}</b><span>☀️ 낮 완료</span></div>
      <div class="n"><b>${count('night', z => z.startedAt && !z.finishedAt && remaining({night: z}, 'night') > 0)}</b><span>🌙 밤 진행 중</span></div>
      <div class="n"><b>${count('night', z => z.finishedAt)}</b><span>🌙 밤 완료</span></div></section>
    ${ui.adminHall ? hallPanel() : ''}
    <nav class="filters"><button class="chip ${ui.adminFilter === 'all' ? 'on' : ''}" data-filter="all">전체 반</button>${groups.map(g => { const [gr, c] = g.split('-'); return `<button class="chip ${ui.adminFilter === g ? 'on' : ''}" data-filter="${g}">${gr}학년 ${c}반</button>`; }).join('')}</nav>
    ${shown.length ? shown.map(g => { const [gr, c] = g.split('-'); const teams = list.filter(t => groupKey(t) === g).sort((a, b) => a.teamNo - b.teamNo);
      return `<section class="class-block"><h2>${gr}학년 ${c}반 <small>${teams.length}모둠 · 낮 완료 ${teams.filter(t => t.day?.finishedAt).length} · 밤 완료 ${teams.filter(t => t.night?.finishedAt).length}</small></h2><div class="team-grid">${teams.map(card).join('')}</div></section>`; }).join('')
      : `<section class="empty"><p>아직 입장한 모둠이 없어요.</p><p class="muted">학생 기기에서 출입증을 발급하고 입장하면 여기에 실시간으로 나타나요.</p></section>`}
    <p class="reset-row"><button class="text-btn" data-clear-hall>${ui.armed === 'hall' ? '한 번 더 누르면 명예의 전당이 지워져요' : '명예의 전당 기록 지우기'}</button><button class="text-btn" data-clear-all>${ui.armed === '*' ? '한 번 더 누르면 모든 기록이 지워져요' : '모든 모둠 기록 지우기'}</button></p>
  </main>${siteFooter()}`;
}

/* 교사용 대시보드: 명예의 전당 (컬러 터치 모드별 전체 순위) */
function hallPanel() {
  const G = C.games.color, rows = ui.hallData;
  const when = at => { if (!at) return ''; const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const col = m => { const list = (rows || []).filter(e => e && e.mode === m.key).sort((x, y) => y.score - x.score || (x.at || 0) - (y.at || 0));
    return `<article class="hall-col"><h3>${esc(m.label)} <small>${m.duration || G.duration}초 · 목표 ${m.goal}점 · ${list.length}개 기록</small></h3>
      ${list.length ? `<ol class="hall">${list.map((e, i) => `<li><b class="rk">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</b><span class="nm">${esc(e.name)}</span><span class="tm">${esc(e.team || '')}${e.at ? ` · ${when(e.at)}` : ''}</span><b class="sc">${e.score}점</b></li>`).join('')}</ol>` : '<p class="hall-empty">아직 기록이 없어요.</p>'}</article>`; };
  return `<section class="hall-panel"><header><h2>🏛️ 명예의 전당 · ${esc(G.title)}</h2><span class="grow"></span><button class="text-btn" data-hall-refresh>새로고침</button></header>
    ${rows ? `<div class="hall-cols">${G.modes.map(col).join('')}</div>` : '<p class="hall-empty">불러오는 중…</p>'}</section>`;
}
async function loadHall() { ui.hallData = await fetchHall('color'); if (view === 'admin' && ui.adminHall) render(); }

/* ───────── 렌더 ───────── */
function render() {
  if (view !== 'prologue') { clearInterval(proType); clearTimeout(proNext); bgm.stop('prologue'); } else bgm.start('prologue');   // 스토리 영상에서만 배경음악
  if (view !== 'admin' && stopWatch) { stopWatch(); stopWatch = null; }
  document.body.dataset.view = view;
  if (team && isComplete() && !Z().finishedAt) checkComplete();   // 다른 기기에서 마지막 미션을 끝낸 경우
  let html = '';
  if (view === 'home') html = homeView();
  else if (view === 'briefing') html = briefingView();
  else if (view === 'prologue') html = prologueView();
  else if (view === 'day') {
    if (!Z().rulesOk && !ui.modal && !timeUp()) ui.modal = 'rules';   // 낮 구역 첫 입장 → 인증서 안내
    html = dayView();
    if (ui.modal === 'complete') html += completeModal();
    else if (ui.modal === 'timeup') html += timeUpModal();
    else if (ui.modal === 'home') html += homeConfirm();
    else if (ui.modal === 'rules') html += rulesModal();
    else if (ui.modal) html += lockModal(ui.modal);
  } else if (view === 'night') html = nightView() + (ui.modal === 'home' ? homeConfirm() : '');
  else if (view === 'admin') html = adminView();
  if (ui.pwFor) html += passwordModal();
  app.innerHTML = html;
  ui.grow = false;
  bind();
  if (view === 'night' && CONFIG.nightEnabled) NZ.bind(app, nightApi);   // [NIGHT]
  if (view === 'briefing') typeText();
  if (view === 'prologue') playPrologue();
  if (view === 'day' && !ui.modal) startTicker();
  const focus = app.querySelector('.modal .code-input'); if (focus && !ui.solved) focus.focus();
}

/* 1초마다: 타이머 숫자, 시간 종료 감지, 대시보드 남은 시간 */
function tick() {
  if (view === 'admin') {
    app.querySelectorAll('[data-tl]').forEach(el => { const t = teamsCache[el.dataset.tl]; if (t) el.textContent = statusText(t, el.dataset.mode); });
    return;
  }
  if (!team || !['day', 'night', 'briefing', 'prologue'].includes(view)) return;
  const mode = view === 'briefing' ? (device.mode || 'day') : view === 'prologue' ? 'day' : view;
  const el = document.getElementById('clock'), z = Z(mode);
  if (el && z.startedAt && !z.finishedAt) {
    const left = remaining(team, mode); el.textContent = fmt(left);
    el.parentElement.classList.toggle('hurry', left <= 5 * 60000);
  }
  if (view === 'night' && CONFIG.nightEnabled) NZ.tick(nightApi);   // [NIGHT] 밤 시간 종료 감지
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
  typeTimer = setInterval(() => { i += 2; el.textContent = full.slice(0, i); if (i % 6 === 0) sfx.type(); if (i >= full.length) { el.textContent = full; clearInterval(typeTimer); } }, 28);
}
/* 프롤로그: 자막을 한 글자씩 → 다 나오면 잠시 뒤 다음 장면 (마지막 장면은 버튼을 눌러야 넘어감) */
let proType = null, proNext = null;
function playPrologue() {
  clearInterval(proType); clearTimeout(proNext);
  const el = app.querySelector('.sub-text'); if (!el) return;
  const full = el.dataset.type, last = (ui.pro || 0) >= (C.prologue || []).length - 1; let i = 0;
  const finish = () => {
    clearInterval(proType); proType = null; el.textContent = full; el.classList.add('done');
    const bar = app.querySelector('.cine-bar .on b'); const hold = Math.min(7000, 2600 + full.length * 45);
    if (bar) { bar.style.animationDuration = hold + 'ms'; bar.classList.add('run'); }
    if (!last) proNext = setTimeout(() => stepPrologue(1), hold);
  };
  ui.proFinish = finish;
  proType = setInterval(() => { i += 1; el.textContent = full.slice(0, i); if (i % 5 === 0) sfx.type(); if (i >= full.length) finish(); }, 42);
}
function stepPrologue(d) {
  clearInterval(proType); clearTimeout(proNext);
  const P = C.prologue || [];
  ui.pro = Math.max(0, Math.min(P.length - 1, (ui.pro || 0) + d)); render();
}
function endPrologue() {
  clearInterval(proType); clearTimeout(proNext);
  if (!Z('day').introSeen) save({'day/introSeen': true});
  if (!team.storySeen) { ui.slide = 0; go('briefing'); } else go('day');
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
    f.members = Array.from({length: CONFIG.memberMax}, (_, i) => toList(ui.found.members)[i] || '');
  }
  render();
}

function startTeamWatch() {
  stopTeamWatch?.();
  stopTeamWatch = watchTeam(teamId, async () => {
    if (!team) return;
    const rec = await getTeam(teamId);
    if (!rec) {   // 선생님이 대시보드에서 이 모둠 기록을 지운 경우 → 처음 화면으로
      if (['day', 'night', 'briefing', 'prologue'].includes(view)) { goHome(); ui.found = null; ui.form.error = '선생님이 이 모둠 기록을 초기화했어요. 출입증을 다시 확인하고 입장하세요.'; render(); }
      return;
    }
    const sig = r => JSON.stringify([r.day, r.night, r.leader, r.members, r.storySeen]);
    if (sig(rec) === sig(team)) { team = rec; return; }
    team = rec;
    const typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && app.contains(document.activeElement);
    if (!typing && !document.querySelector('.game-layer') && view !== 'briefing' && view !== 'prologue' && !(view === 'night' && NZ.busy())) render();   // [NIGHT] 밤 스토리 영상 중에는 다시 그리지 않음
  });
}

/* 관리코드 확인: Vercel 서버(api/verify.js)에 물어본다. 코드는 브라우저에 내려오지 않음.
   내 컴퓨터(localhost)에서 서버 없이 미리 볼 때만 확인을 건너뜀 */
async function checkCode(kind, code) {
  const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) || location.protocol === 'file:';
  try {
    const r = await fetch(CONFIG.codeCheckURL || '/api/verify', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({kind, code})});
    if (r.ok) { const j = await r.json(); return j.ok ? 'ok' : 'wrong'; }
    if (local) return 'ok';
    return 'server';
  } catch { return local ? 'ok' : 'server'; }
}
const codeMsg = (res, kind) => res === 'server' ? '관리코드 확인 서버에 연결하지 못했어요. 인터넷 연결을 확인하거나 잠시 뒤 다시 눌러 주세요.'
  : `${kind === 'admin' ? '대시보드' : kind === 'day' ? '낮 구역' : '밤 구역'} 관리코드가 맞지 않아요. 연구 책임자(선생님)께 확인하세요.`;
let checking = false;

async function enterTeam() {
  const f = ui.form;
  f.leader = cleanName(f.leader); f.members = f.members.map(cleanName);
  if (!f.leader) { f.error = '대표 연구원(팀장) 이름을 적어 주세요.'; sfx.error(); render(); return; }
  // 관리코드는 처음 화면에서 입장할 때마다 확인 (이 기기에 기억하지 않음)
  if (checking) return;
  checking = true; const res = await checkCode(f.mode, f.pw); checking = false;
  if (res !== 'ok') { f.error = codeMsg(res, f.mode); f.pw = ''; sfx.error(); render(); return; }
  session.set(f.mode);
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
  if (mode === 'day' && !Z('day').introSeen && !team.storySeen) { ui.pro = 0; go('prologue'); return; }   // 낮 구역 첫 입장 → 프롤로그 영상
  if (mode === 'night' && CONFIG.nightEnabled && !Z('night').introSeen) { NZ.startPrologue(); go('night'); return; }   // [NIGHT] 밤 첫 입장 → 밤 스토리 영상
  if (!team.storySeen) { ui.slide = 0; go('briefing'); } else go(mode);
}
function pickModeInGame(kind) {
  const cur = view === 'night' ? 'night' : 'day';
  if (kind === cur) return;
  sfx.tap();
  ui.pwFor = kind; ui.pwError = ''; render();   // 다른 구역으로 옮길 때도 그 구역 관리코드 확인
}
function openLock(k) {
  if (timeUp()) { toast('시간이 끝났어요. 인증서를 받아 보세요!'); sfx.error(); return; }
  ui.modal = k; ui.tab = 'result'; ui.feedback = ''; ui.solved = null; sfx.tap(); render();
}
function closeModal() {
  const was = ui.modal;
  if (was === 'rules' && !Z().rulesOk) return;   // '확인했습니다'를 체크해야 넘어감
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
  const people = [team.leader, ...toList(team.members)].filter(Boolean);
  launchGame(g, key => {
    if (timeUp()) return;
    if (!Z().bonus?.[key]) { save({[`day/bonus/${key}`]: SERVER_TIME}); ui.grow = true; sfx.clear(); checkComplete(); }
    if (isComplete() && !Z().plantName) openCertModal('complete'); else render();
  }, {people, leader: team.leader, teamLabel: `${team.classNo}반 ${team.teamNo}모둠`, teamId, addHall, fetchHall});
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
  const sc = scoreOf(team), tier = {badge: sc.tier.badge, title: `${sc.tier.title} · ${sc.total}점`};
  const d = new Date(), o = potOpts();
  try {
    const canvas = await drawCertificate({
      title: C.certificate.title, tier, complete, photo: photo?.img || null, speed: complete && usedMs() <= C.certificate.speedMinutes * 60000,
      plantName: o.plantName, tagText: o.tagText, leader: team.leader, members: toList(team.members), teamLabel: teamLabel(),
      stage: locks, bonus: bonusList(), timeText: o.timeText,
      scoreText: `연구 점수 ${sc.total}점 = 미션 ${sc.mission} + 시간 ${sc.time} − 힌트 ${sc.hint}`,
      statsText: `암호 장치 ${locks}/3 · 보너스 게임 ${bonus}/3 · 🍅 토마토 ${Math.min(3, bonus)}개`,
      dateText: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    });
    ui.cert = {canvas, url: canvas.toDataURL('image/png'), photo: !!photo};
  } catch { ui.cert = null; }
  ui.certBusy = false;
  if (ui.modal === 'complete' || ui.modal === 'timeup') render();
}

function goHome() {
  session.clear();
  stopTeamWatch?.(); stopTeamWatch = null;
  const t = team;
  ui.modal = null; ui.form = blankForm(); ui.found = t && t.grade ? t : null;
  if (t) Object.assign(ui.form, {grade: t.grade, classNo: t.classNo, teamNo: t.teamNo, leader: t.leader || '', mode: device.mode || 'day',
    members: Array.from({length: CONFIG.memberMax}, (_, i) => toList(t.members)[i] || '')});
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
  $('[data-pro-mute]')?.addEventListener('click', e => { const m = toggleMute(), b = e.currentTarget; b.textContent = m ? '🔇' : '🔊'; b.setAttribute('aria-label', `소리 ${m ? '켜기' : '끄기'}`); });
  $$('[data-close]').forEach(b => b.onclick = () => { if (ui.pwFor) { ui.pwFor = null; render(); } else closeModal(); });
  $$('[data-backdrop]').forEach(o => o.addEventListener('click', e => { if (e.target === o) { if (ui.pwFor) { ui.pwFor = null; render(); } else closeModal(); } }));
  $('[data-home]')?.addEventListener('click', () => { ui.modal = 'home'; sfx.tap(); render(); });
  $('[data-go-home]')?.addEventListener('click', goHome);

  $('#pw-form')?.addEventListener('submit', async e => {
    e.preventDefault(); const kind = ui.pwFor, input = e.currentTarget.elements.pw;
    if (checking) return;
    checking = true; const res = await checkCode(kind, input.value); checking = false;
    if (res !== 'ok') { ui.pwError = codeMsg(res, kind); sfx.error(); render(); shake(); return; }
    ui.pwFor = null; sfx.unlock();
    if (kind === 'admin') { openAdmin(); return; }
    session.set(kind); enterMode(kind);
  });

  // 브리핑
  $$('[data-brief]').forEach(b => b.onclick = () => {
    const v = b.dataset.brief; sfx.tap();
    if (v === 'go') { if (!team.storySeen) save({storySeen: true}); go(device.mode || 'day'); return; }
    ui.slide = Math.max(0, Math.min(C.briefing.length - 1, ui.slide + Number(v))); render();
  });
  $('[data-rules]')?.addEventListener('click', () => { ui.modal = 'rules'; sfx.tap(); render(); });
  $('#rules-agree')?.addEventListener('change', e => { const b = $('[data-rules-ok]'); if (b) b.disabled = !e.target.checked; });
  $('[data-rules-ok]')?.addEventListener('click', () => { if (!$('#rules-agree')?.checked) return; save({'day/rulesOk': true}); ui.modal = null; sfx.unlock(); render(); });
  $$('[data-pro]').forEach(b => b.onclick = () => { const v = b.dataset.pro; sfx.tap(); if (v === 'end' || v === 'skip') endPrologue(); else stepPrologue(Number(v)); });
  $$('[data-pro-tap]').forEach(el => el.onclick = () => { if (proType) ui.proFinish?.(); else if ((ui.pro || 0) < (C.prologue || []).length - 1) stepPrologue(1); });
  $('[data-prologue]')?.addEventListener('click', () => { ui.pro = 0; ui.modal = null; go('prologue'); });
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

  // 대시보드
  $$('[data-filter]').forEach(b => b.onclick = () => { ui.adminFilter = b.dataset.filter; render(); });
  $('[data-big]')?.addEventListener('click', () => { ui.adminBig = !ui.adminBig; render(); });
  $('[data-hall-toggle]')?.addEventListener('click', () => { ui.adminHall = !ui.adminHall; if (ui.adminHall) { ui.hallData = null; loadHall(); } render(); });
  $('[data-hall-refresh]')?.addEventListener('click', () => { ui.hallData = null; render(); loadHall(); });
  $('[data-exit-admin]')?.addEventListener('click', () => { stopWatch?.(); stopWatch = null; go('home'); });
  const arm = key => { ui.armed = key; render(); setTimeout(() => { if (ui.armed === key) { ui.armed = null; if (view === 'admin') render(); } }, 3000); };
  $$('[data-del]').forEach(b => b.onclick = async () => {
    const id = b.dataset.del;
    if (ui.armed !== id) { arm(id); return; }
    ui.armed = null; await deleteTeam(id); delete teamsCache[id]; render();
  });
  $('[data-clear-hall]')?.addEventListener('click', async () => {
    if (ui.armed !== 'hall') { arm('hall'); return; }
    ui.armed = null; await clearHall(); if (ui.adminHall) ui.hallData = []; render();
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
  if (last && ['day', 'night', 'briefing', 'prologue'].includes(device.view)) {
    teamId = makeId(last.grade, last.classNo, last.teamNo);
    team = await getTeam(teamId);
    if (team && session.ok(device.mode || 'day')) {
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
