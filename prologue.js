/* ☀️ 낮 구역 프롤로그 — 장면 그림 (SVG 1600×900)
   자막·제목은 content.js의 prologue에서 고쳐요. 이 파일은 그림만 그려요. */

const GH = `<path d="M330 640 V300 Q330 210 420 190 L800 110 L1180 190 Q1270 210 1270 300 V640Z" fill="#ffffff14" stroke="#F4FFFB" stroke-width="10" stroke-linejoin="round"/>
  <g stroke="#F4FFFB" stroke-width="5" opacity=".6"><line x1="800" y1="110" x2="800" y2="640"/><line x1="565" y1="160" x2="565" y2="640"/><line x1="1035" y1="160" x2="1035" y2="640"/><line x1="330" y1="420" x2="1270" y2="420"/></g>`;

const leafPath = 'M800 170 C1080 230 1210 470 1060 700 C980 815 860 840 800 840 C740 840 620 815 540 700 C390 470 520 230 800 170Z';

const scenes = {
  // 1. 06:00 새벽 → 해가 뜬다
  dawn: () => `
  <defs>
    <linearGradient id="pdawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FA8DC"/><stop offset=".55" stop-color="#F9C784"/><stop offset="1" stop-color="#FFE3B3"/></linearGradient>
    <linearGradient id="pnight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0E2B"/><stop offset="1" stop-color="#2B2F6B"/></linearGradient>
    <radialGradient id="psunG"><stop offset="0" stop-color="#FFF6C2"/><stop offset="1" stop-color="#FFF6C2" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#pdawn)"/>
  <rect width="1600" height="900" fill="url(#pnight)" class="pro-fadeout"/>
  <g class="pro-fadeout" fill="#fff">${[[160, 90], [420, 160], [700, 70], [980, 140], [1260, 80], [1480, 190], [300, 260], [1120, 250]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>
  <g class="pro-sunrise"><circle cx="1240" cy="640" r="260" fill="url(#psunG)"/><circle cx="1240" cy="640" r="96" fill="#FFD23F" stroke="#FFF1A8" stroke-width="10"/></g>
  ${GH}
  <path d="M0 640 Q800 610 1600 640 V900 H0Z" fill="#3F2A1C"/>
  <path d="M0 640 Q800 610 1600 640 V662 Q800 632 0 662Z" fill="#6DBF4B"/>
  <g transform="translate(800 640)"><path d="M0 0 Q6 -60 0 -110" stroke="#3f9a62" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="-30" cy="-80" rx="34" ry="13" fill="#65c989" transform="rotate(-24 -30 -80)"/><ellipse cx="32" cy="-58" rx="34" ry="13" fill="#51b574" transform="rotate(24 32 -58)"/></g>
  <g class="pro-in" style="animation-delay:.4s"><rect x="40" y="100" width="440" height="150" rx="28" fill="#0B1514cc"/><text x="260" y="215" text-anchor="middle" class="pro-clock" style="font-size:112px">06:00</text></g>`,

  // 2. 바이오 트윈 경보 기록
  log: () => `
  <rect width="1600" height="900" fill="#0B1514"/>
  <g transform="translate(330 330) scale(.7)"><g class="pro-twin">
    <circle cx="0" cy="-230" r="70" fill="none" stroke="#9AA7FF" stroke-width="8"/>
    <path d="M-120 230 V-60 Q-120 -140 0 -140 Q120 -140 120 -60 V230" fill="none" stroke="#9AA7FF" stroke-width="8"/>
    <path d="M-60 -40 Q0 40 60 -40" fill="none" stroke="#FF5A4E" stroke-width="8" class="pro-blink"/>
    <text y="300" text-anchor="middle" class="pro-label" fill="#CDD3FF" style="font-size:44px">바이오 트윈 #0214</text>
    <text y="345" text-anchor="middle" class="pro-small" style="font-size:30px">우리 또래 중학생의 몸 시뮬레이터</text>
  </g></g>
  <g transform="translate(680 80)">
    <rect width="760" height="480" rx="24" fill="#10201F" stroke="#FF5A4E" stroke-width="5"/>
    <rect width="760" height="70" rx="24" fill="#3A1414"/><rect y="40" width="760" height="30" fill="#3A1414"/>
    <text x="34" y="46" class="pro-mono" fill="#FFB0A8">⚠ BIO-TWIN #0214 · 경보 기록</text>
    ${['22:00  나이트 모드 전환', '23:40  당 화물 대량 도착', '01:15  혈당 경보 발령', '05:58  재가동 완료 ✔'].map((t, i) => `<text x="40" y="${140 + i * 62}" class="pro-mono pro-line" style="animation-delay:${0.3 + i * 0.35}s" fill="${i === 3 ? '#8BD450' : '#CDE9E1'}">${t}</text>`).join('')}
    <rect x="28" y="370" width="704" height="84" rx="14" fill="#FFD23F1f" stroke="#FFD23F" stroke-width="3" class="pro-line" style="animation-delay:2s"/>
    <text x="58" y="424" class="pro-mono pro-line" style="animation-delay:2.1s" fill="#FFD23F">?  남은 질문 1건</text>
  </g>`,

  // 3. 출발점은 잎
  leaf: () => `
  <defs><radialGradient id="pleafG" cx=".45" cy=".4"><stop offset="0" stop-color="#9BE564"/><stop offset="1" stop-color="#3F9A62"/></radialGradient></defs>
  <rect width="1600" height="900" fill="#E9F6E7"/>
  <g stroke="#FFE27A" stroke-width="22" opacity=".5" stroke-linecap="round">${[0, 1, 2, 3].map(i => `<line x1="${1500 - i * 30}" y1="${-40 + i * 40}" x2="${1080 - i * 90}" y2="${300 + i * 70}" class="pro-ray" style="animation-delay:${i * 0.25}s"/>`).join('')}</g>
  <g transform="translate(240 20) scale(.7)"><g class="pro-zoom">
    <path d="${leafPath}" fill="url(#pleafG)" stroke="#2F7A4F" stroke-width="8"/>
    <path d="M800 840 V200" stroke="#2F7A4F" stroke-width="10"/>
    <g stroke="#2F7A4F" stroke-width="6" fill="none">${[300, 420, 540, 660].map(y => `<path d="M800 ${y + 60} Q${700} ${y} ${600} ${y - 10}"/><path d="M800 ${y + 60} Q${900} ${y} ${1000} ${y - 10}"/>`).join('')}</g>
    <g fill="#1F6B3A">${[[690, 380], [910, 360], [650, 520], [960, 500], [720, 640], [880, 650], [800, 300]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="15" class="pro-pulse" style="animation-delay:${i * 0.2}s"/>`).join('')}</g>
  </g></g>
  <g class="pro-in" style="animation-delay:1.2s"><g transform="translate(330 330)"><rect x="-150" y="-44" width="300" height="70" rx="35" fill="#0B2A28"/><text y="4" text-anchor="middle" class="pro-label" fill="#9BE564">🟢 엽록체 = 당 공장</text></g></g>`,

  // 4. FARM-OS 오작동
  glitch: () => `
  <rect width="1600" height="900" fill="#1A0B0B"/>
  <rect width="1600" height="900" fill="#FF5A4E" class="pro-flash"/>
  <g class="pro-shake">
    <rect x="500" y="200" width="600" height="420" rx="30" fill="#0F3D3A" stroke="#C9D3DC" stroke-width="8"/>
    <rect x="780" y="620" width="40" height="150" fill="#5B6670"/>
    <text x="800" y="320" text-anchor="middle" class="pro-big" fill="#FF5A4E">FARM-OS</text>
    ${[0, 1, 2].map(i => `<circle cx="${700 + i * 100}" cy="420" r="30" fill="#FF5A4E" class="pro-blink" style="animation-delay:${i * 0.2}s"/>`).join('')}
    <text x="800" y="540" text-anchor="middle" class="pro-mono" fill="#FFB0A8">PHOTOSYNTHESIS CONTROL · STOP</text>
  </g>
  <g class="pro-scan">${Array.from({length: 7}, (_, i) => `<rect x="0" y="${i * 130}" width="1600" height="${8 + (i % 3) * 6}" fill="#ffffff" opacity=".08"/>`).join('')}</g>`,

  // 5. 낮 구역 피해 3가지
  damage: () => `
  <rect width="1600" height="900" fill="#0E3B39"/>
  ${[
    {x: 160, t: '배관 이름표 뒤섞임', c: '#3EC6E0', art: `<g stroke="#3EC6E0" stroke-width="16" fill="none" stroke-linecap="round"><path d="M60 300 V180 H180 V90"/><path d="M240 300 V200 H140"/></g><g font-size="40">${[['?', 150, 160], ['?', 230, 260]].map(([t, x, y]) => `<g transform="translate(${x} ${y})"><rect x="-26" y="-34" width="52" height="46" rx="8" fill="#FFF8E1"/><text y="2" text-anchor="middle" fill="#C0392B" font-weight="700">${t}</text></g>`).join('')}</g>`},
    {x: 620, t: 'CO₂ 실험 기록 조작', c: '#FF8A3D', art: `<rect x="60" y="60" width="180" height="240" rx="12" fill="#F4FFFB"/><g stroke="#9AB" stroke-width="6">${[110, 150, 190, 230].map(y => `<line x1="90" y1="${y}" x2="210" y2="${y}"/>`).join('')}</g><path d="M90 120 L210 260 M210 120 L90 260" stroke="#FF5A4E" stroke-width="16" stroke-linecap="round"/>`},
    {x: 1080, t: '엽록체 합성 엔진 정지', c: '#B07CFF', art: `<g transform="translate(150 180)" class="pro-dim"><circle r="90" fill="none" stroke="#8C98A4" stroke-width="22" stroke-dasharray="36 18"/><ellipse rx="54" ry="32" fill="#4A5A50"/></g><text x="150" y="330" text-anchor="middle" font-size="34" fill="#FF5A4E" font-weight="700">OFF</text>`}
  ].map((p, i) => `<g class="pro-card" style="animation-delay:${0.3 + i * 0.7}s"><g transform="translate(${p.x} 70)">
      <rect width="360" height="460" rx="28" fill="#0B2A28" stroke="${p.c}" stroke-width="5"/>
      <g transform="translate(30 30)">${p.art}</g>
      <text x="180" y="420" text-anchor="middle" class="pro-label" fill="#E6FAF2">${p.t}</text></g></g>`).join('')}`,

  // 6. 낮의 핵심 원리: 재료 → 포도당 → 녹말 → (밤) 설탕 · 체관
  principle: () => `
  <rect width="1600" height="900" fill="#F4FFFB"/>
  <g transform="translate(160 30) scale(.8)">
  <path d="M800 260 C960 290 1030 420 950 560 C900 640 830 650 800 650 C770 650 700 640 650 560 C570 420 640 290 800 260Z" fill="#65C989" stroke="#2F7A4F" stroke-width="7"/>
  <text x="800" y="470" text-anchor="middle" class="pro-label" fill="#173B1C">잎 · 엽록체</text>
  ${[
    {x: 260, y: 300, c: '#3EC6E0', t: '물 H₂O', d: 0},
    {x: 260, y: 560, c: '#8C98A4', t: '이산화탄소 CO₂', d: .4},
    {x: 800, y: 110, c: '#FFC21A', t: '☀️ 빛 에너지', d: .8}
  ].map(o => `<g class="pro-in" style="animation-delay:${o.d}s"><rect x="${o.x - 150}" y="${o.y - 40}" width="300" height="72" rx="36" fill="${o.c}"/><text x="${o.x}" y="${o.y + 8}" text-anchor="middle" class="pro-label" fill="#0B2A28">${o.t}</text></g>`).join('')}
  <g stroke="#2F7A71" stroke-width="8" fill="none" stroke-linecap="round" class="pro-in" style="animation-delay:1.1s"><path d="M410 300 Q540 320 620 380"/><path d="M410 560 Q540 540 620 500"/><path d="M800 150 V250"/></g>
  <g class="pro-in" style="animation-delay:1.6s"><polygon points="1110,330 1150,307 1190,330 1190,376 1150,399 1110,376" fill="#FFD23F" stroke="#C99A00" stroke-width="5"/><text x="1150" y="440" text-anchor="middle" class="pro-small" style="fill:#5A4A00">포도당</text></g>
  <path d="M970 400 H1090" stroke="#2F7A71" stroke-width="8" class="pro-in" style="animation-delay:1.5s"/>
  <g class="pro-in" style="animation-delay:2.3s">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${1250 + (i % 3) * 52}" y="${360 - Math.floor(i / 3) * 44}" width="46" height="38" rx="6" fill="#F4E3B5" stroke="#B08A3A" stroke-width="4"/>`).join('')}<text x="1328" y="440" text-anchor="middle" class="pro-small" style="fill:#5A4A00">녹말 저장</text></g>
  <path d="M1200 352 H1240" stroke="#2F7A71" stroke-width="8" class="pro-in" style="animation-delay:2.2s"/>
  <g class="pro-in" style="animation-delay:3.2s">
    <rect x="1000" y="490" width="520" height="170" rx="26" fill="#14163A"/>
    <circle cx="1070" cy="545" r="32" fill="#F3F0D0"/><circle cx="1084" cy="535" r="30" fill="#14163A"/>
    <text x="1130" y="553" class="pro-label" fill="#E6E8FF">밤: 녹말 → 설탕</text>
    <rect x="1040" y="585" width="440" height="34" rx="17" fill="#3B3F8F"/>
    ${[0, 1, 2].map(i => `<rect x="${1060 + i * 30}" y="592" width="20" height="20" rx="4" fill="#fff" class="pro-flow" style="animation-delay:${3.4 + i * 0.4}s"/>`).join('')}
    <text x="1260" y="648" text-anchor="middle" class="pro-small" style="fill:#B9C2FF">체관을 따라 이동</text>
  </g>
  </g>`,

  // 7. 작전 개시: LOCK 1~3
  mission: () => `
  <defs><linearGradient id="pmis" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FDCEB"/><stop offset="1" stop-color="#FFE3B3"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#pmis)"/>
  <g class="pro-sunset"><circle cx="1380" cy="170" r="80" fill="#FFD23F" stroke="#FFF1A8" stroke-width="10"/></g>
  ${GH}
  <path d="M0 640 Q800 610 1600 640 V900 H0Z" fill="#6B3E26"/>
  ${[
    {x: 470, icon: '💧', t: 'LOCK 1', s: '수분 펌프', c: '#3EC6E0'},
    {x: 800, icon: '🌬️', t: 'LOCK 2', s: 'CO₂ 밸브', c: '#FF8A3D'},
    {x: 1130, icon: '☀️', t: 'LOCK 3', s: '엽록체 엔진', c: '#B07CFF'}
  ].map((l, i) => `<g class="pro-card" style="animation-delay:${0.3 + i * 0.5}s"><g transform="translate(${l.x} 400)">
      <rect x="-130" y="-150" width="260" height="300" rx="30" fill="#0B2A28" stroke="${l.c}" stroke-width="6"/>
      <text y="-40" text-anchor="middle" font-size="90">${l.icon}</text>
      <text y="50" text-anchor="middle" class="pro-big" style="font-size:50px" fill="${l.c}">${l.t}</text>
      <text y="105" text-anchor="middle" class="pro-label" fill="#E6FAF2">${l.s}</text></g></g>`).join('')}`
};

export const prologueScene = key => `<svg class="pro-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${(scenes[key] || scenes.dawn)()}</svg>`;
