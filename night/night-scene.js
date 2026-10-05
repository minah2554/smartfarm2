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

/* ═════════════════════════════════════════════════════════════
   🌙 밤의 온실 지도 (1600×900) — 과학쌤 낮 온실과 같은 틀(유리 아치·땅·단말기·시설물)
   온실 안: 밤에도 자라는 딸기·토마토 재배 베드 / 땅속: 뿌리·감자, 체관 배송관(당 화물)
   - data-lock  : 색이 다른 신호 → LOCK 화면 열기
   - data-decoy : 평범한 신호 → 관제 AI 플로 말풍선
   - data-game  : 재가동 코어 → 보너스 게임
   좌표 숫자만 바꾸면 위치를 옮길 수 있어요. *_KEY는 색이 다른 신호의 번호(0부터). */
// LOCK 4 당 화물: 땅속 체관 배송관을 따라 뿌리 저장고로 가는 당 화물
const CARGO = [[395, 806], [485, 796], [575, 810], [665, 798], [755, 812], [845, 799], [935, 811], [1025, 797], [1115, 809]];
const CARGO_KEY = 6;
// LOCK 5 에너지 신호
const ENERGY = [[430, 290], [520, 350], [455, 425], [610, 268], [640, 395], [560, 448]];
const ENERGY_KEY = 3;
// LOCK 6 혈당 신호
const PULSE = [[740, 288], [830, 240], [905, 318], [790, 398], [880, 440], [962, 372]];
const PULSE_KEY = 4;
// LOCK 7 프로토콜 칩
const CHIP = [[1030, 290], [1110, 250], [1180, 322], [1050, 400], [1140, 432], [1215, 378]];
const CHIP_KEY = 1;
// LOCK 8 밤하늘의 별
const STAR = [[150, 90], [300, 60], [560, 70], [700, 40], [980, 60], [1120, 40], [1300, 80], [1240, 165], [1540, 60], [240, 200]];
const STAR_KEY = 7;

const escN = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const KIND = {
  cargo:    {pts: CARGO,  key: CARGO_KEY,  label: '당 화물',     fill: '#C9C3F0', keyFill: '#FF5FA2', ink: '#2A2560'},
  energy:   {pts: ENERGY, key: ENERGY_KEY, label: '에너지 신호', fill: '#FFF0A8', keyFill: '#FF8A3D', ink: '#5A4A00'},
  twin:     {pts: PULSE,  key: PULSE_KEY,  label: '혈당 신호',   fill: '#FFC2CF', keyFill: '#B07CFF', ink: '#5C1C2E'},
  protocol: {pts: CHIP,   key: CHIP_KEY,   label: '프로토콜 칩', fill: '#A9C4D6', keyFill: '#3EC6E0', ink: '#16303D'},
  plan:     {pts: STAR,   key: STAR_KEY,   label: '별 신호',     fill: '#FFE9A8', keyFill: '#FF5FA2', ink: '#5A4A00'}
};

