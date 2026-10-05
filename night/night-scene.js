/* 🌙 밤의 온실 그림 — 나이트 미션 첫 화면의 유리 온실 일러스트를 그대로 옮겼어요.
   phase: 'intro'(18:00 낮 → 22:00 밤으로 바뀌는 애니메이션) · 'night'(밤, 정지) · 'end'(밤 → 06:00 새벽 애니메이션) · 'dawn'(새벽, 정지)
   bare: true → 인증서용 그림(애니메이션 없이 마지막 모습, CSS 없이도 보이게) */
export function farmSVG({phase = 'night', bare = false} = {}) {
  const dawn = phase === 'end' || phase === 'dawn', anim = phase === 'intro' || phase === 'end';
  // bare일 때는 CSS가 없으니 마지막 모습을 opacity로 직접 적어요
  const at = (cls, nightOp, dawnOp, extra = '') => bare ? `opacity="${dawn ? dawnOp : nightOp}"` : `class="${cls}"${extra}`;
  let stars = '';
  [[60, 40], [150, 70], [230, 30], [330, 60], [420, 25], [520, 55], [600, 35], [700, 70], [760, 30], [90, 110], [480, 95], [690, 120]].forEach((p, i) => {
    stars += `<circle ${at('hs-star', 0.9, 0, ` style="animation-delay:${(4.2 + i * 0.12).toFixed(2)}s"`)} cx="${p[0]}" cy="${p[1]}" r="${i % 3 ? 1.4 : 2.2}" fill="#fff"/>`;
  });
  let fdelay = 0;
  const plant = (x, y, berry) => {
    let g = `<g class="hs-plant" transform="translate(${x} ${y})">` +
      '<path d="M0 0 C-4 -14 -2 -26 0 -34" stroke="#3a8f5a" stroke-width="3" fill="none"/>' +
      '<ellipse cx="-11" cy="-22" rx="11" ry="6" fill="#4fbf7a" transform="rotate(-30 -11 -22)"/><ellipse cx="11" cy="-26" rx="11" ry="6" fill="#43ad6c" transform="rotate(28 11 -26)"/><ellipse cx="0" cy="-38" rx="9" ry="6" fill="#5ccf86"/>' +
      `<circle ${bare ? '' : 'class="hs-starch"'} cx="-9" cy="-23" r="2" fill="#fff"/><circle ${bare ? '' : 'class="hs-starch" style="animation-delay:.6s"'} cx="10" cy="-27" r="2" fill="#fff"/>`;
    if (berry) g += '<path d="M-4 -6 q-5 6 0 11 q5 -5 0 -11z" fill="#ff5a6e"/><path d="M8 -9 q-4 5 0 9 q4 -4 0 -9z" fill="#ff7a8a"/>';
    // 꽃: 위 칸 딸기는 흰 꽃, 아래 칸 감자는 연보라 꽃 — 낮에는 피어 있고 밤에는 오므린다
    const fx = berry !== false ? 17 : -17, fy = berry !== false ? -17 : -15, pc = y < 300 ? '#ffffff' : '#d9c4ff';
    g += `<g transform="translate(${fx} ${fy}) scale(1.6)"><g ${at('hs-flower', 0, 1, ` style="animation-delay:${fdelay}s"`)}>` +
      [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-3.6" rx="2.6" ry="3.6" fill="${pc}" stroke="rgba(0,0,0,.08)" stroke-width=".6" transform="rotate(${a})"/>`).join('') +
      '<circle r="2" fill="#ffc83d"/></g></g>';
    return g + '</g>';
  };
  let top = '', mid = '';
  for (let i = 0; i < 9; i++) { fdelay = (dawn ? 4.4 : 2.6) + i * 0.12; top += plant(110 + i * 72, 262, i % 2 === 0); }
  for (let j = 0; j < 9; j++) { fdelay = (dawn ? 4.8 : 2.9) + j * 0.12; mid += plant(110 + j * 72, 372, false); }
  // 감자: 땅속줄기 끝에 덩이줄기가 달리고 가는 뿌리가 함께 내려간다
  let potatoes = '';
  for (let k = 0; k < 9; k++) {
    const bx = 110 + k * 72, px = bx + (k % 2 ? 16 : -14), py = 397 + (k % 3) * 3, sx = bx + (k % 2 ? -18 : 18), sy = 404 - (k % 3) * 2;
    potatoes += '<g fill="none" stroke-linecap="round">' +
      `<path d="M${bx} 380 C${bx} 388 ${px - (px - bx) * 0.2} ${py - 12} ${px} ${py - 6}" stroke="#e8d3a8" stroke-width="2.4"/>` +
      `<path d="M${bx} 380 C${bx} 390 ${sx - (sx - bx) * 0.3} ${sy - 8} ${sx} ${sy - 3}" stroke="#e8d3a8" stroke-width="1.8"/>` +
      `<path d="M${bx - 1} 381 q-4 10 -2 22 M${bx + 1} 381 q5 9 4 19 M${bx} 382 q0 12 1 26" stroke="#c9a77a" stroke-width="1" opacity=".85"/></g>` +
      `<g ${bare ? '' : `class="hs-tuber" style="animation-delay:${(2.6 + k * 0.1).toFixed(2)}s"`}><ellipse cx="${px}" cy="${py}" rx="12" ry="8" fill="#d9a85b" stroke="#b8863f" stroke-width="1.5"/>` +
      `<circle cx="${px - 4}" cy="${py - 2}" r="1" fill="#a87533"/><circle cx="${px + 5}" cy="${py + 2}" r="1" fill="#a87533"/></g>` +
      `<g ${bare ? '' : `class="hs-tuber" style="animation-delay:${(3.0 + k * 0.1).toFixed(2)}s"`}><ellipse cx="${sx}" cy="${sy}" rx="6" ry="4.2" fill="#e0b46a" stroke="#b8863f" stroke-width="1.2"/></g>`;
    // 엔딩: 밤새 배송된 당 알갱이가 잎 → 줄기 → 땅속줄기를 타고 감자로 들어간다
    if (phase === 'end' && !bare) {
      const route = `M${bx} 334 L${bx} 380 C${bx} 388 ${px - (px - bx) * 0.2} ${py - 12} ${px} ${py - 6}`;
      [0, 0.55, 1.1].forEach(d0 => { const b = (0.4 + d0 + k * 0.08).toFixed(2); potatoes += `<circle r="2.6" fill="#ffd25e" opacity="0"><animateMotion dur="1.5s" begin="${b}s" repeatCount="2" path="${route}"/><animate attributeName="opacity" values="0;1;1;0" dur="1.5s" begin="${b}s" repeatCount="2"/></circle>`; });
    }
  }
  const rays = dawn ? `<g ${at('hs-rays', 0, 1)}><path d="M620 120 L250 450 L420 450 Z M620 120 L470 450 L600 450 Z M620 120 L640 450 L730 450 Z" fill="#ffe7a8" opacity=".22"/></g>` : '';
  let dew = '';
  if (dawn) for (let d = 0; d < 9; d++) dew += `<circle ${at('hs-dew', 0, 0.95, ` style="animation-delay:${(4.6 + d * 0.15).toFixed(2)}s"`)} cx="${104 + d * 72}" cy="${232 + (d % 2) * 6}" r="2.6" fill="#e9fbff"/>`;
  const clock = phase === 'intro' ? '18:00' : phase === 'end' ? '05:00' : dawn ? '06:00' : '22:00';
  const cls = `hero-svg${dawn ? ' dawn' : ''}${anim ? '' : ' settled'}`;
  return `<svg ${bare ? 'xmlns="http://www.w3.org/2000/svg" ' : `class="${cls}" `}viewBox="0 0 800 460" role="img" aria-label="${dawn ? '밤이 지나고 해가 떠오르는 스마트팜 유리 온실' : '해가 지고 LED가 켜진 스마트팜 유리 온실'}">` +
    '<defs><linearGradient id="hsDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4f2"/><stop offset=".7" stop-color="#ffd9a6"/><stop offset="1" stop-color="#ffb07a"/></linearGradient>' +
    '<linearGradient id="hsNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b1d"/><stop offset="1" stop-color="#26305e"/></linearGradient>' +
    '<filter id="hsGlow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="6"/></filter></defs>' +
    `<rect width="800" height="460" fill="url(#hsDay)"/><rect ${at('hs-night', 1, 0)} width="800" height="460" fill="url(#hsNight)"/>${stars}` +
    `<g ${at('hs-sun', 0, 1)}><circle cx="640" cy="120" r="46" fill="#ffd25e"/><circle cx="640" cy="120" r="70" fill="#ffd25e" opacity=".25"/></g>` +
    `<g ${at('hs-moon', 1, 0)}><circle cx="150" cy="95" r="30" fill="#f3f0d0"/><circle cx="163" cy="86" r="28" fill="#0d1430"/></g>` +
    // 유리 온실 틀
    '<path d="M40 200 L400 70 L760 200 Z" fill="rgba(255,255,255,.10)" stroke="#e9f1ff" stroke-width="5" stroke-linejoin="round"/>' +
    '<path d="M400 70 V200 M220 135 V200 M580 135 V200" stroke="#e9f1ff" stroke-width="3" opacity=".7"/>' +
    '<rect x="40" y="200" width="720" height="250" fill="rgba(255,255,255,.07)" stroke="#e9f1ff" stroke-width="5"/>' +
    '<path d="M220 200 V450 M400 200 V450 M580 200 V450" stroke="#e9f1ff" stroke-width="2.5" opacity=".45"/>' +
    // LED 조명
    `<g ${at('hs-led', 1, 0)}><rect x="70" y="214" width="660" height="7" rx="3" fill="#c79bff" filter="url(#hsGlow)"/><rect x="70" y="214" width="660" height="7" rx="3" fill="#e5d2ff"/>` +
    '<rect x="70" y="318" width="660" height="7" rx="3" fill="#c79bff" filter="url(#hsGlow)"/><rect x="70" y="318" width="660" height="7" rx="3" fill="#e5d2ff"/>' +
    '<path d="M80 221 L60 262 H740 L720 221 Z M80 325 L60 372 H740 L720 325 Z" fill="#b48cff" opacity=".18"/></g>' +
    `<rect ${at('hs-ledoff', 0, 1)} x="70" y="214" width="660" height="7" rx="3" fill="#56608f"/><rect ${at('hs-ledoff', 0, 1)} x="70" y="318" width="660" height="7" rx="3" fill="#56608f"/>` +
    // 선반
    `${rays}<rect x="62" y="262" width="676" height="12" rx="4" fill="#f4f7ff" stroke="#c6cde6"/>${top}${dew}` +
    `<rect x="62" y="372" width="676" height="8" rx="3" fill="#f4f7ff" stroke="#c6cde6"/><rect x="62" y="380" width="676" height="34" fill="#6b4a2b"/>${potatoes}${mid}` +
    // 관제 콘솔 + 시계
    `<g transform="translate(660 418)"><rect width="80" height="26" rx="6" fill="#1d2547" stroke="#7fe0a8"/><circle ${bare ? '' : 'class="hs-blink" id="heroLed"'} cx="14" cy="13" r="4" fill="${phase === 'end' ? '#ff6b6b' : '#7fe0a8'}"/><text ${bare ? '' : 'id="heroClock"'} x="48" y="18" fill="#7fe0a8" font-family="monospace" font-size="14" text-anchor="middle">${clock}</text></g>` +
    '</svg>';
}
