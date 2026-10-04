/* 연구 인증서 이미지 (1080×1440 PNG)
   - 모든 미션 완료 + 사진 있음 : 실제 꽃 화분 사진 + 이름표
   - 그 밖의 경우             : 연구원 이름이 적힌 기념 화분 그림 (키운 단계까지) */
import {potSvg, svgToImage} from './plant.js';

const W = 1080, H = 1440;
const DISPLAY = "'PyeongChangPeace-Bold','LotteMartDream',sans-serif", BODY = "'LotteMartDream',sans-serif";

function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function fit(ctx, text, max, size, family, weight = '') {
  let s = size; do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > max && s > 12); return text;
}

/* 사진 목록 중 첫 번째로 열리는 사진 (preferred 먼저) */
export async function loadPhoto(list, preferred) {
  const order = [preferred, ...list.filter(x => x !== preferred)].filter(Boolean);
  for (const src of order) { try { return {img: await loadImage(src), src}; } catch { /* 다음 사진 */ } }
  return null;
}

/* d: {title, tier:{badge,title}, speed, complete, photo(Image|null), plantName, leader, members[], teamLabel,
       stage, bonus[], timeText, statsText, dateText} */
export async function drawCertificate(d) {
  try { await Promise.all(["40px 'PyeongChangPeace-Bold'", "700 30px 'LotteMartDream'", "400 30px 'LotteMartDream'"].map(f => document.fonts.load(f))); await document.fonts.ready; } catch { /* 글꼴을 못 불러오면 기본 글꼴 */ }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // 배경: 온실 관제 화면
  ctx.fillStyle = '#0E3B39'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#ffffff0d'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = '#8BD450'; ctx.lineWidth = 6; round(ctx, 30, 30, W - 60, H - 60, 36); ctx.stroke();

  // 머리말
  ctx.textAlign = 'center'; ctx.fillStyle = '#8BD450'; ctx.font = `700 30px ${BODY}`;
  ctx.fillText('SMART FARM BIO LAB · DAY ZONE', W / 2, 108);
  ctx.fillStyle = '#FFFFFF'; ctx.font = `86px ${DISPLAY}`; ctx.fillText(d.title, W / 2, 200);
  ctx.fillStyle = '#FFD23F'; fit(ctx, `${d.tier.badge} ${d.tier.title}`, W - 200, 52, BODY, 700); ctx.fillText(`${d.tier.badge} ${d.tier.title}`, W / 2, 272);

  // 폴라로이드 액자
  const fx = 110, fy = 312, fw = 860, fh = 860;
  ctx.save(); ctx.shadowColor = '#0008'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#FFFDF6'; round(ctx, fx, fy, fw, fh, 26); ctx.fill(); ctx.restore();
  const ix = fx + 34, iy = fy + 34, iw = fw - 68, ih = 640;
  ctx.save(); round(ctx, ix, iy, iw, ih, 14); ctx.clip();
  if (d.photo) {
    const s = Math.max(iw / d.photo.width, ih / d.photo.height), w = d.photo.width * s, h = d.photo.height * s;
    ctx.drawImage(d.photo, ix + (iw - w) / 2, iy + (ih - h) / 2, w, h);
  } else {
    const pot = await svgToImage(potSvg({stage: d.stage, bonus: d.bonus, plantName: d.plantName, tagText: d.tagText}));
    const s = Math.max(iw / 800, ih / 640), w = 800 * s, h = 640 * s;
    ctx.drawImage(pot, ix + (iw - w) / 2, iy + (ih - h) / 2, w, h);
  }
  ctx.restore();

  // 사진 위 이름표
  if (d.photo && d.plantName) {
    ctx.save(); ctx.translate(ix + iw - 210, iy + ih - 120); ctx.rotate(-0.08);
    ctx.fillStyle = '#C79A6B'; ctx.fillRect(-8, 40, 16, 120);
    ctx.fillStyle = '#FFF8E1'; ctx.strokeStyle = '#C79A6B'; ctx.lineWidth = 6; round(ctx, -170, -40, 340, 96, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3B2A1A'; ctx.textAlign = 'center'; fit(ctx, d.plantName, 300, 50, BODY, 700); ctx.fillText(d.plantName, 0, 26);
    ctx.restore();
  }

  // 액자 아래 글: 연구원 이름·시간
  ctx.textAlign = 'center'; ctx.fillStyle = '#3B2A1A';
  const names = [d.leader ? `★ ${d.leader}` : '', ...(d.members || [])].filter(Boolean).join('   ');
  fit(ctx, names, fw - 80, 40, BODY, 700); ctx.fillText(names, W / 2, iy + ih + 70);
  ctx.fillStyle = '#8A4A2A'; fit(ctx, d.timeText, fw - 80, 32, BODY, 700); ctx.fillText(d.timeText, W / 2, iy + ih + 122);

  // 아래 정보 (양쪽 도장과 겹치지 않도록 가운데 600px 안에)
  const mid = 600;
  ctx.fillStyle = '#E6FAF2'; fit(ctx, d.teamLabel, mid, 46, BODY, 700); ctx.fillText(d.teamLabel, W / 2, 1246);
  ctx.fillStyle = '#FFD23F'; fit(ctx, d.scoreText, mid, 28, BODY, 700); ctx.fillText(d.scoreText, W / 2, 1292);
  ctx.fillStyle = '#A9CFC6'; fit(ctx, d.statsText, mid, 24, BODY, 700); ctx.fillText(d.statsText, W / 2, 1330);
  fit(ctx, `${d.dateText} · FARM-OS 인증`, mid, 22, BODY, 400); ctx.fillText(`${d.dateText} · FARM-OS 인증`, W / 2, 1366);

  // 도장
  const stamp = (x, y, text, color, rot) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 0, 72, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 59, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; const [a, b] = text; fit(ctx, a, 96, 26, BODY, 700); ctx.fillText(a, 0, b ? -4 : 9);
    if (b) { fit(ctx, b, 96, 22, BODY, 700); ctx.fillText(b, 0, 24); } ctx.restore();
  };
  stamp(950, 1290, d.complete ? ['복구', '완료'] : ['진행', '인증'], d.complete ? '#8BD450' : '#FFD23F', -0.25);
  if (d.speed) stamp(130, 1290, ['⚡', 'SPEED'], '#FF8A3D', 0.2);
  return c;
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob(file => {
    if (!file) return;
    const a = document.createElement('a'), url = URL.createObjectURL(file);
    a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}