function shape(kind, x, y, fill, isKey) {
  const sw = isKey ? 5 : 3;
  if (kind === 'cargo') return `<rect x="${x - 30}" y="${y - 26}" width="60" height="52" rx="10" fill="${fill}" stroke="#fff" stroke-width="${sw}"/>
    <path d="M${x - 30} ${y - 8} H${x + 30} M${x} ${y - 26} V${y - 8}" stroke="#ffffff99" stroke-width="3"/><text x="${x}" y="${y + 17}" text-anchor="middle" font-size="18" font-weight="900" fill="${isKey ? '#fff' : KIND.cargo.ink}">당</text>`;
  if (kind === 'energy') return `<circle cx="${x}" cy="${y}" r="30" fill="${fill}" stroke="#fff" stroke-width="${sw}"/>
    <path d="M${x + 4} ${y - 20} L${x - 10} ${y + 3} H${x + 1} L${x - 4} ${y + 20} L${x + 11} ${y - 4} H${x}Z" fill="${isKey ? '#fff' : KIND.energy.ink}"/>`;
  if (kind === 'twin') return `<circle cx="${x}" cy="${y}" r="30" fill="${fill}" stroke="#fff" stroke-width="${sw}"/>
    <path d="M${x - 20} ${y + 2} H${x - 9} L${x - 4} ${y - 12} L${x + 3} ${y + 14} L${x + 8} ${y + 2} H${x + 20}" fill="none" stroke="${isKey ? '#fff' : KIND.twin.ink}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (kind === 'protocol') return `<rect x="${x - 27}" y="${y - 27}" width="54" height="54" rx="8" fill="${fill}" stroke="#fff" stroke-width="${sw}"/>
    <g stroke="${fill}" stroke-width="5">${[-14, 0, 14].map(d => `<line x1="${x + d}" y1="${y - 36}" x2="${x + d}" y2="${y - 28}"/><line x1="${x + d}" y1="${y + 28}" x2="${x + d}" y2="${y + 36}"/>`).join('')}</g>
    <text x="${x}" y="${y + 9}" text-anchor="middle" font-size="24" font-weight="900" fill="${isKey ? '#fff' : KIND.protocol.ink}">P</text>`;
  const r1 = isKey ? 30 : 18, r2 = r1 * 0.45, pts = Array.from({length: 10}, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="#fff" stroke-width="${isKey ? 4 : 2}" stroke-linejoin="round"/>`;
}
function signal(kind, i, x, y, isKey, st) {
  const K = KIND[kind], done = st.done.includes(kind), locked = isKey && !st.open(kind);
  const fill = isKey ? (done ? '#9BE564' : locked ? '#7A7FA8' : K.keyFill) : K.fill;
  const attrs = isKey ? `data-lock="${kind}" class="mol key ${done ? 'solved' : ''} ${locked ? 'locked' : ''}" aria-label="${done ? '복구 완료된 장치' : locked ? '잠긴 장치' : '색이 다른 신호 · LOCK 열기'}"`
                      : `data-decoy="${kind}" class="mol decoy" aria-label="평범한 ${K.label}"`;
  return `<g ${attrs} role="button" tabindex="0" style="--bob:${(i % 4) * 0.45}s"><g class="bob">
    ${isKey && !done && !locked ? `<circle class="ping" cx="${x}" cy="${y}" r="40" fill="none" stroke="${K.keyFill}" stroke-width="5"/>` : ''}
    ${shape(kind, x, y, fill, isKey)}
    ${isKey && done ? `<circle cx="${x + 26}" cy="${y - 26}" r="15" fill="#173b1c" stroke="#9BE564" stroke-width="3"/><text x="${x + 26}" y="${y - 20}" text-anchor="middle" font-size="18" fill="#9BE564">✓</text>` : ''}
    ${locked ? `<text x="${x}" y="${y + 52}" text-anchor="middle" font-size="22">🔒</text>` : ''}
  </g></g>`;
}
function coreObject(key, cfg, st) {
  const unlocked = st.done.includes(cfg.unlockBy), cleared = st.bonus.includes(key);
  const lit = cleared ? '#FFD23F' : unlocked ? '#FF8FC2' : '#5B6190';
  const nameW = Math.round([...cfg.place].length * 21 + 36), ax = 170, ay = 455;
  return `<g class="facility ${unlocked ? 'open' : 'locked'} ${cleared ? 'cleared' : ''}" data-game="${key}" role="button" tabindex="0" aria-label="${escN(cfg.place)} ${unlocked ? '보너스 게임 열기' : '잠김'}">
    <rect x="60" y="430" width="230" height="215" fill="#fff" fill-opacity="0"/>
    ${coreArt(lit, unlocked, cleared)}
    <g class="tag" transform="translate(${ax} ${ay - 34})">
      <rect class="name" x="${-nameW / 2}" y="-21" width="${nameW}" height="38" rx="19"/><text class="name" y="5" text-anchor="middle">${escN(cfg.place)}</text>
      <g class="badge ${cleared ? 'clear' : unlocked ? 'bonus' : 'lock'}" transform="translate(${nameW / 2 + (unlocked ? 58 : 24)} -2)">
        ${unlocked ? `<rect class="b-shadow" x="-50" y="-14" width="100" height="32" rx="16"/><rect class="b-face" x="-50" y="-18" width="100" height="32" rx="16"/><text class="b-text" y="4" text-anchor="middle">${cleared ? '✓ CLEAR' : '★ BONUS'}</text>`
        : '<circle r="17" fill="#23275A" stroke="#9AA7FF" stroke-width="2"/><text y="6" text-anchor="middle" font-size="16">🔒</text>'}
      </g></g></g>`;
}
const coreArt = (lit, unlocked, cleared) => `<rect x="95" y="590" width="150" height="50" rx="10" fill="#23275A" stroke="#9AA7FF" stroke-width="4"/>
    <circle cx="170" cy="540" r="62" fill="#14163A" stroke="#9AA7FF" stroke-width="5"/>
    <circle cx="170" cy="540" r="42" fill="none" stroke="${lit}" stroke-width="6" stroke-dasharray="${cleared ? '0' : '14 10'}" class="${unlocked && !cleared ? 'core-spin' : ''}"/>
    <circle cx="170" cy="540" r="22" fill="${lit}" opacity="${cleared ? 1 : unlocked ? 0.85 : 0.45}"/>
    ${[115, 145, 195, 225].map(x => `<circle cx="${x}" cy="615" r="6" fill="${unlocked ? '#9BE564' : '#FF5A4E'}"/>`).join('')}`;

