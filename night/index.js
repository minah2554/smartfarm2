/* [NIGHT] 밤 구역 화면 (연결형) — 나이트 미션 웹앱으로 들어가는 입구
   공용 app.js는 고치지 않아요. app.js가 그린 '밤의 온실' 준비 화면(.night-card)이 나타나면
   그 안의 내용만 입구 화면으로 바꿔요. index.html에서 이 파일을 한 줄로 불러와요. */
import {NIGHT as N} from './night-content.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// 상단 모둠 배지("2학년 3반 4모둠")와 낮 구역 진행 문구("장치 0/3 · 보너스 0/3")를 읽어 주소를 만들어요
function missionLink(card) {
  const u = new URL(N.missionURL);
  const badge = document.querySelector('main.night .team-badge')?.textContent || '';
  const m = badge.match(/(\d+)학년\s*(\d+)반\s*(\d+)모둠/);
  if (m) { u.searchParams.set('g', m[1]); u.searchParams.set('c', m[2]); u.searchParams.set('t', m[3]); }
  const prog = card.textContent.match(/장치\s*(\d+)\s*\/\s*\d+\s*·\s*보너스\s*(\d+)/);
  if (prog && prog[1] === '0' && prog[2] === '0') {   // 낮 구역 진행이 없으면 '밤 먼저' 스토리로
    const [k, v] = N.nightFirstParam.split('='); u.searchParams.set(k, v);
  }
  return u.toString();
}

function upgrade(card) {
  if (card.dataset.nm) return;
  const href = missionLink(card);
  card.dataset.nm = '1';
  card.innerHTML = `<div class="moon" aria-hidden="true"></div><p class="kicker">${esc(N.kicker)}</p><h1>${esc(N.title)}</h1>
    <p>${esc(N.lead)}</p>
    <p style="margin:22px 0 18px"><a class="primary wide" style="display:inline-block;max-width:420px;text-decoration:none" href="${esc(href)}" target="_blank" rel="noopener">${esc(N.button)}</a></p>
    <ol style="text-align:left;max-width:520px;margin:0 auto;padding-left:1.3em;line-height:1.7;word-break:keep-all">${N.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <p class="muted" style="margin-top:16px">${esc(N.dayNote)}</p>`;
}

const scan = () => document.querySelectorAll('main.night .night-card').forEach(upgrade);
const root = document.getElementById('app');
if (root) { new MutationObserver(scan).observe(root, {childList: true, subtree: true}); scan(); }
