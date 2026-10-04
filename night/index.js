/* [NIGHT] 밤 구역 화면 — 나이트 미션을 상단 바 아래에 그대로 띄워요.
   공용 app.js는 고치지 않아요. app.js가 그린 '밤의 온실' 준비 카드(.night-card)가 보이면
   상단 바 아래 공간을 나이트 미션 화면(night/mission/)으로 채워요.
   나이트 미션 화면은 #app 밖에 한 번만 만들어 두고 보였다 숨겼다만 해요.
   (app.js가 화면을 다시 그려도 미션이 처음으로 돌아가지 않게)
   index.html에서 이 파일을 한 줄로 불러와요. */
import {NIGHT as N} from './night-content.js';

// 상단 모둠 배지("2학년 3반 4모둠")와 낮 구역 진행 문구("장치 0/3 · 보너스 0/3")를 읽어 주소를 만들어요
function missionSrc(card) {
  const u = new URL(N.missionPath, document.baseURI);
  const badge = document.querySelector('main.night .team-badge')?.textContent || '';
  const m = badge.match(/(\d+)학년\s*(\d+)반\s*(\d+)모둠/);
  if (m) { u.searchParams.set('g', m[1]); u.searchParams.set('c', m[2]); u.searchParams.set('t', m[3]); }
  const prog = card.textContent.match(/장치\s*(\d+)\s*\/\s*\d+\s*·\s*보너스\s*(\d+)/);
  if (prog && prog[1] === '0' && prog[2] === '0') {   // 낮 구역 진행이 없으면 '밤 먼저' 스토리로
    const [k, v] = N.nightFirstParam.split('='); u.searchParams.set(k, v);
  }
  return {key: m ? m[0] : '', src: u.pathname + u.search};
}

let frame = null, frameKey = null;
function place() {
  const card = document.querySelector('main.night .night-card');
  const top = card ? (document.querySelector('main.night .topbar')?.getBoundingClientRect().bottom || 0) : 0;
  if (!card) { if (frame) frame.style.display = 'none'; return; }
  card.style.visibility = 'hidden';
  const {key, src} = missionSrc(card);
  if (!frame || frameKey !== key) {   // 다른 모둠로 입장했을 때만 새로 열어요
    frame?.remove();
    frame = document.createElement('iframe');
    frame.src = src; frameKey = key;
    frame.title = N.frameTitle;
    frame.setAttribute('allow', 'autoplay; fullscreen');
    frame.style.cssText = 'position:fixed;left:0;width:100%;border:0;background:#0b1130;z-index:15';
    document.body.appendChild(frame);
  }
  const t = Math.max(0, top);
  frame.style.top = t + 'px';
  frame.style.height = (window.innerHeight - t) + 'px';
  frame.style.display = 'block';
}

const root = document.getElementById('app');
if (root) { new MutationObserver(() => requestAnimationFrame(place)).observe(root, {childList: true, subtree: true}); place(); }
window.addEventListener('resize', place);
window.addEventListener('scroll', place, {passive: true});