/* 재배 베드의 작물: 딸기(짝수)·토마토(홀수). 밤에는 꽃봉오리가 닫혀 있고, 새벽엔 피어요 */
function crop(x, base, i, dawn) {
  const tomato = i % 2 === 1, h = tomato ? 92 + (i % 3) * 8 : 58 + (i % 3) * 6, top = base - h;
  const lv = tomato ? '#3E9E63' : '#45A86A', lv2 = tomato ? '#2F7F50' : '#368A57';
  let g = `<path d="M${x} ${base} Q${x + (i % 2 ? 8 : -8)} ${base - h * 0.55} ${x} ${top}" stroke="#2F7D4E" stroke-width="${tomato ? 6 : 5}" fill="none" stroke-linecap="round"/>`;
  const leaves = tomato ? [[-20, 0.3], [22, 0.45], [-24, 0.62], [20, 0.8], [-12, 0.96]] : [[-22, 0.35], [22, 0.45], [-16, 0.8], [16, 0.88]];
  g += leaves.map(([dx, t], k) => { const ly = base - h * t; return `<ellipse cx="${x + dx}" cy="${ly}" rx="${tomato ? 17 : 19}" ry="${tomato ? 8 : 11}" fill="${k % 2 ? lv : lv2}" transform="rotate(${dx < 0 ? -28 : 28} ${x + dx} ${ly})"/>`; }).join('');
  // 꽃봉오리(밤) · 꽃(새벽)
  const fx = x + (tomato ? 10 : -6), fy = top - 4;
  g += dawn ? `<g>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${fx}" cy="${fy - 6}" rx="4.5" ry="6.5" fill="${tomato ? '#FFE27A' : '#ffffff'}" transform="rotate(${a} ${fx} ${fy})"/>`).join('')}<circle cx="${fx}" cy="${fy}" r="3.5" fill="#F7A746"/></g>`
    : `<ellipse cx="${fx}" cy="${fy}" rx="4" ry="7" fill="${tomato ? '#C9D86A' : '#E8F0D8'}"/><path d="M${fx - 4} ${fy + 4} l4 3 4-3" stroke="#2F7D4E" stroke-width="2" fill="none"/>`;
  // 열매
  if (tomato) {
    [[-16, 0.52, 11], [14, 0.66, 13], [-6, 0.78, 9]].forEach(([dx, t, r], k) => { const cx = x + dx, cy = base - h * t + 14, ripe = dawn || k !== 2;
      g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ripe ? '#EF5A4C' : '#9BCB5A'}"/><circle cx="${cx - r * 0.35}" cy="${cy - r * 0.35}" r="${r * 0.28}" fill="#fff" opacity=".4"/><path d="M${cx - 5} ${cy - r + 1} l5 4 5-4" stroke="#2F7D4E" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; });
  } else {
    [[-20, 0.18], [18, 0.24]].forEach(([dx, t]) => { const cx = x + dx, cy = base - h * t + 8;
      g += `<path d="M${cx} ${cy + 13} C${cx - 13} ${cy + 2} ${cx - 10} ${cy - 9} ${cx} ${cy - 7} C${cx + 10} ${cy - 9} ${cx + 13} ${cy + 2} ${cx} ${cy + 13}Z" fill="#FF4F6A"/><path d="M${cx - 6} ${cy - 8} l6 4 6-4" stroke="#2F7D4E" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
        [[-4, -1], [3, 0], [-1, 5], [4, 6]].map(([a, b]) => `<circle cx="${cx + a}" cy="${cy + b}" r="1.1" fill="#FFE27A"/>`).join(''); });
  }
  return g;
}

