/* 🌙 밤의 온실 장면 SVG (1600×900) — 낮 온실과 같은 유리 아치·땅·단말기 배치, 달과 별, 식물 없음
   - data-lock  : 색이 다른 장치 신호 → 암호·힌트 장치 창 (LOCK 4~8)
   - data-decoy : 평범한 신호 → 관제 AI 플로 말풍선
   - data-game  : 시설물 → 보너스 게임 (재가동 코어)
   좌표 숫자만 바꾸면 위치를 옮길 수 있어요. *_KEY는 색이 다른 신호의 번호(0부터). */

// LOCK 4 당 화물: 체관 배송관을 따라 흐르는 당 화물 상자
const CARGO = [[400, 585], [490, 572], [580, 590], [680, 575], [770, 592], [870, 576], [960, 590], [1050, 574], [1140, 588]];
const CARGO_KEY = 6;
// LOCK 5 에너지: 공중에 떠 있는 에너지(kcal) 신호
const ENERGY = [[430, 300], [520, 360], [455, 445], [610, 280], [640, 420], [545, 500]];
const ENERGY_KEY = 3;
// LOCK 6 바이오 트윈: 심박·혈당 신호
const PULSE = [[740, 300], [830, 250], [905, 330], [790, 420], [880, 470], [960, 410]];
const PULSE_KEY = 4;
// LOCK 7 프로토콜 칩
const CHIP = [[1030, 300], [1110, 260], [1180, 330], [1050, 420], [1140, 450], [1215, 400]];
const CHIP_KEY = 1;
// LOCK 8 운영 계획: 밤하늘의 별
const STAR = [[150, 90], [300, 60], [560, 70], [700, 40], [980, 60], [1120, 40], [1300, 80], [1240, 165], [1540, 60], [240, 200]];
const STAR_KEY = 7;

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

