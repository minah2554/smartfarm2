/* 온실 장면 SVG (1600×900). 숫자 좌표만 바꾸면 분자 위치를 옮길 수 있다.
   - data-lock  : 색이 다른 분자 → 암호·힌트 장치 창
   - data-decoy : 평범한 분자 → 안내 말풍선
   - data-game  : 시설물 → 보너스 게임 */

const WATER = [[120, 720], [250, 812], [380, 700], [470, 842], [600, 742], [690, 860], [960, 868], [1060, 716], [1180, 812], [1300, 708], [1420, 838], [1520, 730], [330, 868], [860, 760]];
const WATER_KEY = 9;      // 색이 다른 물 분자 번호 (위 목록의 순서, 0부터)
const CARBON = [[420, 262], [545, 175], [655, 330], [760, 205], [880, 160], [1010, 262], [1135, 185], [470, 430], [930, 470], [575, 560], [1215, 360]];
const CARBON_KEY = 5;
const PHOTON = [[1290, 105], [1250, 205], [1300, 295], [1395, 330], [1490, 285], [1525, 185], [1480, 60], [1385, 38]];
const PHOTON_KEY = 2;

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

function molecule(kind, i, x, y, isKey, done) {
  const cfg = {
    water: {r: 31, fill: '#3EC6E0', key: '#FF5FA2', text: 'H₂O', ink: '#06323d'},
    carbon: {r: 36, fill: '#C9D3DC', key: '#FF8A3D', text: 'CO₂', ink: '#26323c'},
    light: {r: 19, fill: '#FFF3A6', key: '#B07CFF', text: '', ink: '#5a4a00'}
  }[kind];
  const fill = isKey ? (done ? '#9BE564' : cfg.key) : cfg.fill;
  const attrs = isKey ? `data-lock="${kind}" class="mol key ${done ? 'solved' : ''}" aria-label="${done ? '복구 완료된 장치' : '색이 다른 분자 · 암호 장치 열기'}"`
                      : `data-decoy="${kind}" class="mol decoy" aria-label="평범한 분자"`;
  const bob = (i % 4) * 0.45;
  return `<g ${attrs} role="button" tabindex="0" style="--bob:${bob}s">
    <g class="bob">
      ${isKey && !done ? `<circle class="ping" cx="${x}" cy="${y}" r="${cfg.r + 6}" fill="none" stroke="${cfg.key}" stroke-width="5"/>` : ''}
      <circle cx="${x}" cy="${y}" r="${cfg.r}" fill="${fill}" stroke="#ffffff" stroke-width="${isKey ? 5 : 3}"/>
      <circle cx="${x - cfg.r * 0.35}" cy="${y - cfg.r * 0.38}" r="${cfg.r * 0.22}" fill="#ffffff" opacity=".55"/>
      ${cfg.text ? `<text x="${x}" y="${y + 8}" text-anchor="middle" font-size="${kind === 'carbon' ? 22 : 20}" font-weight="900" fill="${isKey ? '#fff' : cfg.ink}">${cfg.text}</text>` : ''}
      ${isKey && done ? `<text x="${x}" y="${y + 9}" text-anchor="middle" font-size="26" fill="#173b1c">✓</text>` : ''}
    </g></g>`;
}

