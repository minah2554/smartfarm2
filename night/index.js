/* [NIGHT] 🌙 밤 구역 — 낮 구역과 같은 앱 안에서 돌아가는 밤 화면
   app.js가 넘겨주는 api(모둠 기록·저장·타이머·상단 바·관리코드 확인)를 그대로 써요.
   - 모둠 선택·타이머·대시보드·Firebase는 낮 앱 것 (밤에서 따로 만들지 않음)
   - 기록은 api.save()로 'night/…' 경로 조각만 저장
   - 정답·문구는 night-content.js, 힌트는 night-hints.js
   화면: 🎬 스토리 영상(처음 한 번) → 작전 설명 → 점수 안내 → 밤의 온실(지도) → 장치를 누르면 나이트 미션 원래 화면(mission.js)
         → LOCK 4~8 → 보너스 '모두의 온기' → 06:00 엔딩 · 인증서 */
import {NIGHT as N} from './night-content.js';
import {nightSceneSvg} from './night-scene.js';
import * as MS from './mission.js';
import {drawNightCertificate} from './night-cert.js';

// 밤 전용 디자인(night.css)은 이 파일이 불러와요 — 낮 style.css는 고치지 않아요
(() => { if (document.querySelector('link[data-night-css]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./night.css', import.meta.url).href; l.dataset.nightCss = '1'; document.head.append(l); })();

const KEYS = Object.keys(N.missions), GAME_KEYS = Object.keys(N.games);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const limitMs = A => (A.CONFIG.missionMinutes?.night || 35) * 60000;

/* 화면 상태 (기록이 아닌 것만 — 기록은 모두 모둠 기록 team.night) */
const nui = {teamId: null, screen: null, pro: 0, modal: null, timeUpShown: false, cert: null, certBusy: false};
let A = null;   // 마지막으로 받은 api

/* ── 모둠 기록 읽기 ── */
const T = () => A?.team;
const Z = () => T()?.night || {};
const done = k => !!Z().done?.[k];
const cpDone = k => !!Z().checkpoint?.[k];
const doneList = () => KEYS.filter(done);
const bonusList = () => GAME_KEYS.filter(g => Z().bonus?.[g]);
const isComplete = () => doneList().length === KEYS.length && bonusList().length === GAME_KEYS.length;
const canOpen = k => (N.missions[k].requires || []).every(done);
const sceneState = (dawn = false) => ({done: doneList(), bonus: bonusList(), open: canOpen, keys: KEYS, dawn});
const timeUp = () => !!Z().startedAt && !Z().finishedAt && remaining() <= 0;
const remaining = () => { const z = Z(); if (!z.startedAt) return limitMs(A); return z.startedAt + limitMs(A) - (z.finishedAt || A.now()); };
const usedMs = () => { const z = Z(); if (!z.startedAt || (z.finishedAt && z.finishedAt <= z.startedAt)) return 0; return Math.min(limitMs(A), (z.finishedAt || A.now()) - z.startedAt); };
const fragOf = k => (done(k) || (k === 'plan' && cpDone('plan'))) ? N.missions[k].frag : '';
const frags = () => KEYS.map(fragOf);

/* 밤 연구 점수 = 장치 + 보너스 + 시간 − 힌트 (night-content.js의 certificate.score) */
export function nightScore(t) {
  const z = t?.night || {}, S = N.certificate.score, tiers = N.certificate.tiers;
  const locks = KEYS.filter(k => z.done?.[k]).length, bonus = GAME_KEYS.filter(g => z.bonus?.[g]).length;
  const mission = locks * S.lock + bonus * S.bonus;
  let time = 0;
  if (z.finishedAt && z.startedAt) { const min = (z.finishedAt - z.startedAt) / 60000; time = (S.time.find(r => min <= r.within) || {points: 0}).points; }
  const hint = KEYS.reduce((a, k) => { const n = z.hints?.[k] || 0; return a + Math.min(n, 2) * S.hint + (n >= 3 ? S.answerHint : 0); }, 0);
  const total = Math.max(0, mission + time - hint);
  return {locks, bonus, mission, time, hint, total, tier: tiers.find(r => total >= r.min) || tiers[tiers.length - 1]};
}

/* ── app.js가 쓰는 함수 ── */
export const certReady = api => { A = api; return !!Z().startedAt && (isComplete() || timeUp()); };
export const certKind = api => { A = api; return isComplete() ? 'complete' : 'timeup'; };
export const busy = () => nui.screen === 'prologue' || MS.isOpen();
export function startPrologue() { nui.screen = 'prologue'; nui.pro = 0; nui.modal = null; }
export function tick(api) {
  A = api;
  if (timeUp() && !nui.timeUpShown) {
    nui.timeUpShown = true;
    MS.close(true);
    if (nui.screen !== 'prologue') { A.sfx.error(); openCert('timeup'); }
  }
}

/* ───────── 화면 그리기 ───────── */
const FLO = (alert = true) => { const glow = alert ? '#FF8FC2' : '#8BD450', screen = alert ? '#3A1730' : '#0F3A26';
  const eyes = alert ? `<rect x="48" y="70" width="18" height="8" rx="4" fill="${glow}"/><rect x="84" y="70" width="18" height="8" rx="4" fill="${glow}"/><path d="M58 102 Q75 94 92 102" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    : `<path d="M48 76 Q57 66 66 76" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M84 76 Q93 66 102 76" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M56 96 Q75 112 94 96" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `<svg class="flo" viewBox="0 0 150 150" aria-hidden="true"><ellipse cx="75" cy="140" rx="40" ry="5" fill="${glow}" opacity=".25"/><path d="M75 30 C75 16 86 8 100 10 C98 24 88 30 75 30 Z" fill="#8BD450"/><line x1="75" y1="30" x2="75" y2="40" stroke="#8BD450" stroke-width="4"/><rect x="24" y="40" width="102" height="86" rx="24" fill="#E9ECFF" stroke="#9AA7FF" stroke-width="3"/><rect x="36" y="52" width="78" height="62" rx="14" fill="${screen}"/>${eyes}<rect x="44" y="126" width="8" height="10" rx="3" fill="#9AA7FF"/><rect x="98" y="126" width="8" height="10" rx="3" fill="#9AA7FF"/><circle cx="118" cy="46" r="6" fill="${alert ? '#FF5A4E' : '#8BD450'}"/></svg>`; };

/* 🎬 마지막 장면(작전 개시) 애니메이션: 경보등 → LOCK 4~8 오류 패널이 하나씩 → 22:00→06:00 카운트다운 → 명령어 조각 5칸 */
function missionArt() {
  const M = KEYS.map(k => N.missions[k]), R = '#FF5A6E', G = '#8BD450', L = '#9AA7FF';
  const panels = M.map((m, i) => { const y = 50 + i * 86, b = (0.6 + i * 0.45).toFixed(2);
    return `<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="${b}s" dur=".35s" fill="freeze"/>
      <animateTransform attributeName="transform" type="translate" from="60 0" to="0 0" begin="${b}s" dur=".45s" fill="freeze"/>
      <rect x="930" y="${y}" width="560" height="74" rx="14" fill="#14163A" stroke="${R}" stroke-width="3"><animate attributeName="stroke-opacity" values="1;.35;1" dur="1s" begin="${b}s" repeatCount="indefinite"/></rect>
      <text x="965" y="${y + 47}" font-size="34">${m.icon}</text>
      <text x="1020" y="${y + 33}" font-size="18" font-weight="700" fill="${L}" font-family="monospace" letter-spacing="2">${m.lock} · ${m.time}</text>
      <text x="1020" y="${y + 60}" font-size="24" font-weight="700" fill="#E6E8FF">${esc(m.title)}</text>
      <rect x="1370" y="${y + 22}" width="98" height="30" rx="15" fill="${R}"><animate attributeName="opacity" values="1;.3;1" dur=".8s" begin="${b}s" repeatCount="indefinite"/></rect>
      <text x="1419" y="${y + 43}" text-anchor="middle" font-size="16" font-weight="900" fill="#fff" font-family="monospace">ERROR</text></g>`; }).join('');
  const slots = [0, 1, 2, 3, 4].map(i => { const x = 150 + i * 120, b = (3.1 + i * 0.18).toFixed(2);
    return `<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="${b}s" dur=".3s" fill="freeze"/>
      <rect x="${x}" y="345" width="96" height="92" rx="18" fill="#FFE9A810" stroke="#FFE9A8" stroke-width="3" stroke-dasharray="10 7"><animate attributeName="stroke-dashoffset" from="0" to="34" dur="1.2s" repeatCount="indefinite"/></rect>
      <text x="${x + 48}" y="409" text-anchor="middle" font-size="50" font-weight="900" fill="#FFE9A8"><animate attributeName="opacity" values=".35;1;.35" dur="1.6s" begin="${(i * 0.2).toFixed(1)}s" repeatCount="indefinite"/>?</text>
      <text x="${x + 48}" y="366" text-anchor="middle" font-size="14" fill="${L}" font-family="monospace">L${i + 4}</text></g>`; }).join('');
  const stars = [[80, 60], [260, 40], [420, 90], [700, 30], [860, 70], [1540, 50], [1180, 40], [40, 300], [1570, 420]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 2 : 3}" fill="#fff"><animate attributeName="opacity" values=".2;1;.2" dur="${2 + i % 3}s" repeatCount="indefinite"/></circle>`).join('');
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" font-family="'LotteMartDream',sans-serif">
    <defs><radialGradient id="msBg" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#3B3F8F"/><stop offset="1" stop-color="#070918"/></radialGradient>
      <radialGradient id="msSiren"><stop offset="0" stop-color="${R}" stop-opacity=".55"/><stop offset="1" stop-color="${R}" stop-opacity="0"/></radialGradient></defs>
    <rect width="1600" height="900" fill="url(#msBg)"/>
    <g stroke="#9AA7FF" stroke-opacity=".07">${Array.from({length: 21}, (_, i) => `<line x1="${i * 80}" y1="0" x2="${i * 80}" y2="900"/>`).join('')}${Array.from({length: 12}, (_, i) => `<line x1="0" y1="${i * 80}" x2="1600" y2="${i * 80}"/>`).join('')}</g>
    ${stars}
    <circle cx="430" cy="150" r="220" fill="url(#msSiren)"><animate attributeName="r" values="170;250;170" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.4;1" dur="1.2s" repeatCount="indefinite"/></circle>
    <g transform="translate(330 20) scale(1.35)"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.4s" repeatCount="indefinite"/>${FLO(true).replace('<svg class="flo" viewBox="0 0 150 150" aria-hidden="true">', '').replace('</svg>', '')}</g></g>
    <text x="430" y="250" text-anchor="middle" font-size="24" font-weight="900" fill="#FF8FC2" letter-spacing="6">NIGHT MISSION</text>
    <g><text x="150" y="320" font-size="20" fill="${L}" font-family="monospace" letter-spacing="2">재가동 명령어 조각 0 / 5</text></g>
    ${slots}
    ${panels}
    <g transform="translate(150 470)">
      <text x="0" y="0" font-size="20" fill="${L}" font-family="monospace" letter-spacing="2">LAB TIME</text>
      <text x="0" y="50" font-size="44" font-weight="900" fill="#FFE9A8" font-family="monospace">22:00</text>
      <text x="560" y="50" text-anchor="end" font-size="44" font-weight="900" fill="${G}" font-family="monospace">06:00</text>
      <text x="280" y="44" text-anchor="middle" font-size="22" fill="#E6E8FF">→ 해가 뜨기 전에 재가동!</text>
      <rect x="0" y="72" width="560" height="14" rx="7" fill="#ffffff1a"/>
      <rect x="0" y="72" width="0" height="14" rx="7" fill="#FFD23F"><animate attributeName="width" from="0" to="560" begin="3.4s" dur="6s" fill="freeze"/></rect>
    </g>
    <rect x="0" y="0" width="1600" height="6" fill="#9AA7FF" opacity=".25"><animate attributeName="y" values="0;900" dur="3.5s" repeatCount="indefinite"/></rect>
  </svg>`;
}

export function view(api) {
  A = api;
  if (T()?.id !== nui.teamId) Object.assign(nui, {teamId: T()?.id, screen: null, pro: 0, modal: null, timeUpShown: false, cert: null});   // 다른 모둠으로 입장하면 화면 상태를 비움
  if (!Z().introSeen && nui.screen === null && !timeUp()) nui.screen = 'prologue';   // 새로고침해도 처음 입장이면 스토리 영상부터
  if (nui.screen === 'prologue') return prologueView();
  if (!Z().rulesOk && !nui.modal && !timeUp()) nui.modal = 'rules';
  if (timeUp() && !nui.modal && !nui.timeUpShown) { nui.timeUpShown = true; nui.modal = 'timeup'; buildCert(); }
  const n = doneList().length, all = n === KEYS.length, over = timeUp(), complete = isComplete();
  const html = `<main class="night nz">
    ${A.topbar()}
    <section class="hud nz-hud" aria-label="야간 장치 상태">${KEYS.map(k => { const m = N.missions[k], lk = !done(k) && !canOpen(k);
      return `<button type="button" class="res ${done(k) ? 'on' : ''} ${lk ? 'lock' : ''}" data-nlock="${k}" title="${esc(m.lock)} ${esc(m.title)}"><span class="res-icon">${m.icon}</span><span><b>${esc(m.lock)}</b><small>${done(k) ? '복구 ✓' : lk ? '잠김' : '차단됨'}</small></span></button>`; }).join('')}
      <button type="button" class="res growth ${bonusList().length ? 'on' : ''} ${done('plan') ? '' : 'lock'}" data-ngame="warmth"><span class="res-icon">${N.games.warmth.icon}</span><span><b>BONUS</b><small>${bonusList().length ? '성공 ✓' : done('plan') ? '열림' : '잠김'}</small></span></button></section>
    <section class="stage-wrap"><div class="stage ${over ? 'is-over' : ''}">
      ${nightSceneSvg(sceneState(complete), N.games)}
      ${over ? `<div class="over-band"><b>TIME OVER</b><button class="primary" data-nopen="timeup">🏅 인증서 받기</button></div>` : ''}
      <div class="toast" id="toast" role="status"></div>
    </div></section>
    <section class="ticker ${all ? 'ok' : ''}" aria-live="polite"><span class="ai">${esc(N.aiName)}</span><span id="ticker">${esc(all ? N.aiLines.allClear : N.aiLines.idle[tickIdx % N.aiLines.idle.length])}</span></section>
    <p class="howto">색이 다른 신호를 찾아 눌러 보세요 · LOCK 8은 LOCK 4~7을 모두 복구하면 열려요 · 재가동 명령어를 넣으면 재가동 코어에서 보너스 게임이 열려요</p>
  </main>${A.siteFooter()}`;
  return html + modalView();
}

function modalView() {
  const m = nui.modal;
  if (!m) return '';
  if (m === 'rules') return rulesModal();
  if (m === 'complete') return clearModal();
  if (m === 'timeup') return timeUpModal();
  return '';
}

/* 🎬 스토리 영상 */
function prologueView() {
  const P = N.prologue, i = Math.min(nui.pro, P.length - 1), s = P[i], last = i === P.length - 1, replay = !!Z().introSeen, muted = A.isMuted();
  const media = s.video ? `<video class="pro-video" playsinline autoplay preload="auto" ${muted ? 'muted' : ''} data-nvideo><source src="${N.assets}${esc(s.video)}.mp4" type="video/mp4"><source src="${N.assets}${esc(s.video)}.webm" type="video/webm"></video>` : '';
  const art = s.video ? `<div class="pro-art fallback" hidden>${FLO(true)}<p>NIGHT MISSION · LOCK 4–8</p></div>` : `<div class="pro-art mission">${missionArt()}</div>`;
  const who = s.who === 'twin' ? '<p class="who twin"><span>♥</span>바이오 트윈 #0214 <small>몸 시뮬레이터</small></p>' : `<p class="who flo"><span>◉</span>${esc(N.aiName)}</p>`;
  const nextLabel = (Z().introSeen && T()?.storySeen) ? '🌙 밤 구역 입장' : `${esc(A.menu?.brief || '작전 설명')} 보기 ▶`;
  return `<main class="prologue nz-pro">
    <section class="cine" aria-label="밤 구역 스토리 영상">
      <div class="cine-stage" data-npro-tap>${media}${art}</div>
      <div class="cine-top"><span class="rec"></span><span class="ctag">${esc(s.tag)}</span><span class="grow"></span><button class="icon-btn" data-npro-mute aria-label="소리 ${muted ? '켜기' : '끄기'}">${muted ? '🔇' : '🔊'}</button>${A.timerChip('night')}</div>
      <div class="cine-sub ${s.who === 'twin' ? 'twin' : ''}" data-npro-tap>${who}<p class="sub-text" data-type="${esc(s.text)}"></p></div>
      <div class="cine-bar" aria-hidden="true">${P.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"><b></b></i>`).join('')}</div>
      <div class="cine-ctl">${i ? '<button class="ghost" data-npro="-1">◀ 이전</button>' : ''}<span class="grow"></span>
        ${replay && !last ? '<button class="text-btn" data-npro="skip">건너뛰기</button>' : ''}
        ${last ? `<button class="primary" data-npro="end">${nextLabel}</button>` : '<button class="primary" data-npro="1">다음 ▶</button>'}</div>
    </section></main>`;
}

function rulesModal() {
  const S = N.certificate.score, Ti = N.certificate.tiers, ok = !!Z().rulesOk, min = A.CONFIG.missionMinutes.night;
  const maxMission = KEYS.length * S.lock + GAME_KEYS.length * S.bonus, maxTime = Math.max(...S.time.map(t => t.points));
  return `<div class="overlay nz-ov" data-nbackdrop><section class="modal rules nz-rules" role="dialog" aria-modal="true" aria-label="밤 구역 연구 인증서 안내">
    ${ok ? '<button class="close ghost" data-nclose>닫기</button>' : ''}
    <p class="kicker">${esc(N.rulesKicker)}</p>
    <h2>📋 밤 구역 연구 인증서는 이렇게 받아요</h2>
    <p class="rule-lead">제한 시간 <b>${min}분</b> — 타이머는 이미 흐르고 있어요! ⏳</p>
    <article class="rule-box"><h3>🎯 미션 완료 조건</h3>
      <ul><li>장치 ${KEYS.length}개(LOCK 4~8) + 보너스 게임 ${GAME_KEYS.length}개를 모두 성공하면 <b>06:00 재가동</b>과 함께 <b>밤 구역 연구 인증서</b>를 받아요.</li>
      <li>LOCK마다 <b>시스템 점검(A)</b>을 마치면 <b>코드 락(B)</b>이 열려요. 암호는 연구원 수첩에서 풀고, 넣기 전에 <b>검사원</b>이 모두의 수첩을 확인해요.</li>
      <li><b>태블릿은 LOCK마다 돌아가며 잡아요</b>: 모둠장부터 입장할 때 적은 이름 순서대로 화면에 담당자가 나와요.</li>
      <li>LOCK을 복구할 때마다 <b>재가동 명령어 조각</b>이 나와요. 수첩 1쪽 수집판에 적어 두세요.</li>
      <li>시간 안에 다 못 끝내도 괜찮아요. <b>복구한 만큼</b> 인증서를 받아요.</li></ul></article>
    <article class="rule-box"><h3>🧮 연구 점수 계산 (최고 ${maxMission + maxTime}점)</h3>
      <table class="rule-table"><tbody>
        <tr><th>장치 복구</th><td>1개당 <b>+${S.lock}</b>점</td><td class="muted">최대 ${KEYS.length * S.lock}점</td></tr>
        <tr><th>보너스 게임 성공</th><td>1개당 <b>+${S.bonus}</b>점</td><td class="muted">최대 ${GAME_KEYS.length * S.bonus}점</td></tr>
        <tr><th>완료 시간 보너스</th><td colspan="2">${S.time.map(t => `${t.within}분 안 <b>+${t.points}</b>`).join(' · ')}<br><small class="muted">모든 미션(장치+보너스)을 끝냈을 때만</small></td></tr>
        <tr><th>힌트 사용</th><td colspan="2">힌트를 1개 열 때마다 <b class="neg">−${S.hint}</b> (LOCK마다 힌트 2개)</td></tr>
      </tbody></table></article>
    <article class="rule-box"><h3>🏅 연구원 등급</h3>
      <div class="tier-row">${Ti.map(t => `<span class="tier"><b>${t.badge}</b>${esc(t.title)}<small>${t.min}점 이상</small></span>`).join('')}</div>
      <p class="muted small">⚡ ${N.certificate.speedMinutes}분 안에 모두 끝내면 인증서에 스피드 도장이 찍혀요.</p></article>
    ${ok ? '' : `<label class="agree"><input type="checkbox" id="nz-agree"> 확인했습니다</label>
    <button class="primary wide" data-nrules-ok disabled>작전 시작!</button>`}
  </section></div>`;
}

function certPanel() {
  const ready = nui.cert && !nui.certBusy;
  return `<div class="cert-box">${ready ? `<img class="cert-img" src="${nui.cert.url}" alt="밤 구역 연구 인증서 미리보기">` : '<div class="cert-wait">인증서를 만드는 중…</div>'}</div>
    <div class="row"><button class="primary" data-ndl ${ready ? '' : 'disabled'}>${esc(N.labels.download)}</button><button class="ghost" data-nclose>온실 보기</button></div>
    <p class="muted small">저장이 안 되는 기기라면 인증서 그림을 길게 눌러 저장하세요.</p>`;
}
function clearModal() {
  return `<div class="overlay nz-ov" data-nbackdrop><section class="modal clear nz-clear" role="dialog" aria-modal="true" aria-label="${esc(N.completion)}">
    <p class="kicker">NIGHT CLEAR${usedMs() > 0 ? ` · ${A.fmt(usedMs())}` : ''}</p><h2>${esc(N.completion)}</h2>
    <p class="clear-story">${esc(N.completionStory)}</p>${certPanel()}</section></div>`;
}
function timeUpModal() {
  const sc = nightScore(T());
  return `<div class="overlay nz-ov" data-nbackdrop><section class="modal clear over nz-clear" role="dialog" aria-modal="true" aria-label="시간 종료">
    <p class="kicker">TIME OVER</p><h2>${esc(N.timeUp)}</h2>
    <p>장치 복구 ${doneList().length}/${KEYS.length} · 보너스 ${bonusList().length}/${GAME_KEYS.length} · 연구 점수 <b>${sc.total}점</b></p>
    ${certPanel()}</section></div>`;
}

/* ───────── 동작 ───────── */
function render() { A.render(); }
function toast(msg) {
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}
function closeModal() {
  if (nui.modal === 'rules' && !Z().rulesOk) return;   // '확인했습니다'를 체크해야 넘어감
  nui.modal = null; render();
}
function checkComplete() { if (isComplete() && !Z().finishedAt) A.save({'night/finishedAt': A.SERVER_TIME}); }
/* 나이트 미션 원래 화면(mission.js)을 온실 위에 열어요 */
const hooks = {
  onClose: () => { if (isComplete()) nui.modal = null; render(); },
  checkComplete,
  buildCert: async () => { await buildCert(); return nui.cert; },
  download: cert => { const t = T(); A.downloadCanvas(cert.canvas, `smartfarm_night_certificate_${t.grade}-${t.classNo}-${t.teamNo}.png`); }
};
function openLock(k) {
  if (timeUp()) { toast('시간이 끝났어요. 인증서를 받아 보세요!'); A.sfx.error(); return; }
  if (!done(k) && !canOpen(k)) { toast(N.aiLines.lockedPlan); A.sfx.error(); return; }
  A.sfx.tap(); MS.open(A, k, hooks);
}
function startGame(g) {
  const cfg = N.games[g];
  if (timeUp()) { toast('시간이 끝났어요. 인증서를 받아 보세요!'); A.sfx.error(); return; }
  if (!done(cfg.unlockBy)) { toast(N.aiLines.lockedGame); A.sfx.error(); return; }
  A.sfx.tap();
  if (bonusList().includes(g)) MS.openEnding(A, hooks); else MS.openWarmth(A, hooks);
}
function openCert(kind) { nui.modal = kind; render(); buildCert(); }
async function buildCert() {
  nui.certBusy = true; nui.cert = null;
  const complete = isComplete(), sc = nightScore(T()), d = new Date(), t = T();
  try {
    const canvas = await drawNightCertificate({
      title: N.certificate.title, tier: {badge: sc.tier.badge, title: `${sc.tier.title} · ${sc.total}점`}, complete,
      speed: complete && usedMs() <= N.certificate.speedMinutes * 60000,
      sceneSvg: nightSceneSvg(sceneState(complete), N.games, {bare: true}),
      word: complete ? `"${N.missions.plan.answer.replace(/^(.)(..)(..)$/, '$1 $2 $3')}"` : '',
      leader: t.leader, members: A.toList(t.members), teamLabel: A.teamLabel(),
      timeText: complete ? (usedMs() > 0 ? `⏱ 미션 완료 ${A.fmt(usedMs())}` : '⏱ 미션 완료') : `⏱ 시간 종료 · 진행 ${sc.locks + sc.bonus}/${KEYS.length + GAME_KEYS.length}`,
      scoreText: `연구 점수 ${sc.total}점 = 미션 ${sc.mission} + 시간 ${sc.time} − 힌트 ${sc.hint}`,
      statsText: `장치 ${sc.locks}/${KEYS.length} · 보너스 ${sc.bonus}/${GAME_KEYS.length} · 명령어 조각 ${frags().filter(Boolean).length}/${KEYS.length}`,
      dateText: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    });
    nui.cert = {canvas, url: canvas.toDataURL('image/png')};
  } catch { nui.cert = null; }
  nui.certBusy = false;
  if (nui.modal === 'complete' || nui.modal === 'timeup') render();
}

/* 프롤로그 재생: 자막 한 글자씩 → 다 나오고 잠시 뒤(영상이 있으면 영상이 끝난 뒤) 다음 장면 */
let proType = null, proNext = null, proFinish = null;
function stopPro() { clearInterval(proType); clearTimeout(proNext); proType = null; }
function playPrologue(root) {
  stopPro();
  const el = root.querySelector('.nz-pro .sub-text'); if (!el) return;
  const full = el.dataset.type, last = nui.pro >= N.prologue.length - 1, video = root.querySelector('[data-nvideo]');
  let i = 0, typed = false, vidDone = !video;
  const advance = () => { if (!last && typed && vidDone && !proNext) proNext = setTimeout(() => stepPro(1), 600); };
  if (video) {
    const art = root.querySelector('.pro-art.fallback'), fail = () => { video.hidden = true; if (art) art.hidden = false; vidDone = true; advance(); };
    video.addEventListener('ended', () => { vidDone = true; advance(); });
    video.querySelectorAll('source')[1]?.addEventListener('error', fail); video.addEventListener('error', fail);
    const p = video.play?.(); p?.catch?.(() => { video.muted = true; video.play?.()?.catch?.(fail); });
    setTimeout(() => { if (!vidDone && video.readyState === 0) fail(); }, 6000);
    setTimeout(() => { vidDone = true; advance(); }, 20000);   // 혹시 재생이 멈춰도 다음으로
  }
  const finish = () => {
    clearInterval(proType); proType = null; el.textContent = full; el.classList.add('done');
    const bar = root.querySelector('.cine-bar .on b'), hold = Math.min(7000, 2600 + full.length * 45);
    if (bar) { bar.style.animationDuration = hold + 'ms'; bar.classList.add('run'); }
    setTimeout(() => { typed = true; advance(); }, hold);
  };
  proFinish = finish;
  proType = setInterval(() => { i += 1; el.textContent = full.slice(0, i); if (i % 5 === 0) A.sfx.type(); if (i >= full.length) finish(); }, 42);
}
function stepPro(d) { stopPro(); nui.pro = Math.max(0, Math.min(N.prologue.length - 1, nui.pro + d)); render(); }
function endPro() {
  stopPro();
  const first = !Z().introSeen;
  if (first) A.save({'night/introSeen': true});
  nui.screen = 'done';
  if (first || !T()?.storySeen) A.briefing(); else render();   // 밤 첫 입장: 스토리 영상 → 작전 설명 → 점수 안내 (낮을 먼저 한 모둠도 똑같이)
}

/* 관제 AI 플로 띠 (4.2초마다) */
let tickIdx = 0, tickMsg = null;
setInterval(() => {
  const el = document.getElementById('ticker'); if (!el || !document.querySelector('main.nz') || nui.modal) return;
  if (doneList().length === KEYS.length) { el.textContent = N.aiLines.allClear; return; }
  if (tickMsg) { el.textContent = tickMsg; tickMsg = null; return; }
  tickIdx = (tickIdx + 1) % N.aiLines.idle.length; el.textContent = N.aiLines.idle[tickIdx];
}, 4200);

/* ───────── 이벤트 연결 (app.js가 그린 뒤 부름) ───────── */
let escBound = false;
export function bind(root, api) {
  A = api;
  const $ = s => root.querySelector(s), $$ = s => root.querySelectorAll(s);
  if (!escBound) { escBound = true; document.addEventListener('keydown', e => { if (e.key === 'Escape' && nui.modal && document.querySelector('main.nz')) closeModal(); }); }

  // 상단 바 (밤): 스토리 영상 · 점수 안내 · 인증서
  $('[data-n-story]')?.addEventListener('click', () => { nui.screen = 'prologue'; nui.pro = 0; nui.modal = null; A.sfx.tap(); render(); });
  $('[data-n-rules]')?.addEventListener('click', () => { nui.modal = 'rules'; A.sfx.tap(); render(); });
  $$('[data-n-open],[data-nopen]').forEach(b => b.onclick = () => openCert(b.dataset.nOpen || b.dataset.nopen));

  // 스토리 영상
  if (nui.screen === 'prologue' && $('.nz-pro')) {
    playPrologue(root);
    $$('[data-npro]').forEach(b => b.onclick = () => { const v = b.dataset.npro; A.sfx.tap(); if (v === 'end' || v === 'skip') endPro(); else stepPro(Number(v)); });
    $$('[data-npro-tap]').forEach(el => el.onclick = () => { if (proType) proFinish?.(); else if (nui.pro < N.prologue.length - 1) stepPro(1); });
    $('[data-npro-mute]')?.addEventListener('click', e => { e.stopPropagation(); const m = A.toggleMute(), b = e.currentTarget, v = $('[data-nvideo]'); b.textContent = m ? '🔇' : '🔊'; b.setAttribute('aria-label', `소리 ${m ? '켜기' : '끄기'}`); if (v) { v.muted = m; if (!m) v.play?.()?.catch?.(() => {}); } });
    return;
  }

  // 밤의 온실: 장치 버튼 · 상단 카드
  $$('[data-nlock]').forEach(b => b.onclick = () => openLock(b.dataset.nlock));
  $$('[data-ngame]').forEach(b => b.onclick = () => startGame(b.dataset.ngame));
  const world = $('.nz .world');
  if (world) {
    const act = e => {
      const el = e.target.closest('[data-lock],[data-decoy],[data-game]'); if (!el) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (el.dataset.lock) openLock(el.dataset.lock);
      else if (el.dataset.game) startGame(el.dataset.game);
      else { el.classList.remove('wiggle'); void el.getBoundingClientRect(); el.classList.add('wiggle'); A.sfx.tap(); const L = N.aiLines.decoy; toast(L[Math.floor(Math.random() * L.length)]); }
    };
    world.addEventListener('click', act); world.addEventListener('keydown', act);
  }

  // 창 닫기
  $$('[data-nclose]').forEach(b => b.onclick = () => closeModal());
  $$('[data-nbackdrop]').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeModal(); }));

  // 점수 안내
  $('#nz-agree')?.addEventListener('change', e => { const b = $('[data-nrules-ok]'); if (b) b.disabled = !e.target.checked; });
  $('[data-nrules-ok]')?.addEventListener('click', () => { if (!$('#nz-agree')?.checked) return; A.save({'night/rulesOk': true}); nui.modal = null; A.sfx.unlock(); render(); });

  // 인증서
  $('[data-ndl]')?.addEventListener('click', () => { if (nui.cert) hooks.download(nui.cert); });
}
