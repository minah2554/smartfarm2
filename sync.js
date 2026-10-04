/* 모둠 진행 상황 저장·공유
   - local   : 이 브라우저(localStorage)에 모든 모둠 기록을 모아 둔다. 같은 기기의 다른 탭(관리자 화면)에 바로 반영.
   - firebase: Firebase Realtime Database REST API로 /smartfarm/teams/{모둠ID} 에 저장. 관리자 화면이 4초마다 불러온다.
   저장 내용: 반·모둠 번호, 진행 단계, 힌트 연 단계, 보너스 게임, 시작·완료 시각. (이름·학번 없음) */
import {CONFIG} from './config.js';

const KEY = 'sf2-teams';
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sf2-sync') : null;
const base = () => (CONFIG.sync?.firebaseDatabaseURL || '').replace(/\/+$/, '');
const remote = () => CONFIG.sync?.mode === 'firebase' && base();

function readLocal() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); return d && typeof d === 'object' ? d : {}; } catch { return {}; }
}
function writeLocal(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* 저장이 막힌 브라우저 */ } }

export async function pushTeam(record) {
  const rec = {...record, updatedAt: Date.now()};
  const all = readLocal(); all[rec.id] = rec; writeLocal(all);
  channel?.postMessage('update');
  if (remote()) {
    try { await fetch(`${base()}/smartfarm/teams/${encodeURIComponent(rec.id)}.json`, {method: 'PUT', body: JSON.stringify(rec)}); }
    catch { /* 네트워크가 끊겨도 수업은 계속 진행 */ }
  }
}

export async function fetchTeams() {
  if (remote()) {
    try {
      const r = await fetch(`${base()}/smartfarm/teams.json`, {cache: 'no-store'});
      if (r.ok) return (await r.json()) || {};
    } catch { /* 아래 로컬 기록으로 대체 */ }
  }
  return readLocal();
}

export async function clearTeams() {
  writeLocal({}); channel?.postMessage('update');
  if (remote()) { try { await fetch(`${base()}/smartfarm/teams.json`, {method: 'DELETE'}); } catch { /* 무시 */ } }
}

export function watchTeams(callback) {
  const onStorage = e => { if (e.key === KEY) callback(); };
  window.addEventListener('storage', onStorage);
  if (channel) channel.onmessage = () => callback();
  const timer = remote() ? setInterval(callback, 4000) : null;
  return () => { window.removeEventListener('storage', onStorage); if (channel) channel.onmessage = null; if (timer) clearInterval(timer); };
}

export const syncLabel = () => remote() ? '실시간 공유 (Firebase)' : '이 기기만 (로컬 미리보기)';
