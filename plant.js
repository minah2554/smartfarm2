/* 식물 그림
   - plantSvg : 온실 장면 속 식물 (성장 단계 = 복구한 장치 수)
   - potSvg   : 인증서·완료 화면용 기념 화분 (햇빛 + 이름표)
   보너스 게임 성공 개수만큼 토마토가 열린다. 순간 관찰 성공 → 잎이 무성, 숨은 물건 찾기 성공 → 잎이 넓게 */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[c]));

// 줄기·잎·꽃·토마토 (320×320 좌표, 줄기 밑동 160,249)
function plantParts(n, bonuses) {
  const leafy = bonuses.includes('observation'), broad = bonuses.includes('hidden');
  const height = [25, 78, 118, 146][n], top = 236 - height, h = 249 - top;
  const leaves = n === 0 ? [[-15, top + 8], [15, top + 8]] : [[-34, top + h * .38], [36, top + h * .26], [-40, top + h * .6], [35, top + h * .68], ...(leafy ? [[-46, top + h * .18], [48, top + h * .48], [-43, top + h * .78], [44, top + h * .84]] : [])];
  const rx = broad ? 30 : 22;
  const leafMarkup = leaves.map(([x, y], i) => `<ellipse cx="${160 + x}" cy="${y}" rx="${rx}" ry="11" fill="${i % 2 ? '#51b574' : '#65c989'}" transform="rotate(${x < 0 ? -24 : 24} ${160 + x} ${y})"/>`).join('');
  const flower = n >= 3 ? `<g><circle cx="160" cy="${top - 6}" r="19" fill="#ffe278"/>${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="160" cy="${top - 29}" rx="10" ry="17" fill="#ffda77" transform="rotate(${a} 160 ${top - 6})"/>`).join('')}<circle cx="160" cy="${top - 6}" r="10" fill="#f7a746"/></g>` : n === 2 ? `<ellipse cx="160" cy="${top - 5}" rx="12" ry="17" fill="#f5b75c"/>` : '';
  // 토마토: 보너스 성공 개수만큼 (최대 3개)
  const spots = [[118, top + h * .5], [203, top + h * .4], [182, top + h * .74]];
  const count = n === 0 ? 0 : Math.min(3, bonuses.length);
  const tomatoes = spots.slice(0, count).map(([x, y]) => `<g><circle cx="${x}" cy="${y}" r="16" fill="#ef6254"/><circle cx="${x - 5}" cy="${y - 5}" r="4" fill="#fff" opacity=".45"/><path d="M${x - 6} ${y - 15}l6 6 6-6" stroke="#3f8a4c" stroke-width="4" fill="none" stroke-linecap="round"/></g>`).join('');
  return `<path d="M160 249Q${160 + (n ? 12 : 0)} ${top + 70} 160 ${top}" stroke="#3f9a62" stroke-width="${n ? 10 : 6}" fill="none" stroke-linecap="round"/>${leafMarkup}${flower}${tomatoes}`;
}

export function plantSvg(completed, bonuses, name = '', bare = false) {
  const n = Math.min(3, completed.length);
  const bg = bare ? '' : `<rect width="320" height="320" rx="30" fill="#e9f6e7"/><circle cx="260" cy="65" r="28" fill="#ffe49b"/><path d="M0 262Q160 245 320 262V320H0" fill="#b9dfaa"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${esc(name || '우리 식물')}">${bg}${plantParts(n, bonuses)}<path d="M100 245h120l-12 60H112z" fill="#bd7853"/><path d="M98 244h124" stroke="#925738" stroke-width="10" stroke-linecap="round"/><text x="160" y="299" text-anchor="middle" font-size="15" fill="#fff" font-weight="bold">${esc(name)}</text></svg>`;
}

/* 기념 화분 (800×640, 인증서 사진 칸과 같은 비율) — 햇살이 비치는 창가의 작은 화분
   opts: {stage, bonus[], plantName, tagText} */