const KIND = {
  cargo:    {pts: CARGO,  key: CARGO_KEY,  label: '당 화물',      fill: '#C9C3F0', keyFill: '#FF5FA2', ink: '#2A2560'},
  energy:   {pts: ENERGY, key: ENERGY_KEY, label: '에너지 신호',  fill: '#FFF0A8', keyFill: '#FF8A3D', ink: '#5A4A00'},
  twin:     {pts: PULSE,  key: PULSE_KEY,  label: '혈당 신호',    fill: '#FFC2CF', keyFill: '#B07CFF', ink: '#5C1C2E'},
  protocol: {pts: CHIP,   key: CHIP_KEY,   label: '프로토콜 칩',  fill: '#A9C4D6', keyFill: '#3EC6E0', ink: '#16303D'},
  plan:     {pts: STAR,   key: STAR_KEY,   label: '별 신호',      fill: '#FFE9A8', keyFill: '#FF5FA2', ink: '#5A4A00'}
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
  // 별
  const r1 = isKey ? 30 : 18, r2 = r1 * 0.45, pts = Array.from({length: 10}, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="#fff" stroke-width="${isKey ? 4 : 2}" stroke-linejoin="round"/>`;
}

function signal(kind, i, x, y, isKey, st) {
  const K = KIND[kind], done = st.done.includes(kind), locked = isKey && !st.open(kind);
  const fill = isKey ? (done ? '#9BE564' : locked ? '#7A7FA8' : K.keyFill) : K.fill;
  const attrs = isKey ? `data-lock="${kind}" class="mol key ${done ? 'solved' : ''} ${locked ? 'locked' : ''}" aria-label="${done ? '복구 완료된 장치' : locked ? '잠긴 장치' : '색이 다른 신호 · 암호 장치 열기'}"`
                      : `data-decoy="${kind}" class="mol decoy" aria-label="평범한 ${K.label}"`;
  return `<g ${attrs} role="button" tabindex="0" style="--bob:${(i % 4) * 0.45}s">
    <g class="bob">
      ${isKey && !done && !locked ? `<circle class="ping" cx="${x}" cy="${y}" r="40" fill="none" stroke="${K.keyFill}" stroke-width="5"/>` : ''}
      ${shape(kind, x, y, fill, isKey)}
      ${isKey && done ? `<circle cx="${x + 26}" cy="${y - 26}" r="15" fill="#173b1c" stroke="#9BE564" stroke-width="3"/><text x="${x + 26}" y="${y - 20}" text-anchor="middle" font-size="18" fill="#9BE564">✓</text>` : ''}
      ${locked ? `<text x="${x}" y="${y + 52}" text-anchor="middle" font-size="22">🔒</text>` : ''}
    </g></g>`;
}

function coreObject(key, cfg, st) {
  const unlocked = st.done.includes(cfg.unlockBy), cleared = st.bonus.includes(key);
  const cls = `facility ${unlocked ? 'open' : 'locked'} ${cleared ? 'cleared' : ''}`;
  const lit = cleared ? '#FFD23F' : unlocked ? '#FF8FC2' : '#5B6190';
  const nameW = Math.round([...cfg.place].length * 21 + 36), ax = 170, ay = 455;
  return `<g class="${cls}" data-game="${key}" role="button" tabindex="0" aria-label="${esc(cfg.place)} ${unlocked ? '보너스 게임 열기' : '잠김'}">
    <rect x="60" y="430" width="230" height="215" fill="#fff" fill-opacity="0"/>
    <rect x="95" y="590" width="150" height="50" rx="10" fill="#23275A" stroke="#9AA7FF" stroke-width="4"/>
    <circle cx="170" cy="540" r="62" fill="#14163A" stroke="#9AA7FF" stroke-width="5"/>
    <circle cx="170" cy="540" r="42" fill="none" stroke="${lit}" stroke-width="6" stroke-dasharray="${cleared ? '0' : '14 10'}" class="${unlocked && !cleared ? 'core-spin' : ''}"/>
    <circle cx="170" cy="540" r="22" fill="${lit}" opacity="${cleared ? 1 : unlocked ? 0.85 : 0.45}"/>
    ${[115, 145, 195, 225].map(x => `<circle cx="${x}" cy="615" r="6" fill="${unlocked ? '#9BE564' : '#FF5A4E'}"/>`).join('')}
    <g class="tag" transform="translate(${ax} ${ay - 34})">
      <rect class="name" x="${-nameW / 2}" y="-21" width="${nameW}" height="38" rx="19"/><text class="name" y="5" text-anchor="middle">${esc(cfg.place)}</text>
      <g class="badge ${cleared ? 'clear' : unlocked ? 'bonus' : 'lock'}" transform="translate(${nameW / 2 + (unlocked ? 58 : 24)} -2)">
        ${unlocked ? `<rect class="b-shadow" x="-50" y="-14" width="100" height="32" rx="16"/><rect class="b-face" x="-50" y="-18" width="100" height="32" rx="16"/>
        <text class="b-text" y="4" text-anchor="middle">${cleared ? '✓ CLEAR' : '★ BONUS'}</text>`
        : `<circle r="17" fill="#23275A" stroke="#9AA7FF" stroke-width="2"/><text y="6" text-anchor="middle" font-size="16">🔒</text>`}
      </g>
    </g>
  </g>`;
}

/* st = {done:[키], bonus:[키], open:k=>열 수 있는지, keys:[미션 키 순서], dawn:true면 새벽(모두 복구)}
   opts.bare = true → 클릭 요소·글씨 없이 그림만 (인증서·완료 화면용) */
export function nightSceneSvg(st, games, opts = {}) {
  const keys = st.keys, n = keys.filter(k => st.done.includes(k)).length, all = n === keys.length, dawn = !!st.dawn;
  const lamp = i => st.done.includes(keys[i]);
  const sky = dawn ? ['#3B3F8F', '#FF9B6B'] : ['#0B0E2B', '#2B2F6B'];
  const bg = `<defs>
    <linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <linearGradient id="nsoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2A2A"/><stop offset="1" stop-color="#1C1418"/></linearGradient>
    <linearGradient id="nglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9D2FF" stop-opacity=".22"/><stop offset="1" stop-color="#ffffff" stop-opacity=".05"/></linearGradient>
    <radialGradient id="nmoon"><stop offset="0" stop-color="#F3F0D0" stop-opacity=".7"/><stop offset="1" stop-color="#F3F0D0" stop-opacity="0"/></radialGradient>
    <radialGradient id="ndawn" cx=".5" cy="1" r=".8"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".9"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
    <linearGradient id="nled" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E5D2FF"/><stop offset="1" stop-color="#B48CFF" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#nsky)"/>
  ${dawn ? '<rect width="1600" height="900" fill="url(#ndawn)"/><circle cx="1240" cy="640" r="90" fill="#FFD23F" opacity=".9"/>' : ''}
  <g fill="#fff" opacity="${dawn ? 0.35 : 0.8}">${[[80, 140], [380, 120], [460, 30], [640, 150], [820, 90], [900, 20], [1040, 140], [1220, 130], [1380, 30], [1500, 240], [60, 300], [1560, 330]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 2 : 3}"/>`).join('')}</g>
  <circle cx="1400" cy="150" r="170" fill="url(#nmoon)" opacity="${dawn ? 0.3 : 1}"/>
  <g opacity="${dawn ? 0.5 : 1}"><circle cx="1400" cy="150" r="64" fill="#F3F0D0"/><circle cx="1428" cy="132" r="58" fill="${sky[0]}"/></g>

  <!-- 온실 (낮과 같은 유리 아치) · 달빛 반사 -->
  <path d="M330 640 V300 Q330 210 420 190 L800 110 L1180 190 Q1270 210 1270 300 V640Z" fill="url(#nglass)" stroke="#DDE2FF" stroke-width="10" stroke-linejoin="round"/>
  <g stroke="#DDE2FF" stroke-width="5" opacity=".55"><line x1="800" y1="110" x2="800" y2="640"/><line x1="565" y1="160" x2="565" y2="640"/><line x1="1035" y1="160" x2="1035" y2="640"/><line x1="330" y1="420" x2="1270" y2="420"/></g>
  <path d="M1180 205 L1230 230 L1100 600 L1060 590Z" fill="#ffffff" opacity=".07"/>

  <!-- 야간 조명 5줄: 장치를 복구할 때마다 하나씩 켜져요 -->
  ${keys.map((k, i) => { const x = 420 + i * 190; return `<g class="nlamp ${lamp(i) ? 'on' : ''}"><rect x="${x - 60}" y="232" width="120" height="12" rx="6" fill="${lamp(i) ? '#E5D2FF' : '#3B3F70'}"/>${lamp(i) ? `<path d="M${x - 58} 244 L${x - 90} 400 H${x + 90} L${x + 58} 244Z" fill="url(#nled)" opacity=".35"/>` : ''}</g>`; }).join('')}

  <!-- 체관 배송관 -->
  <path d="M340 588 Q800 560 1260 588" fill="none" stroke="#9AA7FF" stroke-width="16" opacity=".35" stroke-linecap="round"/>

  <!-- 관제 단말기 (낮의 FARM-OS 자리) -->
  <g class="terminal ${all ? 'ok' : 'glitch'}">
    <rect x="1290" y="455" width="190" height="112" rx="12" fill="#14163A" stroke="#C9D3DC" stroke-width="5"/>
    <rect x="1375" y="567" width="20" height="73" fill="#5B6670"/>
    ${opts.bare ? '' : `<text x="1385" y="488" text-anchor="middle" font-size="19" font-weight="900" fill="${all ? '#8BD450' : '#FF8FC2'}">관제 AI 플로</text>`}
    ${keys.map((k, i) => `<circle cx="${1315 + i * 35}" cy="520" r="10" fill="${st.done.includes(k) ? '#8BD450' : '#FF5A4E'}" class="${st.done.includes(k) ? '' : 'blink'}"/>`).join('')}
    ${opts.bare ? '' : `<text x="1385" y="553" text-anchor="middle" font-size="15" fill="#E6E8FF">${all ? 'ONLINE' : `${n}/${keys.length} 복구`}</text>`}
  </g>

  <!-- 땅 -->
  <path d="M0 640 Q800 610 1600 640 V900 H0Z" fill="url(#nsoil)"/>
  <path d="M0 640 Q800 610 1600 640 V656 Q800 626 0 656Z" fill="#4A4F8A"/>`;
  if (opts.bare) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">${bg}</svg>`;
  const signals = keys.map(k => KIND[k].pts.map(([x, y], i) => signal(k, i, x, y, i === KIND[k].key, st)).join('')).join('');
  const facilities = Object.entries(games).map(([g, cfg]) => coreObject(g, cfg, st)).join('');
  return `<svg class="world" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-label="밤의 온실">${bg}${facilities}${signals}</svg>`;
}