function gameObject(key, cfg, state) {
  const unlocked = state.done.includes(cfg.unlockBy), cleared = state.bonus.includes(key);
  const cls = `facility ${unlocked ? 'open' : 'locked'} ${cleared ? 'cleared' : ''}`;
  const art = {
    hidden: `<ellipse cx="140" cy="643" rx="122" ry="9" fill="#000" opacity=".16"/>
             <rect x="52" y="508" width="176" height="132" rx="5" fill="url(#shedWall)"/>
             <g stroke="#7A4E2D" stroke-width="2.5" opacity=".28">${[82, 112, 142, 172, 202].map(x => `<line x1="${x}" y1="514" x2="${x}" y2="640"/>`).join('')}</g>
             <path d="M30 516 L140 436 L250 516Z" fill="url(#shedRoof)"/>
             <path d="M30 516 L140 436 L250 516 L238 516 L140 446 L42 516Z" fill="#E98676" opacity=".55"/>
             <circle cx="140" cy="488" r="13" fill="#8F5E38"/><circle cx="140" cy="488" r="9.5" fill="#CDEFF8"/><path d="M140 478.5v19M130.5 488h19" stroke="#8F5E38" stroke-width="2.2"/>
             <rect x="117" y="556" width="58" height="84" rx="5" fill="#7A4A2A"/>
             <path d="M146 560v76" stroke="#5E3720" stroke-width="2.5" opacity=".6"/><path d="M121 598l50-34M121 636l50-34" stroke="#9A6439" stroke-width="3" opacity=".7"/>
             <circle cx="166" cy="602" r="5" fill="#FFD23F"/>
             <rect x="62" y="536" width="46" height="38" rx="4" fill="#7A4A2A"/><rect x="66" y="540" width="38" height="30" rx="2" fill="#CDEFF8"/>
             <path d="M85 540v30M66 555h38" stroke="#7A4A2A" stroke-width="3"/><path d="M71 566l11-13" stroke="#fff" stroke-width="3.5" opacity=".7" stroke-linecap="round"/>
             <rect x="58" y="574" width="54" height="9" rx="3" fill="#6E4428"/>
             <g fill="#6DBF4B"><circle cx="70" cy="571" r="5"/><circle cx="85" cy="569" r="5.5"/><circle cx="100" cy="571" r="5"/></g>
             <g fill="#FF8FB8"><circle cx="70" cy="566" r="3.2"/><circle cx="90" cy="564" r="3.2"/><circle cx="102" cy="566" r="3.2"/></g>
             <path d="M212 526 L205 636" stroke="#B07C45" stroke-width="6" stroke-linecap="round"/>
             <path d="M194 624 q11 -10 22 0 l-2 16 h-18z" fill="#A9B4BE"/>
             <g fill="#6DBF4B"><path d="M36 640 l5 -14 l5 14z"/><path d="M45 640 l6 -10 l5 10z"/><path d="M234 640 l5 -12 l5 12z"/></g>`,
    observation: `<g transform="translate(285 640) scale(.62) translate(-330 -640)">
             <ellipse cx="330" cy="643" rx="80" ry="8" fill="#000" opacity=".16"/>
             <path d="M280 590 C270 542 364 542 354 590" fill="none" stroke="#4FA3D9" stroke-width="9" stroke-linecap="round"/>
             <path d="M276 596 Q276 584 288 584 H346 Q358 584 358 596 L352 630 Q351 640 341 640 H293 Q283 640 282 630Z" fill="url(#canBody)"/>
             <path d="M280 606 H354 M282 623 H352" stroke="#2E7DB5" stroke-width="3" opacity=".35"/>
             <ellipse cx="317" cy="585" rx="40" ry="8" fill="#2E7DB5"/><ellipse cx="317" cy="586" rx="31" ry="5" fill="#9ADBF7"/>
             <path d="M289 598 q-4 14 -2 28" stroke="#fff" stroke-width="5" opacity=".4" stroke-linecap="round" fill="none"/>
             <path d="M356 616 L404 572" stroke="#4FA3D9" stroke-width="11" stroke-linecap="round"/>
             <g transform="rotate(-42 412 566)"><rect x="400" y="552" width="26" height="28" rx="7" fill="#2E86C1"/>
             <g fill="#CDEFFA">${[[409, 561], [417, 561], [409, 571], [417, 571]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('')}</g></g>
             <g fill="#8FDBF7">${[[438, 574, 5], [448, 590, 6], [432, 596, 5], [424, 606, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></g>`,
    color: `<rect x="1352" y="520" width="16" height="120" fill="#5B6670"/>
             <g transform="rotate(-18 1360 500)"><rect x="1270" y="460" width="190" height="90" rx="8" fill="#2D4E7A" stroke="#C9D3DC" stroke-width="5"/>
             <g stroke="#7FA6D9" stroke-width="3">${[1318, 1365, 1412].map(x => `<line x1="${x}" y1="462" x2="${x}" y2="548"/>`).join('')}<line x1="1272" y1="505" x2="1458" y2="505"/></g></g>
             <g>${['#FF5A4E', '#3EC6E0', '#8BD450'].map((c, i) => `<circle cx="${1322 + i * 26}" cy="${600}" r="9" fill="${c}"/>`).join('')}</g>`
  }[key];
  const nameW = Math.round([...cfg.place].length * 21 + 36);
  const anchor = {hidden: [135, 452], observation: [290, 574], color: [1366, 430]}[key];
  const hit = {hidden: [25, 420, 225, 225], observation: [235, 575, 130, 70], color: [1260, 400, 210, 215]}[key];
  return `<g class="${cls}" data-game="${key}" role="button" tabindex="0" aria-label="${esc(cfg.place)} ${unlocked ? '보너스 게임 열기' : '잠김'}">
    <rect x="${hit[0]}" y="${hit[1]}" width="${hit[2]}" height="${hit[3]}" fill="#fff" fill-opacity="0"/>
    ${art}
    <g class="tag" transform="translate(${anchor[0]} ${anchor[1] - 34})">
      <rect class="name" x="${-nameW / 2}" y="-21" width="${nameW}" height="38" rx="19"/><text class="name" y="5" text-anchor="middle">${esc(cfg.place)}</text>
      <g class="badge ${cleared ? 'clear' : unlocked ? 'bonus' : 'lock'}" transform="translate(${nameW / 2 + (unlocked ? 58 : 24)} -2)">
        ${unlocked ? `<rect class="b-shadow" x="-50" y="-14" width="100" height="32" rx="16"/><rect class="b-face" x="-50" y="-18" width="100" height="32" rx="16"/>
        <text class="b-text" y="4" text-anchor="middle">${cleared ? '✓ CLEAR' : '★ BONUS'}</text>`
        : `<circle r="17" fill="#173b32" stroke="#5FA79B" stroke-width="2"/><text y="6" text-anchor="middle" font-size="16">🔒</text>`}
      </g>
    </g>
  </g>`;
}