export function potSvg(o) {
  const n = Math.min(3, o.stage || 0);
  const tag = o.plantName || o.tagText || '';
  const tagSize = Math.min(34, Math.floor(140 / (Math.max(1, [...tag].length) * 0.95)));
  const font = `font-family="'LotteMartDream',sans-serif" font-weight="700"`;
  const SX = 680, SY = 92;
  const ray = (t, w) => { const r = d => d * Math.PI / 180; return `M${SX} ${SY} L${(SX + Math.cos(r(t)) * 1100).toFixed(0)} ${(SY + Math.sin(r(t)) * 1100).toFixed(0)} L${(SX + Math.cos(r(t + w)) * 1100).toFixed(0)} ${(SY + Math.sin(r(t + w)) * 1100).toFixed(0)}Z`; };
  const rays = [[118, 6], [131, 4], [142, 7], [156, 4], [168, 6]].map(([t, w], i) => `<path d="${ray(t, w)}" fill="#FFF1B0" opacity="${i % 2 ? .32 : .5}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 640" role="img" aria-label="${esc(tag || '우리 식물')} 화분">
  <defs>
    <linearGradient id="pbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4D2"/><stop offset=".55" stop-color="#EEF8E4"/><stop offset="1" stop-color="#E0F1D3"/></linearGradient>
    <radialGradient id="psun"><stop offset="0" stop-color="#FFF8C8"/><stop offset=".45" stop-color="#FFE780" stop-opacity=".55"/><stop offset="1" stop-color="#FFE780" stop-opacity="0"/></radialGradient>
    <radialGradient id="pglow"><stop offset="0" stop-color="#FFF3B8" stop-opacity=".8"/><stop offset="1" stop-color="#FFF3B8" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="800" height="640" fill="url(#pbg)"/>
  ${rays}
  <circle cx="${SX}" cy="${SY}" r="190" fill="url(#psun)"/>
  <g stroke="#FFC933" stroke-width="9" stroke-linecap="round">${Array.from({length: 12}, (_, i) => { const a = i * 30 * Math.PI / 180; return `<line x1="${(SX + Math.cos(a) * 76).toFixed(1)}" y1="${(SY + Math.sin(a) * 76).toFixed(1)}" x2="${(SX + Math.cos(a) * 96).toFixed(1)}" y2="${(SY + Math.sin(a) * 96).toFixed(1)}"/>`; }).join('')}</g>
  <circle cx="${SX}" cy="${SY}" r="56" fill="#FFD84D" stroke="#FFF3B0" stroke-width="10"/>
  <ellipse cx="400" cy="330" rx="230" ry="240" fill="url(#pglow)"/>
  <g fill="#fff" opacity=".7"><ellipse cx="130" cy="96" rx="70" ry="20"/><ellipse cx="176" cy="80" rx="46" ry="24"/></g>
  <path d="M0 585 Q400 552 800 585 V640 H0Z" fill="#CDE8BE"/>
  <ellipse cx="400" cy="606" rx="120" ry="12" fill="#9CC48A" opacity=".55"/>
  <!-- 식물 (크게) -->
  <g transform="translate(120 64) scale(1.75)">${plantParts(n, o.bonus || [])}</g>
  <!-- 작은 화분 -->
  <path d="M308 526 H492 L474 604 H326 Z" fill="#C8754A"/>
  <path d="M308 526 H492 L488 544 H312 Z" fill="#A85C36" opacity=".35"/>
  <rect x="294" y="496" width="212" height="36" rx="13" fill="#A85C36"/>
  <ellipse cx="400" cy="502" rx="96" ry="7" fill="#6B3E26"/>
  <path d="M400 584 c-12 0 -19 -9 -19 -19 c10 0 19 7 19 19z M400 584 c12 0 19 -9 19 -19 c-10 0 -19 7 -19 19z" fill="#F4C9A8" opacity=".9"/>
  <!-- 이름표 -->
  ${tag ? `<g transform="rotate(-6 600 470)">
    <rect x="594" y="468" width="11" height="84" rx="4" fill="#C79A6B"/>
    <rect x="520" y="410" width="166" height="64" rx="13" fill="#FFF8E1" stroke="#C79A6B" stroke-width="5"/>
    <circle cx="536" cy="426" r="4.5" fill="#C79A6B"/>
    <text x="603" y="${442 + tagSize * 0.36}" text-anchor="middle" ${font} font-size="${tagSize}" fill="#3B2A1A">${esc(tag)}</text>
  </g>` : ''}
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
