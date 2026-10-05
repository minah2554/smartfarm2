/* [NIGHT] 🌙 밤 구역 — 낮 구역과 같은 앱 안에서 돌아가는 밤 화면
   app.js가 넘겨주는 api(모둠 기록·저장·타이머·상단 바·관리코드 확인)를 그대로 써요.
   - 모둠 선택·타이머·대시보드·Firebase는 낮 앱 것 (밤에서 따로 만들지 않음)
   - 기록은 api.save()로 'night/…' 경로 조각만 저장
   - 정답·문구는 night-content.js, 힌트는 night-hints.js
   화면: 🎬 스토리 영상(처음 한 번) → (작전 설명) → 점수 안내 → 밤의 온실 → LOCK 4~8 → 보너스 '모두의 온기' → NIGHT CLEAR · 인증서 */
import {NIGHT as N} from './night-content.js';
import {NIGHT_HINTS as H, NIGHT_HINT_RULES as HR} from './night-hints.js';
import {nightSceneSvg} from './night-scene.js';
import {launchWarmth} from './night-games.js';
import {drawNightCertificate} from './night-cert.js';

// 밤 전용 디자인(night.css)은 이 파일이 불러와요 — 낮 style.css는 고치지 않아요
(() => { if (document.querySelector('link[data-night-css]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./night.css', import.meta.url).href; l.dataset.nightCss = '1'; document.head.append(l); })();

const KEYS = Object.keys(N.missions), GAME_KEYS = Object.keys(N.games);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const norm = s => String(s ?? '').trim().replace(/\s+/g, '').toUpperCase();
const fill = (t, o) => String(t || '').replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const limitMs = A => (A.CONFIG.missionMinutes?.night || 35) * 60000;

/* 화면 상태 (기록이 아닌 것만 — 기록은 모두 모둠 기록 team.night) */
const nui = {teamId: null, screen: null, pro: 0, modal: null, tab: 'result', feedback: '', good: false, solved: null, sel: null,
  sort: {}, pick: {}, graph: {}, pledges: null, approving: false, spell: [], timeUpShown: false, cert: null, certBusy: false};
let A = null;   // 마지막으로 받은 api

/* ── 모둠 기록 읽기 ── */
const T = () => A?.team;
const Z = () => T()?.night || {};
const done = k => !!Z().done?.[k];
const cpDone = k => !N.missions[k].checkpoint || !!Z().checkpoint?.[k];
const opened = k => Z().hints?.[k] || 0;
const doneList = () => KEYS.filter(done);
const bonusList = () => GAME_KEYS.filter(g => Z().bonus?.[g]);
const isComplete = () => doneList().length === KEYS.length && bonusList().length === GAME_KEYS.length;
const canOpen = k => (N.missions[k].requires || []).every(done);
const timeUp = () => !!Z().startedAt && !Z().finishedAt && remaining() <= 0;
const remaining = () => { const z = Z(); if (!z.startedAt) return limitMs(A); return z.startedAt + limitMs(A) - (z.finishedAt || A.now()); };
const usedMs = () => { const z = Z(); if (!z.startedAt || (z.finishedAt && z.finishedAt <= z.startedAt)) return 0; return Math.min(limitMs(A), (z.finishedAt || A.now()) - z.startedAt); };
const fragOf = k => (done(k) || (k === 'plan' && cpDone('plan'))) ? N.missions[k].frag : '';
const frags = () => KEYS.map(fragOf);
const people = () => [T()?.leader, ...A.toList(T()?.members)].filter(Boolean);

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
export const busy = () => nui.screen === 'prologue' || !!document.querySelector('.night-game');
export function startPrologue() { nui.screen = 'prologue'; nui.pro = 0; nui.modal = null; }
export function tick(api) {
  A = api;
  if (timeUp() && !nui.timeUpShown) {
    nui.timeUpShown = true;
    document.querySelectorAll('.game-layer').forEach(x => x.remove());
    if (nui.screen !== 'prologue') { A.sfx.error(); openCert('timeup'); }
  }
}

/* ───────── 화면 그리기 ───────── */
const FLO = (alert = true) => { const glow = alert ? '#FF8FC2' : '#8BD450', screen = alert ? '#3A1730' : '#0F3A26';
  const eyes = alert ? `<rect x="48" y="70" width="18" height="8" rx="4" fill="${glow}"/><rect x="84" y="70" width="18" height="8" rx="4" fill="${glow}"/><path d="M58 102 Q75 94 92 102" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    : `<path d="M48 76 Q57 66 66 76" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M84 76 Q93 66 102 76" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M56 96 Q75 112 94 96" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `<svg class="flo" viewBox="0 0 150 150" aria-hidden="true"><ellipse cx="75" cy="140" rx="40" ry="5" fill="${glow}" opacity=".25"/><path d="M75 30 C75 16 86 8 100 10 C98 24 88 30 75 30 Z" fill="#8BD450"/><line x1="75" y1="30" x2="75" y2="40" stroke="#8BD450" stroke-width="4"/><rect x="24" y="40" width="102" height="86" rx="24" fill="#E9ECFF" stroke="#9AA7FF" stroke-width="3"/><rect x="36" y="52" width="78" height="62" rx="14" fill="${screen}"/>${eyes}<rect x="44" y="126" width="8" height="10" rx="3" fill="#9AA7FF"/><rect x="98" y="126" width="8" height="10" rx="3" fill="#9AA7FF"/><circle cx="118" cy="46" r="6" fill="${alert ? '#FF5A4E' : '#8BD450'}"/></svg>`; };
const sceneState = (dawn = false) => ({done: doneList(), bonus: bonusList(), open: canOpen, keys: KEYS, dawn});

export function view(api) {
  A = api;
  if (T()?.id !== nui.teamId) Object.assign(nui, {teamId: T()?.id, screen: null, pro: 0, modal: null, solved: null, sel: null, sort: {}, pick: {}, graph: {}, pledges: null, approving: false, spell: [], timeUpShown: false, cert: null});   // 다른 모둠으로 입장하면 화면 상태를 비움
  if (!Z().introSeen && nui.screen === null && !timeUp()) nui.screen = 'prologue';   // 새로고침해도 처음 입장이면 스토리 영상부터
  if (nui.screen === 'prologue') return prologueView();
  if (!Z().rulesOk && !nui.modal && !timeUp()) nui.modal = 'rules';
  if (timeUp() && !nui.modal && !nui.timeUpShown) { nui.timeUpShown = true; nui.modal = 'timeup'; buildCert(); }
  const n = doneList().length, all = n === KEYS.length, over = timeUp();
  const fr = frags();
  const html = `<main class="night nz">
    ${A.topbar()}
    <section class="hud nz-hud" aria-label="야간 장치 상태">${KEYS.map(k => { const m = N.missions[k], lk = !done(k) && !canOpen(k);
      return `<div class="res ${done(k) ? 'on' : ''} ${lk ? 'lock' : ''}"><span class="res-icon">${m.icon}</span><span><b>${esc(m.lock)} ${esc(m.reward)}</b><small>${done(k) ? '복구됨' : lk ? '잠김' : '차단됨'}</small></span></div>`; }).join('')}
      <div class="res growth"><span class="res-icon">🌙</span><span><b>야간 시스템 ${n}/${KEYS.length}</b><small>조각 ${fr.map(c => c || '·').join(' ')} · 보너스 ${bonusList().length}/${GAME_KEYS.length}</small></span></div></section>
    <section class="stage-wrap"><div class="stage ${over ? 'is-over' : ''}">
      ${nightSceneSvg(sceneState(isComplete()), N.games)}
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
  if (m === 'news') return newsModal();
  if (m === 'complete') return clearModal();
  if (m === 'timeup') return timeUpModal();
  if (N.missions[m]) return lockModal(m);
  return '';
}

/* 🎬 스토리 영상 */
function prologueView() {
  const P = N.prologue, i = Math.min(nui.pro, P.length - 1), s = P[i], last = i === P.length - 1, replay = !!Z().introSeen, muted = A.isMuted();
  const media = s.video ? `<video class="pro-video" playsinline autoplay preload="auto" ${muted ? 'muted' : ''} data-nvideo><source src="${N.assets}${esc(s.video)}.mp4" type="video/mp4"><source src="${N.assets}${esc(s.video)}.webm" type="video/webm"></video>` : '';
  const art = `<div class="pro-art ${s.video ? 'fallback' : ''}" ${s.video ? 'hidden' : ''}>${FLO(true)}<p>NIGHT MISSION · LOCK 4–8</p></div>`;
  const who = s.who === 'twin' ? '<p class="who twin"><span>♥</span>바이오 트윈 #0214 <small>몸 시뮬레이터</small></p>' : `<p class="who flo"><span>◉</span>${esc(N.aiName)}</p>`;
  const nextLabel = T()?.storySeen ? '🌙 밤 구역 입장' : `${esc(A.menu?.brief || '작전 설명')} 보기 ▶`;
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

/* 암호 장치 창 */
function lockModal(k) {
  const m = N.missions[k], wide = ['sort', 'graph'].includes(m.checkpoint?.type) || ['labels', 'logs', 'snacks'].includes(m.panel);
  return `<div class="overlay nz-ov" data-nbackdrop><section class="modal terminal-modal nz-lock ${k} ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(m.title)}">
    <button class="close ghost" data-nclose>닫기</button>
    <p class="kicker">${esc(m.lock)} · LAB TIME ${esc(m.time)}</p>
    <h2>${m.icon} ${esc(m.title)}</h2>
    <div class="tabs" role="tablist"><button role="tab" aria-selected="${nui.tab === 'result'}" class="${nui.tab === 'result' ? 'active' : ''}" data-ntab="result">${esc(N.labels.resultTab)}</button><button role="tab" aria-selected="${nui.tab === 'hint'}" class="${nui.tab === 'hint' ? 'active' : ''}" data-ntab="hint">${esc(N.labels.hintTab)} ${opened(k) ? `<small>${opened(k)}/3</small>` : ''}</button></div>
    <div class="pane">${nui.tab === 'hint' ? hintPane(k) : resultPane(k)}</div></section></div>`;
}
const fb = () => `<p class="feedback ${nui.good ? 'good' : ''}" aria-live="polite">${esc(nui.feedback)}</p>`;
const speech = (k, alert = true) => `<div class="nz-speech">${FLO(alert)}<p><b>${esc(N.aiName)}</b><br>${esc(N.missions[k].speech)}</p></div>`;

function resultPane(k) {
  const m = N.missions[k];
  if (nui.solved === k) {
    const isPlan = k === 'plan', g = GAME_KEYS.find(x => N.games[x].unlockBy === k);
    return `<div class="unlocked"><svg class="padlock" viewBox="0 0 120 120" aria-hidden="true"><path class="shackle" d="M38 54 V38 a22 22 0 0 1 44 0" fill="none" stroke="#8BD450" stroke-width="12" stroke-linecap="round"/><rect x="26" y="52" width="68" height="54" rx="12" fill="#8BD450"/><circle cx="60" cy="76" r="8" fill="#14163A"/></svg>
      <h3>${esc(m.lock)} ${esc(m.reward)} 복구!</h3>
      ${isPlan ? `<p>재가동 명령어 <b class="word">"${esc(m.answer.split('').join(' '))}"</b> 입력 완료. 야간 시스템 ${doneList().length}/${KEYS.length}</p>`
        : `<div class="big-frag" aria-label="재가동 명령어 조각">${esc(m.frag)}</div><p class="muted">연구원 수첩 1쪽 '명령어 조각 수집판'의 ${esc(m.lock)} 칸에 적어 두세요. 조각의 순서는 마지막에 직접 알아내야 해요.</p>`}
      ${g ? `<p class="bonus-note">🎁 <b>${esc(N.games[g].place)}</b>에서 보너스 게임이 열렸어요.</p>` : ''}
      <div class="row">${m.after === 'news' ? `<button class="primary" data-nnews>📺 ${esc(N.news.tag)} 보기</button>` : g && !bonusList().includes(g) ? `<button class="primary" data-nplay="${g}">${esc(N.games[g].place)}로 가기</button>` : ''}<button class="ghost" data-nclose>온실로 돌아가기</button></div></div>`;
  }
  if (done(k)) return `<p class="ok">✅ 복구 완료 — ${esc(m.reward)} 정상 가동 중이에요.</p>${m.frag ? `<p>재가동 명령어 조각: <b class="frag-inline">${esc(m.frag)}</b></p>` : ''}${m.after === 'news' ? `<div class="row"><button class="ghost" data-nnews>📺 ${esc(N.news.tag)} 다시 보기</button></div>` : ''}`;
  if (!canOpen(k)) return `<p class="ok">🔒 ${esc(N.aiLines.lockedPlan)}</p>`;
  if (!cpDone(k)) return `${speech(k)}<p class="step">${esc(m.checkpoint.label)}</p><p>${esc(m.checkpoint.prompt)}</p>${checkpointUI(k)}${fb()}`;
  const cp = m.checkpoint;
  return `${speech(k, false)}<p class="ok">✅ ${esc(cp.success)}${k === 'plan' ? ` 조각 <b class="frag-inline">${esc(m.frag)}</b>` : ''}</p><p class="step">${esc(m.finalLabel)}</p><p>${esc(m.prompt)}</p>${panel(k)}${k === 'plan' ? spellUI() : codeForm(k)}${fb()}`;
}

function codeForm(k) {
  const m = N.missions[k];
  return `<form id="nz-code" class="code-form nz-code"><input class="code-input" name="code" inputmode="numeric" autocomplete="off" placeholder="${esc(m.placeholder)}" aria-label="${esc(m.placeholder)}" required>
    <label class="nz-inspect"><input type="checkbox" name="ok"> ${esc(N.labels.inspector)}</label>
    <button class="primary" type="submit">${esc(N.labels.submit)}</button></form>`;
}

function checkpointUI(k) {
  const cp = N.missions[k].checkpoint;
  if (cp.type === 'sort') {
    const placed = nui.sort;
    const pool = cp.items.filter(it => !placed[it.id]).map(it => `<button type="button" class="nz-card ${nui.sel === it.id ? 'sel' : ''}" data-nsel="${it.id}"><b>${it.no}</b> ${esc(it.name)}<small>${esc(it.sub)}</small></button>`).join('');
    const tanks = cp.tanks.map(t => { const inside = cp.items.filter(it => placed[it.id] === t.id), h = Math.round(100 * Math.min(1, inside.length / t.max));
      return `<div class="nz-tank" data-ntank="${t.id}" role="button" tabindex="0" aria-label="${esc(t.name)} 탱크" style="--tc:${t.color}"><span class="tube"><i style="height:${h}%"></i></span><b>${esc(t.name)}</b><small>${esc(t.sub)}</small>
        <span class="inside">${inside.map(it => `<button type="button" class="nz-chip" data-nback="${it.id}">${esc(it.name)}</button>`).join('')}</span></div>`; }).join('');
    return `<div class="nz-clue">${cp.clue.map(c => `<span>${esc(c)}</span>`).join('')}</div>
      <div class="nz-pool">${pool || '<span class="muted">모든 화물을 넣었어요. 판정해 보세요!</span>'}</div>
      <div class="nz-tanks">${tanks}</div>
      <div class="row"><button class="primary" data-njudge>분류 판정</button></div>`;
  }
  if (cp.type === 'pick') {
    const sel = nui.pick[k] || [];
    return `<div class="nz-pick ${cp.numbered ? 'numbered' : ''}">${cp.items.map((it, i) => `<button type="button" class="nz-card ${sel.includes(it.id) ? 'sel' : ''}" data-npick="${it.id}" aria-pressed="${sel.includes(it.id)}">${cp.numbered ? `<b>${String(i + 1).padStart(2, '0')}</b> ` : ''}${esc(it.text)}</button>`).join('')}</div>
      <div class="row"><span class="muted">선택 ${sel.length} / ${cp.need}</span><button class="primary" data-njudge>${k === 'protocol' ? '설치 완료' : '판정'}</button></div>`;
  }
  if (cp.type === 'graph') {
    return `<div class="nz-monitor">${graphSvg()}<p class="small muted">${esc(cp.note)}</p></div>
      ${cp.questions.map(q => `<div class="nz-q"><p><b>${esc(q.q)}</b></p><div class="nz-opts">${q.opts.map(o => `<button type="button" class="nz-card ${nui.graph[q.id] === o ? 'sel' : ''}" data-ngraph="${q.id}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`).join('')}
      <div class="row"><button class="primary" data-njudge>판정</button></div>`;
  }
  if (cp.type === 'pledge') {
    if (nui.approving) return `<div class="nz-approve"><p class="pw-icon">🔐</p><h3>연구소장 승인</h3><p>${esc(cp.approval)}</p>
      <form id="nz-approve" class="code-form"><input class="code-input" name="pw" type="password" autocomplete="off" placeholder="밤 구역 관리코드" aria-label="밤 구역 관리코드" required><button class="primary" type="submit">승인</button></form>
      <button class="text-btn" data-nunapprove>서약 다시 고치기</button></div>`;
    if (!nui.pledges) { const ppl = people(); nui.pledges = Array.from({length: Math.max(cp.min, Math.min(cp.max, ppl.length))}, (_, i) => ({who: ppl[i] || '', when: '', what: '', much: ''})); }
    const P = cp.placeholders;
    return `<div class="nz-pledges">${nui.pledges.map((p, i) => `<div class="nz-pledge" data-i="${i}">
        <input class="field" data-npl="who" value="${esc(p.who)}" placeholder="이름" aria-label="이름" maxlength="10">
        <input class="field" data-npl="when" value="${esc(p.when)}" placeholder="${esc(P.when)}" aria-label="언제">
        <input class="field" data-npl="what" value="${esc(p.what)}" placeholder="${esc(P.what)}" aria-label="무엇을">
        <input class="field" data-npl="much" value="${esc(p.much)}" placeholder="${esc(P.much)}" aria-label="얼마나"></div>`).join('')}</div>
      <div class="row">${nui.pledges.length < cp.max ? '<button class="ghost" data-naddp>+ 한 줄 추가</button>' : ''}<button class="primary" data-njudge>서약 제출 · 연구소장 승인 요청</button></div>`;
  }
  return '';
}

function graphSvg() {
  const Aa = [[0, 90], [30, 180], [60, 150], [90, 100], [120, 70]], B = [[0, 90], [30, 120], [60, 130], [90, 115], [120, 95]];
  const X = t => 60 + t * 4, Y = v => 230 - (v - 50) * 1.3, path = p => p.map((d, i) => `${i ? 'L' : 'M'}${X(d[0])} ${Y(d[1])}`).join(' ');
  const dots = (p, c) => p.map(d => `<circle cx="${X(d[0])}" cy="${Y(d[1])}" r="4.5" fill="${c}"/>`).join('');
  return `<svg class="nz-graph" viewBox="0 0 580 270" role="img" aria-label="식사 후 혈당 변화 그래프: A는 30분에 180까지 치솟았다가 120분에 70으로 떨어지고, B는 130 이하로 완만하다">
    <text x="60" y="22" font-size="14" fill="#E6E8FF">식사 후 혈당 변화 (mg/dL)</text>
    ${[60, 100, 140, 180].map(v => `<line x1="60" x2="540" y1="${Y(v)}" y2="${Y(v)}" stroke="#E6E8FF22"/><text x="52" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#B8C0F0">${v}</text>`).join('')}
    ${[0, 30, 60, 90, 120].map(t => `<text x="${X(t)}" y="252" text-anchor="middle" font-size="12" fill="#B8C0F0">${t}분</text>`).join('')}
    <path d="${path(Aa)}" fill="none" stroke="#FF8FC2" stroke-width="3"/>${dots(Aa, '#FF8FC2')}
    <path d="${path(B)}" fill="none" stroke="#8BD450" stroke-width="3"/>${dots(B, '#8BD450')}
    ${Aa.slice(1).map(d => `<text x="${X(d[0]) + (d[0] === 90 ? 12 : 0)}" y="${d[0] >= 90 ? Y(d[1]) + 22 : Y(d[1]) - 10}" fill="#FF8FC2" font-size="13" font-weight="700" text-anchor="middle">${d[1]}</text>`).join('')}
    ${B.slice(1).map(d => `<text x="${X(d[0])}" y="${d[0] >= 60 ? Y(d[1]) - 10 : Y(d[1]) + 20}" fill="#8BD450" font-size="13" font-weight="700" text-anchor="middle">${d[1]}</text>`).join('')}
    <line x1="330" x2="352" y1="18" y2="18" stroke="#FF8FC2" stroke-width="3"/><text x="358" y="22" font-size="13" fill="#FF8FC2">A 콜라 + 도넛</text>
    <line x1="330" x2="352" y1="38" y2="38" stroke="#8BD450" stroke-width="3"/><text x="358" y="42" font-size="13" fill="#8BD450">B 현미밥 + 달걀 + 나물</text>
    <line x1="60" x2="540" y1="${Y(90)}" y2="${Y(90)}" stroke="#FFD23F" stroke-dasharray="4 4"/><text x="70" y="${Y(90) + 16}" font-size="11.5" fill="#FFD23F">식사 전 90</text></svg>`;
}

function panel(k) {
  const m = N.missions[k];
  if (m.panel === 'labels') return `<div class="nz-labels">
    <div class="nl"><p class="pname">피치 아이스티 · 총 내용량 500mL</p><p class="top"><span>영양정보</span><b>총 내용량 500mL</b></p><p class="basis">100mL당 40kcal</p>
      <table><tr><td>나트륨 10mg</td><td>1%</td></tr><tr><td>탄수화물 10g</td><td>3%</td></tr><tr class="hl"><td>당류 9g</td><td>9%</td></tr><tr><td>단백질 0g</td><td>0%</td></tr></table></div>
    <div class="nl"><p class="pname">초코칩 쿠키 · 30g 봉지 × 4개입</p><p class="top"><span>영양정보</span><b>총 내용량 ??? (찢어짐)</b></p><p class="basis">1봉지(30g)당 150kcal</p>
      <table><tr><td>나트륨 85mg</td><td>4%</td></tr><tr><td>탄수화물 19g</td><td>6%</td></tr><tr class="hl"><td>당류 9g</td><td>9%</td></tr><tr><td>지방 7g</td><td>13%</td></tr><tr><td>단백질 2g</td><td>4%</td></tr></table></div></div>`;
  if (m.panel === 'logs') return `<div class="nz-logs">${m.logs.map(l => `<div><b>로그 ${l.id}</b><p>${esc(l.text)}</p></div>`).join('')}</div>
    <div class="nz-dz">${m.diagnoses.map((d, i) => `<span><b>${'①②③④⑤'[i]}</b>${esc(d)}</span>`).join('')}</div>`;
  if (m.panel === 'snacks') return `<div class="nz-intake">${m.intake.map(x => `<span>${esc(x)}</span>`).join('')}</div><div class="nz-sets">${m.sets.map(x => `<div>${esc(x)}</div>`).join('')}</div>`;
  return '';
}

function spellUI() {
  const tiles = KEYS.map((k, i) => { const used = nui.spell.includes(i); return `<button type="button" class="nz-tile ${used ? 'used' : ''}" data-ntile="${i}" ${used ? 'disabled' : ''}><small>${esc(N.missions[k].lock)}</small>${esc(N.missions[k].frag)}</button>`; }).join('');
  const slots = Array.from({length: KEYS.length}, (_, i) => `<span class="nz-slot">${nui.spell[i] !== undefined ? esc(N.missions[KEYS[nui.spell[i]]].frag) : ''}</span>`).join('');
  return `<div class="nz-tiles">${tiles}</div><div class="nz-spell">${slots}</div>
    <div class="row"><button class="ghost" data-nspell="reset">다시 놓기</button><button class="primary" data-nspell="cast" ${nui.spell.length < KEYS.length ? 'disabled' : ''}>시스템 재가동!</button></div>`;
}

function hintPane(k) {
  const h = H[k]; if (!h) return '<p>준비된 힌트가 없어요.</p>';
  const n = opened(k), S = N.certificate.score;
  return `<p class="muted">막혔을 때만 열어 보세요. 1단계부터 차례로 열려요. 힌트를 열면 연구 점수가 줄어요(1·2단계 −${S.hint}점, 3단계 −${S.answerHint}점).</p>${h.levels.map((lv, i) => {
    if (i < n) return `<article class="hint open"><h4>${esc(lv.title)}</h4><ul>${(lv.lines || []).map(t => `<li class="${/^\s/.test(t) ? 'sub' : ''}">${esc(t.trim())}</li>`).join('')}</ul>${lv.answer ? `<p class="answer">정답 <b>${esc(lv.answer)}</b></p>` : ''}</article>`;
    const can = !HR.sequential || i === n;
    return `<article class="hint locked"><h4>${esc(lv.title)}</h4>${can ? `<button class="ghost" data-nhint="${i}">${i + 1}단계 힌트 열기</button>` : `<p class="muted">${esc(HR.lockedText)}</p>`}</article>`;
  }).join('')}`;
}

function newsModal() {
  const s = N.news;
  return `<div class="overlay nz-ov" data-nbackdrop><section class="modal nz-news wide" role="dialog" aria-modal="true" aria-label="${esc(s.tag)}">
    <p class="breaking">${esc(s.tag)}</p><h2>${esc(s.title)}</h2>
    ${s.video ? `<figure class="nclip"><video muted loop playsinline autoplay preload="auto"><source src="${N.assets}${esc(s.video)}.mp4" type="video/mp4"><source src="${N.assets}${esc(s.video)}.webm" type="video/webm"></video><figcaption>자료 화면 · 당류 0g 음료와 물·과일</figcaption></figure>` : ''}
    ${s.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}<p class="small muted">${esc(s.source)}</p>
    <div class="row"><button class="primary" data-nclose>${esc(s.done)}</button></div></section></div>`;
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
      <li>LOCK마다 <b>1단계 시스템 점검</b>(웹앱)을 마치면 <b>2단계 코드 락</b>(연구원 수첩)이 열려요. 코드를 넣기 전 검사원이 모두의 수첩을 확인해요.</li>
      <li>LOCK을 복구할 때마다 <b>재가동 명령어 조각</b>이 나와요. 수첩 1쪽 수집판에 적어 두세요.</li>
      <li>시간 안에 다 못 끝내도 괜찮아요. <b>복구한 만큼</b> 인증서를 받아요.</li></ul></article>
    <article class="rule-box"><h3>🧮 연구 점수 계산 (최고 ${maxMission + maxTime}점)</h3>
      <table class="rule-table"><tbody>
        <tr><th>장치 복구</th><td>1개당 <b>+${S.lock}</b>점</td><td class="muted">최대 ${KEYS.length * S.lock}점</td></tr>
        <tr><th>보너스 게임 성공</th><td>1개당 <b>+${S.bonus}</b>점</td><td class="muted">최대 ${GAME_KEYS.length * S.bonus}점</td></tr>
        <tr><th>완료 시간 보너스</th><td colspan="2">${S.time.map(t => `${t.within}분 안 <b>+${t.points}</b>`).join(' · ')}<br><small class="muted">모든 미션(장치+보너스)을 끝냈을 때만</small></td></tr>
        <tr><th>힌트 사용</th><td colspan="2">1·2단계 열 때마다 <b class="neg">−${S.hint}</b> · 3단계(정답) <b class="neg">−${S.answerHint}</b></td></tr>
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
function shake() { const m = document.querySelector('.nz-ov .modal'); if (!m) return; m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); }
function setFb(msg, good = false) { nui.feedback = msg; nui.good = good; }
function wrongFb(msg) { setFb(msg); A.sfx.error(); render(); shake(); }
function openLock(k) {
  if (timeUp()) { toast('시간이 끝났어요. 인증서를 받아 보세요!'); A.sfx.error(); return; }
  if (!done(k) && !canOpen(k)) { toast(N.aiLines.lockedPlan); A.sfx.error(); return; }
  nui.modal = k; nui.tab = 'result'; setFb(''); nui.solved = null; nui.sel = null; A.sfx.tap(); render();
}
function closeModal() {
  const was = nui.modal;
  if (was === 'rules' && !Z().rulesOk) return;   // '확인했습니다'를 체크해야 넘어감
  nui.modal = null; nui.solved = null; setFb('');
  render();
}
function checkComplete() { if (isComplete() && !Z().finishedAt) A.save({'night/finishedAt': A.SERVER_TIME}); }
function passCheckpoint(k) {
  A.save({[`night/checkpoint/${k}`]: A.SERVER_TIME});
  setFb(N.missions[k].checkpoint.success, true); A.sfx.unlock(); render();
}
function solve(k) {
  if (!done(k)) A.save({[`night/done/${k}`]: A.SERVER_TIME});
  checkComplete();
  nui.solved = k; setFb('');
  const left = KEYS.length - doneList().length;
  tickMsg = `✔ ${N.missions[k].lock} ${N.missions[k].reward} 복구 · 남은 오류 ${left}개`;
  A.sfx.unlock(); render();
}
function startGame(g) {
  const cfg = N.games[g];
  if (timeUp()) { toast('시간이 끝났어요. 인증서를 받아 보세요!'); A.sfx.error(); return; }
  if (!done(cfg.unlockBy)) { toast(N.aiLines.lockedGame); A.sfx.error(); return; }
  if (bonusList().includes(g)) { toast('이미 성공한 보너스 게임이에요!'); return; }
  nui.modal = null; nui.solved = null; render();
  launchWarmth(people(), () => {
    if (timeUp()) { render(); return; }
    if (!Z().bonus?.[g]) { A.save({[`night/bonus/${g}`]: A.SERVER_TIME}); A.sfx.clear(); checkComplete(); }
    if (isComplete()) openCert('complete'); else render();
  }, {isMuted: A.isMuted, onClose: () => render()});
}
function openCert(kind) { nui.modal = kind; setFb(''); render(); buildCert(); }
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
  if (!Z().introSeen) A.save({'night/introSeen': true});
  nui.screen = 'done';
  if (!T()?.storySeen) A.briefing(); else render();
}

/* 관제 AI 플로 띠 (4.2초마다) */
let tickIdx = 0, tickMsg = null;
setInterval(() => {
  const el = document.getElementById('ticker'); if (!el || !document.querySelector('main.nz') || nui.modal) return;
  if (doneList().length === KEYS.length) { el.textContent = N.aiLines.allClear; return; }
  if (tickMsg) { el.textContent = tickMsg; tickMsg = null; return; }
  tickIdx = (tickIdx + 1) % N.aiLines.idle.length; el.textContent = N.aiLines.idle[tickIdx];
}, 4200);

/* 판정 */
function judge(k) {
  const m = N.missions[k], cp = m.checkpoint;
  if (timeUp()) return;
  if (cp.type === 'sort') {
    const left = cp.items.filter(it => !nui.sort[it.id]).length;
    if (left) { wrongFb(`아직 ${left}개가 남았어요.`); return; }
    const bad = cp.items.filter(it => nui.sort[it.id] !== it.cat).length;
    if (!bad) passCheckpoint(k); else wrongFb(fill(cp.wrong, {n: bad}));
  } else if (cp.type === 'pick') {
    const sel = nui.pick[k] || [], ok = cp.items.filter(it => it.ok).map(it => it.id), hit = sel.filter(id => ok.includes(id)).length, fake = sel.length - hit;
    if (sel.length !== cp.need) { wrongFb(fill(cp.wrongCount, {need: cp.need, n: sel.length})); return; }
    if (hit === cp.need && !fake) passCheckpoint(k); else wrongFb(fill(cp.wrong, {hit, fake}));
  } else if (cp.type === 'graph') {
    if (cp.questions.some(q => !nui.graph[q.id])) { wrongFb(cp.missing); return; }
    if (cp.questions.every(q => nui.graph[q.id] === q.answer)) passCheckpoint(k); else wrongFb(cp.wrong);
  } else if (cp.type === 'pledge') {
    const good = nui.pledges.filter(p => p.who.trim() && p.when.trim().length >= 2 && p.what.trim().length >= 4 && p.much.trim().length >= 2);
    if (good.length < cp.min) { wrongFb(fill(cp.tooFew, {n: good.length})); return; }
    if (good.some(p => /^(당|설탕)?\s*(줄이기|안\s*먹기|줄인다)$/.test(p.what.trim()))) { wrongFb(cp.vague); return; }
    nui.approving = true; setFb(''); A.sfx.tap(); render();
  }
}

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

  // 밤의 온실
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

  // 창 닫기 · 탭 · 힌트
  $$('[data-nclose]').forEach(b => b.onclick = () => { if (nui.modal === 'news') { nui.modal = null; render(); return; } closeModal(); });
  $$('[data-nbackdrop]').forEach(o => o.addEventListener('click', e => { if (e.target === o && nui.modal !== 'news') closeModal(); }));
  $$('[data-ntab]').forEach(b => b.onclick = () => { nui.tab = b.dataset.ntab; setFb(''); A.sfx.tap(); render(); });
  $$('[data-nhint]').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.nhint), k = nui.modal;
    if (HR.sequential && i !== opened(k)) return;
    A.save({[`night/hints/${k}`]: Math.max(opened(k), i + 1)}); A.sfx.hint(); render();
  });
  $$('[data-nnews]').forEach(b => b.onclick = () => { nui.modal = 'news'; nui.solved = null; A.sfx.tap(); render(); });
  $$('[data-nplay]').forEach(b => b.onclick = () => startGame(b.dataset.nplay));

  // 점수 안내
  $('#nz-agree')?.addEventListener('change', e => { const b = $('[data-nrules-ok]'); if (b) b.disabled = !e.target.checked; });
  $('[data-nrules-ok]')?.addEventListener('click', () => { if (!$('#nz-agree')?.checked) return; A.save({'night/rulesOk': true}); nui.modal = null; A.sfx.unlock(); render(); });

  // 1단계 시스템 점검
  const k = nui.modal;
  $$('[data-nsel]').forEach(b => b.onclick = () => { nui.sel = nui.sel === b.dataset.nsel ? null : b.dataset.nsel; A.sfx.tap(); render(); });
  $$('[data-ntank]').forEach(t => {
    const drop = () => { if (!nui.sel) return; nui.sort[nui.sel] = t.dataset.ntank; nui.sel = null; setFb(''); A.sfx.tap(); render(); };
    t.addEventListener('click', e => { if (e.target.closest('[data-nback]')) return; drop(); });
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(); } });
  });
  $$('[data-nback]').forEach(b => b.onclick = e => { e.stopPropagation(); delete nui.sort[b.dataset.nback]; A.sfx.tap(); render(); });
  $$('[data-npick]').forEach(b => b.onclick = () => { const s = nui.pick[k] = nui.pick[k] || [], id = b.dataset.npick, i = s.indexOf(id); if (i >= 0) s.splice(i, 1); else s.push(id); setFb(''); A.sfx.tap(); render(); });
  $$('[data-ngraph]').forEach(b => b.onclick = () => { nui.graph[b.dataset.ngraph] = b.dataset.v; setFb(''); A.sfx.tap(); render(); });
  $$('[data-npl]').forEach(inp => inp.oninput = () => { const i = Number(inp.closest('[data-i]').dataset.i); nui.pledges[i][inp.dataset.npl] = inp.value; });
  $('[data-naddp]')?.addEventListener('click', () => { nui.pledges.push({who: '', when: '', what: '', much: ''}); render(); });
  $('[data-njudge]')?.addEventListener('click', () => judge(k));
  $('[data-nunapprove]')?.addEventListener('click', () => { nui.approving = false; setFb(''); render(); });
  $('#nz-approve')?.addEventListener('submit', async e => {
    e.preventDefault(); const input = e.currentTarget.elements.pw, cp = N.missions.plan.checkpoint;
    if (bind.checking) return; bind.checking = true; const res = await A.checkCode('night', input.value); bind.checking = false;
    if (res !== 'ok') { wrongFb(res === 'server' ? '관리코드 확인 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.' : cp.approvalWrong); return; }
    const pl = {}; nui.pledges.filter(p => p.who.trim() || p.what.trim()).forEach((p, i) => { pl[i] = {who: p.who.trim(), when: p.when.trim(), what: p.what.trim(), much: p.much.trim()}; });
    A.save({'night/pledges': pl}); nui.approving = false; passCheckpoint('plan');
  });

  // 2단계 코드 락
  $('#nz-code')?.addEventListener('submit', e => {
    e.preventDefault(); const f = e.currentTarget, m = N.missions[k];
    if (timeUp()) return;
    if (!f.elements.ok.checked) { wrongFb(N.labels.inspectorMissing); return; }
    const v = norm(f.elements.code.value);
    if (v !== norm(m.answer)) { wrongFb(m.wrongs?.[v] || m.wrong); return; }
    solve(k);
  });
  // LOCK 8 재가동 명령어
  $$('[data-ntile]').forEach(b => b.onclick = () => { const i = Number(b.dataset.ntile); if (!nui.spell.includes(i) && nui.spell.length < KEYS.length) { nui.spell.push(i); A.sfx.tap(); render(); } });
  $$('[data-nspell]').forEach(b => b.onclick = () => {
    if (b.dataset.nspell === 'reset') { nui.spell = []; setFb(''); render(); return; }
    const word = nui.spell.map(i => N.missions[KEYS[i]].frag).join(''), m = N.missions.plan;
    if (word === m.answer) { nui.spell = []; solve('plan'); return; }
    nui.spell = []; wrongFb(m.wrongs?.[word] || fill(m.wrong, {word}));
  });

  // 인증서
  $('[data-ndl]')?.addEventListener('click', () => { const t = T(); if (nui.cert) A.downloadCanvas(nui.cert.canvas, `smartfarm_night_certificate_${t.grade}-${t.classNo}-${t.teamNo}.png`); });
}
