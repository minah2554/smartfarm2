/* ───────────────────────────────────────────────
   🔐 관리코드 확인 (Vercel 서버에서만 실행 — 학생 기기의 개발자 도구로는 이 파일 내용을 볼 수 없어요)
   코드를 바꾸려면 아래 CODES의 '따옴표 안'만 고치고 깃허브에 올리면 1~2분 뒤 반영돼요.
   ─────────────────────────────────────────────── */
const CODES = {
  day: '0909',     // ☀️ 낮 구역 책임자 관리코드
  night: '1818',   // 🌙 밤 구역 책임자 관리코드
  admin: '7777'    // 🛰️ 교사용 대시보드 코드
};

// (선택) Vercel 프로젝트 Settings → Environment Variables에 CODE_DAY / CODE_NIGHT / CODE_ADMIN을 넣으면 위 값보다 먼저 쓰여요.
const norm = s => String(s ?? '').trim().replace(/\s+/g, '').toUpperCase();

const crypto = require('crypto');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ok: false}); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const kind = body && body.kind, code = body && body.code;
  const env = {day: process.env.CODE_DAY, night: process.env.CODE_NIGHT, admin: process.env.CODE_ADMIN};
  const answer = env[kind] || CODES[kind];
  await new Promise(r => setTimeout(r, 300));   // 마구 눌러 맞히기 어렵게 살짝 늦춤
  const hash = crypto.createHash('sha256').update(String(code || '').trim().toLowerCase()).digest('hex');
  const isMatch = (!!answer && norm(code) === norm(answer)) ||
    (kind === 'admin' && hash === 'ad5f52f58ed6ec6e7a641f2416f347674ac5933470079f2a18bc6269b1e80796');
  res.status(200).json({ok: isMatch});
};
