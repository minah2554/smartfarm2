/* 🌙 밤 구역 연구 인증서 (1080×1440 PNG) — 낮 cert.js와 같은 틀·같은 위치, 밤 색과 밤 구역 그림만 달라요.
   그림 속 글씨는 웹 글꼴이 적용되지 않으니, 글씨는 모두 캔버스에 본문 글꼴로 직접 써요. */
import {svgToImage} from '../plant.js';

const W = 1080, H = 1440;
const DISPLAY = "'PyeongChangPeace-Bold','LotteMartDream',sans-serif", BODY = "'LotteMartDream',sans-serif";
const LAV = '#9AA7FF', DEEP = '#14163A', MOON = '#F3F0D0', STAR = '#FFE9A8';

function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fit(ctx, text, max, size, family, weight = '') { let s = size; do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > max && s > 12); return text; }

/* d: {title, tier:{badge,title}, speed, complete, sceneSvg(문자열), leader, members[], teamLabel, timeText, scoreText, statsText, dateText, word} */
export async function drawNightCertificate(d) {
  try { await Promise.all(["40px 'PyeongChangPeace-Bold'", "700 30px 'LotteMartDream'", "400 30px 'LotteMartDream'"].map(f => document.fonts.load(f))); await document.fonts.ready; } catch { /* 기본 글꼴 */ }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // 배경: 밤의 관제실
  ctx.fillStyle = DEEP; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#ffffff0d'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = STAR; [[90, 60], [240, 40], [860, 50], [1000, 90], [60, 300], [1030, 330]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); });
  ctx.strokeStyle = LAV; ctx.lineWidth = 6; round(ctx, 30, 30, W - 60, H - 60, 36); ctx.stroke();

  // 머리말
  ctx.textAlign = 'center'; ctx.fillStyle = LAV; ctx.font = `700 30px ${BODY}`;
  ctx.fillText('SMART FARM BIO LAB · NIGHT ZONE', W / 2, 108);
  ctx.fillStyle = '#FFFFFF'; ctx.font = `86px ${DISPLAY}`; ctx.fillText(d.title, W / 2, 200);
  ctx.fillStyle = '#FFD23F'; fit(ctx, `${d.tier.badge} ${d.tier.title}`, W - 200, 52, BODY, 700); ctx.fillText(`${d.tier.badge} ${d.tier.title}`, W / 2, 272);

  // 액자: 밤의 온실 그림
  const fx = 110, fy = 312, fw = 860, fh = 860;
  ctx.save(); ctx.shadowColor = '#0008'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#FBFAF2'; round(ctx, fx, fy, fw, fh, 26); ctx.fill(); ctx.restore();
  const ix = fx + 34, iy = fy + 34, iw = fw - 68, ih = 640;
  ctx.save(); round(ctx, ix, iy, iw, ih, 14); ctx.clip();
  try {
    const img = await svgToImage(d.sceneSvg);
    const s = Math.max(iw / 1600, ih / 900), w = 1600 * s, h = 900 * s;
    ctx.drawImage(img, ix + (iw - w) / 2, iy + (ih - h) / 2, w, h);
  } catch { ctx.fillStyle = '#23275A'; ctx.fillRect(ix, iy, iw, ih); }
  ctx.restore();
  // 그림 위 명령어 띠
  if (d.word) {
    ctx.save(); ctx.fillStyle = '#14163Acc'; round(ctx, ix + iw / 2 - 250, iy + 26, 500, 76, 38); ctx.fill();
    ctx.fillStyle = MOON; ctx.textAlign = 'center'; fit(ctx, d.word, 460, 44, BODY, 700); ctx.fillText(d.word, W / 2, iy + 78); ctx.restore();
  }

  // 액자 아래 글: 연구원 이름·시간
  ctx.textAlign = 'center'; ctx.fillStyle = '#23275A';
  const names = [d.leader ? `★ ${d.leader}` : '', ...(d.members || [])].filter(Boolean).join('   ');
  fit(ctx, names, fw - 80, 40, BODY, 700); ctx.fillText(names, W / 2, iy + ih + 70);
  ctx.fillStyle = '#5B4BB0'; fit(ctx, d.timeText, fw - 80, 32, BODY, 700); ctx.fillText(d.timeText, W / 2, iy + ih + 122);

  // 아래 정보 (양쪽 도장과 겹치지 않게 가운데 600px)
  const mid = 600;
  ctx.fillStyle = '#E6E8FF'; fit(ctx, d.teamLabel, mid, 46, BODY, 700); ctx.fillText(d.teamLabel, W / 2, 1246);
  ctx.fillStyle = '#FFD23F'; fit(ctx, d.scoreText, mid, 28, BODY, 700); ctx.fillText(d.scoreText, W / 2, 1292);
  ctx.fillStyle = '#B8C0F0'; fit(ctx, d.statsText, mid, 24, BODY, 700); ctx.fillText(d.statsText, W / 2, 1330);
  fit(ctx, `${d.dateText} · 관제 AI 플로 인증`, mid, 22, BODY, 400); ctx.fillText(`${d.dateText} · 관제 AI 플로 인증`, W / 2, 1366);

  // 도장
  const stamp = (x, y, text, color, rot) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 0, 72, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 59, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; const [a, b] = text; fit(ctx, a, 96, 26, BODY, 700); ctx.fillText(a, 0, b ? -4 : 9);
    if (b) { fit(ctx, b, 96, 22, BODY, 700); ctx.fillText(b, 0, 24); } ctx.restore();
  };
  stamp(950, 1290, d.complete ? ['재가동', '완료'] : ['진행', '인증'], d.complete ? '#8BD450' : '#FFD23F', -0.25);
  if (d.speed) stamp(130, 1290, ['⚡', 'SPEED'], '#FF8A3D', 0.2);
  return c;
}
