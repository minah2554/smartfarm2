/* 식물 그림
   - plantSvg : 온실 장면 속 식물 (성장 단계 = 복구한 장치 수, 보너스마다 모양이 달라짐)
   - potSvg   : 이름표가 꽂히고, 연구원 이름·미션 시간이 적힌 기념 화분 */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[c]));

// 줄기·잎·꽃 (320×320 좌표, 줄기 밑동 160,249)
function plantParts(n, bonuses) {
  const leafy = bonuses.includes('observation'), broad = bonuses.includes('hidden'), fruit = bonuses.includes('color');
  const height = [25, 78, 118, 146][n], top = 236 - height;
  const leaves = n === 0 ? [[-15, top + 8], [15, top + 8]] : [[-34, top + 55], [36, top + 38], [-40, top + 88], [35, top + 100], ...(leafy ? [[-46, top + 25], [48, top + 70], [-43, top + 113], [44, top + 120]] : [])];
  const rx = broad ? 30 : 22;
  const leafMarkup = leaves.map(([x, y], i) => `<ellipse cx="${160 + x}" cy="${y}" rx="${rx}" ry="11" fill="${i % 2 ? '#51b574' : '#65c989'}" transform="rotate(${x < 0 ? -24 : 24} ${160 + x} ${y})"/>`).join('');
  const flower = n >= 3 ? `<g><circle cx="160" cy="${top - 6}" r="19" fill="#ffe278"/>${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="160" cy="${top - 29}" rx="10" ry="17" fill="#ffda77" transform="rotate(${a} 160 ${top - 6})"/>`).join('')}<circle cx="160" cy="${top - 6}" r="10" fill="#f7a746"/></g>` : n === 2 ? `<ellipse cx="160" cy="${top - 5}" rx="12" ry="17" fill="#f5b75c"/>` : '';
  const tomatoes = fruit ? `<circle cx="115" cy="${top + 92}" r="17" fill="#ef6254"/><circle cx="209" cy="${top + 79}" r="16" fill="#ef6254"/><path d="M110 ${top + 77}l5 7 5-7 M204 ${top + 65}l5 7 5-7" fill="#45834c"/>` : '';
  return `<path d="M160 249Q${160 + (n ? 12 : 0)} ${top + 70} 160 ${top}" stroke="#3f9a62" stroke-width="${n ? 10 : 6}" fill="none" stroke-linecap="round"/>${leafMarkup}${flower}${tomatoes}`;
}

export function plantSvg(completed, bonuses, name = '', bare = false) {
  const n = Math.min(3, completed.length);
  const bg = bare ? '' : `<rect width="320" height="320" rx="30" fill="#e9f6e7"/><circle cx="260" cy="65" r="28" fill="#ffe49b"/><path d="M0 262Q160 245 320 262V320H0" fill="#b9dfaa"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${esc(name || '우리 식물')}">${bg}${plantParts(n, bonuses)}<path d="M100 245h120l-12 60H112z" fill="#bd7853"/><path d="M98 244h124" stroke="#925738" stroke-width="10" stroke-linecap="round"/><text x="160" y="299" text-anchor="middle" font-size="15" fill="#fff" font-weight="bold">${esc(name)}</text></svg>`;
}

/* 기념 화분 (600×720)
   opts: {stage, bonus[], plantName, tagText, leader, members[], timeText, teamLabel, background(true)} */
export function potSvg(o) {
  const n = Math.min(3, o.stage || 0);
  const names = [o.leader ? `★${o.leader}` : '', ...(o.members || [])].filter(Boolean);
  const lines = names.length > 3 ? [names.slice(0, Math.ceil(names.length / 2)), names.slice(Math.ceil(names.length / 2))] : [names];
  const font = `font-family="'LotteMartDream',sans-serif" font-weight="700"`;
  const tag = o.plantName || o.tagText || '';
  const tagSize = Math.min(36, Math.floor(165 / (Math.max(1, tag.length) * 0.95)));
  const bg = o.background === false ? '' : `<rect width="600" height="720" rx="40" fill="#EAF6E6"/><circle cx="500" cy="110" r="54" fill="#FFE49B"/><path d="M0 610 Q300 585 600 610 V720 H0Z" fill="#C9E7BD"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720" role="img" aria-label="${esc(tag || '우리 식물')} 화분">
  ${bg}
  <g transform="translate(100 120) scale(1.25)">${plantParts(n, o.bonus || [])}</g>
  <!-- 이름표 -->
  <g transform="rotate(-6 487 330)">
    <rect x="481" y="330" width="12" height="120" rx="4" fill="#C79A6B"/>
    <rect x="395" y="270" width="185" height="78" rx="14" fill="#FFF8E1" stroke="#C79A6B" stroke-width="6"/>
    <circle cx="412" cy="288" r="5" fill="#C79A6B"/>
    <text x="490" y="${tagSize > 30 ? 322 : 318}" text-anchor="middle" ${font} font-size="${tagSize}" fill="#3B2A1A">${esc(tag)}</text>
  </g>
  <!-- 화분 -->
  <path d="M120 450 H480 L452 690 H148 Z" fill="#C8754A"/>
  <path d="M120 450 H480 L474 500 H126 Z" fill="#B0623B" opacity=".45"/>
  <rect x="96" y="412" width="408" height="50" rx="18" fill="#A85C36"/>
  <ellipse cx="300" cy="420" rx="190" ry="12" fill="#6B3E26"/>
  ${lines.map((ln, i) => `<text x="300" y="${(lines.length === 1 ? 568 : 548) + i * 42}" text-anchor="middle" ${font} font-size="${ln.join(' ').length > 18 ? 26 : 32}" fill="#FFF4E6">${esc(ln.join('  '))}</text>`).join('')}
  ${o.timeText ? `<rect x="190" y="612" width="220" height="44" rx="22" fill="#FFF4E6"/><text x="300" y="642" text-anchor="middle" ${font} font-size="24" fill="#8A4A2A">${esc(o.timeText)}</text>` : ''}
  ${o.teamLabel ? `<text x="300" y="${o.timeText ? 488 : 500}" text-anchor="middle" ${font} font-size="22" fill="#FFE2C8">${esc(o.teamLabel)}</text>` : ''}
</svg>`;
}

/* SVG 문자열 → Image (캔버스에 그리기용) */
export function svgToImage(svg) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml;charset=utf-8'}));
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = e => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}