/* st = {done:[키], bonus:[키], open:k=>열 수 있는지, keys:[미션 키 순서], dawn:true면 새벽(모두 복구)}
   opts.bare = true → 클릭 요소·글씨 없이 그림만 (인증서용) */
export function nightSceneSvg(st, games, opts = {}) {
  const keys = st.keys, n = keys.filter(k => st.done.includes(k)).length, all = n === keys.length, dawn = !!st.dawn;
  const lamp = i => st.done.includes(keys[i]), cargoOk = st.done.includes('cargo');
  const sky = dawn ? ['#3B3F8F', '#FF9B6B'] : ['#0B0E2B', '#2B2F6B'];
  const cropsX = [395, 470, 545, 620, 695, 770, 845, 920, 995, 1070, 1145, 1210];
  const bedTop = 588;
  // 땅속: 뿌리·감자
  const roots = cropsX.map((x, i) => `<path d="M${x} 650 q${i % 2 ? 10 : -10} 26 ${i % 2 ? 4 : -6} 52 M${x} 652 q-16 18 -26 34 M${x} 652 q18 16 24 38" stroke="#C9A77A" stroke-width="2.4" fill="none" opacity=".75" stroke-linecap="round"/>`).join('');
  const potatoes = [[440, 718, 30], [610, 726, 26], [780, 714, 32], [955, 728, 27], [1120, 716, 30], [525, 742, 18], [870, 744, 20], [1200, 742, 18]].map(([x, y, r], i) =>
    `<path d="M${x} ${y - r * 0.6} q${i % 2 ? -14 : 14} -22 ${i % 2 ? -6 : 8} -48" stroke="#E8D3A8" stroke-width="3" fill="none"/><ellipse cx="${x}" cy="${y}" rx="${dawn ? r * 1.15 : r}" ry="${(dawn ? r * 1.15 : r) * 0.66}" fill="#D9A85B" stroke="#B8863F" stroke-width="2.5"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.15}" r="2" fill="#A87533"/><circle cx="${x + r * 0.35}" cy="${y + r * 0.12}" r="2" fill="#A87533"/>`).join('');
  const pebbles = [[60, 700], [190, 760], [280, 860], [1330, 720], [1450, 800], [1540, 870], [120, 840], [1400, 880], [330, 740], [1270, 860]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${8 + (i % 3) * 4}" ry="${5 + (i % 2) * 3}" fill="#5A4436" opacity=".7"/>`).join('');
  const flow = cargoOk ? [0, 1, 2, 3, 4, 5].map(k => `<circle r="7" fill="#FFD25E" opacity=".9"><animateMotion dur="5s" begin="${-k * 0.83}s" repeatCount="indefinite" path="M330 812 Q800 784 1270 812"/></circle>`).join('') : '';
  const bg = `<defs>
    <linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <linearGradient id="nsoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A3426"/><stop offset=".55" stop-color="#33241C"/><stop offset="1" stop-color="#1E1612"/></linearGradient>
    <linearGradient id="nglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9D2FF" stop-opacity=".22"/><stop offset="1" stop-color="#ffffff" stop-opacity=".05"/></linearGradient>
    <radialGradient id="nmoon"><stop offset="0" stop-color="#F3F0D0" stop-opacity=".7"/><stop offset="1" stop-color="#F3F0D0" stop-opacity="0"/></radialGradient>
    <radialGradient id="ndawn" cx=".5" cy="1" r=".8"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".9"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
    <linearGradient id="nled" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E5D2FF"/><stop offset="1" stop-color="#B48CFF" stop-opacity="0"/></linearGradient>
    <linearGradient id="nbed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5E36"/><stop offset="1" stop-color="#5E3D22"/></linearGradient>
    <linearGradient id="npipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9C2FF" stop-opacity=".55"/><stop offset=".5" stop-color="#7E89D6" stop-opacity=".35"/><stop offset="1" stop-color="#B9C2FF" stop-opacity=".55"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#nsky)"/>
  ${dawn ? '<rect width="1600" height="900" fill="url(#ndawn)"/><circle cx="1240" cy="640" r="90" fill="#FFD23F" opacity=".9"/>' : ''}
  <g fill="#fff" opacity="${dawn ? 0.35 : 0.8}">${[[80, 140], [380, 120], [460, 30], [640, 150], [820, 90], [900, 20], [1040, 140], [1220, 130], [1380, 30], [1500, 240], [60, 300], [1560, 330]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 2 : 3}"/>`).join('')}</g>
  <circle cx="1400" cy="150" r="170" fill="url(#nmoon)" opacity="${dawn ? 0.3 : 1}"/>
  <g opacity="${dawn ? 0.5 : 1}"><circle cx="1400" cy="150" r="64" fill="#F3F0D0"/><circle cx="1428" cy="132" r="58" fill="${sky[0]}"/></g>

  <!-- 온실 (낮과 같은 유리 아치) -->
  <path d="M330 640 V300 Q330 210 420 190 L800 110 L1180 190 Q1270 210 1270 300 V640Z" fill="url(#nglass)" stroke="#DDE2FF" stroke-width="10" stroke-linejoin="round"/>
  <g stroke="#DDE2FF" stroke-width="5" opacity=".55"><line x1="800" y1="110" x2="800" y2="${bedTop}"/><line x1="565" y1="160" x2="565" y2="${bedTop}"/><line x1="1035" y1="160" x2="1035" y2="${bedTop}"/><line x1="330" y1="420" x2="1270" y2="420"/></g>
  <path d="M1180 205 L1230 230 L1100 600 L1060 590Z" fill="#ffffff" opacity=".07"/>

  <!-- 야간 LED 5줄: LOCK을 복구할 때마다 하나씩 켜져 작물을 비춰요 -->
  ${keys.map((k, i) => { const x = 420 + i * 190; return `<g class="nlamp ${lamp(i) ? 'on' : ''}"><rect x="${x - 60}" y="232" width="120" height="12" rx="6" fill="${lamp(i) ? '#E5D2FF' : '#3B3F70'}"/>${lamp(i) ? `<path d="M${x - 58} 244 L${x - 96} ${bedTop} H${x + 96} L${x + 58} 244Z" fill="url(#nled)" opacity=".28"/>` : ''}</g>`; }).join('')}

  <!-- 관제 단말기 (낮의 FARM-OS 자리) -->
  <g class="terminal ${all ? 'ok' : 'glitch'}">
    <rect x="1290" y="455" width="190" height="112" rx="12" fill="#14163A" stroke="#C9D3DC" stroke-width="5"/>
    <rect x="1375" y="567" width="20" height="73" fill="#5B6670"/>
    ${opts.bare ? '' : `<text x="1385" y="488" text-anchor="middle" font-size="19" font-weight="900" fill="${all ? '#8BD450' : '#FF8FC2'}">관제 AI 플로</text>`}
    ${keys.map((k, i) => `<circle cx="${1315 + i * 35}" cy="520" r="10" fill="${st.done.includes(k) ? '#8BD450' : '#FF5A4E'}" class="${st.done.includes(k) ? '' : 'blink'}"/>`).join('')}
    ${opts.bare ? '' : `<text x="1385" y="553" text-anchor="middle" font-size="15" fill="#E6E8FF">${all ? 'ONLINE' : `${n}/${keys.length} 복구`}</text>`}
  </g>

  <!-- 땅 위 · 땅속 단면 -->
  <path d="M0 640 Q800 610 1600 640 V900 H0Z" fill="url(#nsoil)"/>
  <path d="M0 640 Q800 610 1600 640 V656 Q800 626 0 656Z" fill="${dawn ? '#6DBF4B' : '#3F6B4A'}"/>
  <g fill="${dawn ? '#7FD15A' : '#4E8A5C'}">${[40, 120, 230, 1300, 1460, 1560].map((x, i) => `<path d="M${x} ${641 - (i % 2) * 2} l6 -18 l4 16 l6 -22 l5 24z"/>`).join('')}</g>
  <path d="M0 690 Q800 668 1600 690" stroke="#ffffff" stroke-opacity=".05" stroke-width="2" fill="none"/>
  <path d="M0 850 Q800 830 1600 850" stroke="#ffffff" stroke-opacity=".04" stroke-width="2" fill="none"/>
  ${pebbles}${roots}${potatoes}
  <!-- 재배 베드: 딸기·토마토 -->
  <g class="crops">${cropsX.map((x, i) => crop(x, bedTop + 2, i, dawn)).join('')}</g>
  <rect x="352" y="${bedTop}" width="896" height="58" rx="8" fill="url(#nbed)" stroke="#3E2814" stroke-width="3"/>
  <rect x="352" y="${bedTop}" width="896" height="10" rx="5" fill="#A87444"/>
  ${[560, 800, 1040].map(x => `<line x1="${x}" y1="${bedTop + 10}" x2="${x}" y2="${bedTop + 58}" stroke="#4A2F18" stroke-width="3" opacity=".6"/>`).join('')}
  ${opts.bare ? '' : `<g transform="translate(800 ${bedTop + 36})"><rect x="-92" y="-15" width="184" height="28" rx="8" fill="#14163A" stroke="#9AA7FF" stroke-width="2"/><text y="5" text-anchor="middle" font-size="15" font-weight="700" fill="#E6E8FF">🍓 딸기 · 🍅 토마토 재배 베드</text></g>`}

  <!-- 체관 배송관: 잎에서 만든 당이 뿌리 저장고(감자)로 -->
  <path d="M330 812 Q800 784 1270 812" fill="none" stroke="url(#npipe)" stroke-width="64" stroke-linecap="round"/>
  <path d="M330 812 Q800 784 1270 812" fill="none" stroke="#DDE2FF" stroke-opacity=".35" stroke-width="2" stroke-dasharray="10 12"/>
  ${flow}
  ${opts.bare ? '' : `<g transform="translate(250 812)"><rect x="-112" y="-17" width="164" height="32" rx="16" fill="#14163A" stroke="#9AA7FF" stroke-width="2"/><text x="-30" y="5" text-anchor="middle" font-size="15" font-weight="700" fill="#E6E8FF">체관 배송관 →</text></g>
  <g transform="translate(1385 812)"><rect x="-82" y="-17" width="164" height="32" rx="16" fill="#14163A" stroke="#D9A85B" stroke-width="2"/><text y="5" text-anchor="middle" font-size="15" font-weight="700" fill="#F3D9A8">🥔 뿌리 저장고</text></g>`}`;
  if (opts.bare) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">${bg}<g>${coreArt(all ? '#FFD23F' : '#5B6190', all, all)}</g></svg>`;
  const signals = keys.map(k => KIND[k].pts.map(([x, y], i) => signal(k, i, x, y, i === KIND[k].key, st)).join('')).join('');
  const facilities = Object.entries(games).map(([g, cfg]) => coreObject(g, cfg, st)).join('');
  return `<svg class="world" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-label="밤의 온실">${bg}${facilities}${signals}</svg>`;
}