export function sceneSvg(state, games) {
  const all = state.done.length === 3;
  const d = k => state.done.includes(k);
  return `<svg class="world" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-label="스마트팜 온실">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${all ? '#FFB86B' : '#8FDCEB'}"/><stop offset="1" stop-color="${all ? '#FFE3B3' : '#E6FAF2'}"/></linearGradient>
    <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A4A2E"/><stop offset="1" stop-color="#4A2A18"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".32"/><stop offset="1" stop-color="#ffffff" stop-opacity=".08"/></linearGradient>
    <linearGradient id="shedWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B98355"/><stop offset="1" stop-color="#8F5E38"/></linearGradient>
    <linearGradient id="shedRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DA6252"/><stop offset="1" stop-color="#A93C2F"/></linearGradient>
    <linearGradient id="canBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7CCBF2"/><stop offset="1" stop-color="#3A8FC9"/></linearGradient>
    <radialGradient id="sunglow"><stop offset="0" stop-color="#FFF6C2"/><stop offset="1" stop-color="#FFF6C2" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <circle cx="1400" cy="190" r="230" fill="url(#sunglow)" class="${d('light') ? 'sun-on' : 'sun-dim'}"/>
  <g class="sun ${d('light') ? 'sun-on' : 'sun-dim'}"><g stroke="#FFC21A" stroke-width="12" stroke-linecap="round">
    ${Array.from({length: 12}, (_, i) => `<line x1="1400" y1="68" x2="1400" y2="92" transform="rotate(${i * 30} 1400 190)"/>`).join('')}</g>
    <circle cx="1400" cy="190" r="84" fill="#FFD23F" stroke="#FFF1A8" stroke-width="8"/></g>
  <g fill="#ffffff" opacity=".75"><ellipse cx="180" cy="120" rx="90" ry="26"/><ellipse cx="240" cy="100" rx="60" ry="30"/><ellipse cx="760" cy="70" rx="70" ry="20"/></g>

  <!-- 온실 -->
  <path d="M330 640 V300 Q330 210 420 190 L800 110 L1180 190 Q1270 210 1270 300 V640Z" fill="url(#glass)" stroke="#F4FFFB" stroke-width="10" stroke-linejoin="round"/>
  <g stroke="#F4FFFB" stroke-width="5" opacity=".75"><line x1="800" y1="110" x2="800" y2="640"/><line x1="565" y1="160" x2="565" y2="640"/><line x1="1035" y1="160" x2="1035" y2="640"/><line x1="330" y1="420" x2="1270" y2="420"/></g>

  <!-- 관리 AI 단말기 -->
  <g class="terminal ${all ? 'ok' : 'glitch'}">
    <rect x="1105" y="455" width="150" height="112" rx="12" fill="#0F3D3A" stroke="#C9D3DC" stroke-width="5"/>
    <rect x="1170" y="567" width="20" height="73" fill="#5B6670"/>
    <text x="1180" y="488" text-anchor="middle" font-size="20" font-weight="900" fill="${all ? '#8BD450' : '#FF5A4E'}">FARM-OS</text>
    ${['water', 'carbon', 'light'].map((k, i) => `<circle cx="${1140 + i * 40}" cy="520" r="11" fill="${d(k) ? '#8BD450' : '#FF5A4E'}" class="${d(k) ? '' : 'blink'}"/>`).join('')}
    <text x="1180" y="553" text-anchor="middle" font-size="15" fill="#E6FAF2">${all ? 'ONLINE' : 'ERROR'}</text>
  </g>

  <!-- 땅 -->
  <path d="M0 640 Q800 610 1600 640 V900 H0Z" fill="url(#soil)"/>
  <path d="M0 640 Q800 610 1600 640 V662 Q800 632 0 662Z" fill="#6DBF4B"/>
  <g stroke="#C79A6B" stroke-width="7" fill="none" stroke-linecap="round" opacity=".85" class="${d('water') ? 'roots-wet' : ''}">
    <path d="M800 650 q-40 70 -120 96"/><path d="M800 650 q30 80 110 110"/><path d="M800 650 q-6 90 -26 170"/><path d="M780 700 q-50 20 -70 60"/></g>

  ${Object.entries(games).map(([k, cfg]) => gameObject(k, cfg, state)).join('')}

  <g class="field-water ${d('water') ? 'flowing' : ''}">${WATER.map(([x, y], i) => molecule('water', i, x, y, i === WATER_KEY, d('water'))).join('')}</g>
  <g class="field-carbon ${d('carbon') ? 'flowing' : ''}">${CARBON.map(([x, y], i) => molecule('carbon', i, x, y, i === CARBON_KEY, d('carbon'))).join('')}</g>
  <g class="field-light ${d('light') ? 'flowing' : ''}">${PHOTON.map(([x, y], i) => molecule('light', i, x, y, i === PHOTON_KEY, d('light'))).join('')}</g>
</svg>`;
}
