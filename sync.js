/* 모둠 기록 저장·공유
   - local   : 이 브라우저(localStorage)에만 저장. 같은 기기의 다른 탭(대시보드)에 바로 반영 — 미리보기용
   - firebase: Firebase Realtime Database REST API ( /smartfarm/teams/{모둠ID} )
               · 어느 기기로 같은 모둠에 입장해도 기록이 이어짐
               · 대시보드는 실시간 스트림(EventSource)으로 바로 갱신
   기록은 '경로: 값' 조각(patch)으로만 덧붙여 저장하므로, 같은 모둠의 여러 기기가 동시에 저장해도 서로 덮어쓰지 않아요.
   저장 내용: 학년·반·모둠, 연구원 이름, 미션 진행, 힌트 단계, 보너스 게임, 시작·완료 시각, 식물 이름 */
import {CONFIG} from './config.js';

const KEY = 'sf2-teams', PENDING = 'sf2-pending';
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sf2-sync') : null;
const base = () => (CONFIG.sync?.firebaseDatabaseURL || '').replace(/\/+$/, '');
export const isRemote = () => CONFIG.sync?.mode === 'firebase' && !!base();
export const SERVER_TIME = {'.sv': 'timestamp'};
// 수업용 주소(productionHosts)에서는 /smartfarm, 그 밖(브랜치 미리보기·내 컴퓨터)에서는 /smartfarm-preview 에 저장
// → 개발·시험 기록이 실제 수업 대시보드에 섞이지 않음
const ROOT = (() => {
  const hosts = CONFIG.sync?.productionHosts || [];
  const h = typeof location !== 'undefined' ? location.hostname : '';
  return hosts.length && !hosts.includes(h) ? 'smartfarm-preview' : 'smartfarm';
})();
export const isPreview = () => ROOT !== 'smartfarm';
const teamUrl = id => `${base()}/${ROOT}/teams/${encodeURIComponent(id)}.json`;

/* 시계: 기기마다 시계가 달라도 남은 시간이 같도록 서버 시각과의 차이를 잰다 */
let offset = 0;
export const now = () => Date.now() + offset;
export async function syncClock() {
  if (!isRemote()) return;
  try {
    const t0 = Date.now();
    const r = await fetch(`${base()}/${ROOT}/_clock.json`, {method: 'PUT', body: JSON.stringify(SERVER_TIME)});
    const t1 = Date.now(), v = await r.json();
    if (typeof v === 'number') offset = v - Math.round((t0 + t1) / 2);
  } catch { /* 실패하면 기기 시계 사용 */ }
}

/* ── 로컬 저장 ── */
function readLocal() { try { const d = JSON.parse(localStorage.getItem(KEY)); return d && typeof d === 'object' ? d : {}; } catch { return {}; } }
function writeLocal(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* 저장이 막힌 브라우저 */ } }
function setPath(obj, path, value) {
  const parts = path.split('/'); let o = obj;
  parts.slice(0, -1).forEach(p => { if (!o[p] || typeof o[p] !== 'object') o[p] = {}; o = o[p]; });
  const last = parts[parts.length - 1];
  if (value === null) delete o[last]; else o[last] = value;
}
const resolve = v => (v && typeof v === 'object' && v['.sv'] === 'timestamp') ? now() : v;
export function applyPatch(rec, patch) { Object.entries(patch).forEach(([p, v]) => setPath(rec, p, resolve(v))); return rec; }
function patchLocal(id, patch) {
  const all = readLocal(); all[id] = applyPatch(all[id] || {id}, patch); all[id].updatedAt = now(); writeLocal(all);
  channel?.postMessage(id); return all[id];
}

/* ── 서버에 못 보낸 기록은 모아 두었다가 다시 보낸다 ── */
const readPending = () => { try { return (JSON.parse(localStorage.getItem(PENDING)) || []).map((x, i) => x.uid ? x : {...x, uid: 'old' + i}); } catch { return []; } };
const writePending = q => { try { localStorage.setItem(PENDING, JSON.stringify(q)); } catch { /* 무시 */ } };
let flushing = false, again = false;
const dropFirst = uid => writePending(readPending().filter(x => x.uid !== uid));   // 보내는 동안 새로 쌓인 기록은 지우지 않음
async function flush() {
  if (!isRemote()) return;
  if (flushing) { again = true; return; }
  flushing = true;
  try {
    for (;;) {
      const q = readPending(); if (!q.length) break;
      const {id, patch, uid} = q[0];
      let r;
      try { r = await fetch(teamUrl(id), {method: 'PATCH', body: JSON.stringify({...patch, updatedAt: SERVER_TIME})}); }
      catch { break; }   // 네트워크 끊김 → 나중에 다시
      if (!r.ok) {
        console.warn('[스마트팜] Firebase 저장 실패', r.status, '— Realtime Database 규칙을 확인하세요.');
        if (r.status >= 500) break;
      }
      dropFirst(uid);
    }
  } finally {
    flushing = false;
    if (again) { again = false; flush(); }
  }
}
if (typeof window !== 'undefined') { setInterval(flush, 8000); window.addEventListener('online', flush); }

/* ── 공개 함수 ── */
export async function getTeam(id) {
  if (isRemote()) {
    try {
      const r = await fetch(teamUrl(id), {cache: 'no-store'});
      if (r.ok) {
        let rec = await r.json();
        // 아직 서버에 못 보낸 기록이 있으면 덧붙여서 화면이 뒤로 가지 않게 한다
        // (서버 시각 자리표시는 저장 순간의 시각으로 고정해 두었다가 덧붙인다 — 다시 불러올 때마다 시각이 바뀌지 않도록)
        readPending().filter(x => x.id === id).forEach(x => { rec = applyPatch(rec || {id}, x.local || x.patch); });
        if (rec) { const all = readLocal(); all[id] = rec; writeLocal(all); }
        return rec || null;
      }
    } catch { /* 아래 로컬 기록으로 대체 */ }
  }
  return readLocal()[id] || null;
}

export async function patchTeam(id, patch) {
  const rec = patchLocal(id, patch);
  if (isRemote()) {
    const local = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, resolve(v)]));
    writePending([...readPending(), {id, patch, local, uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}]); await flush();
  }
  return rec;
}

export async function fetchTeams() {
  if (isRemote()) {
    try { const r = await fetch(`${base()}/${ROOT}/teams.json`, {cache: 'no-store'}); if (r.ok) return (await r.json()) || {}; }
    catch { /* 아래 로컬 기록으로 대체 */ }
  }
  return readLocal();
}

export async function deleteTeam(id) {
  const all = readLocal(); delete all[id]; writeLocal(all); channel?.postMessage(id);
  if (isRemote()) { try { await fetch(teamUrl(id), {method: 'DELETE'}); } catch { /* 무시 */ } }
}
export async function clearTeams() {
  writeLocal({}); writePending([]); channel?.postMessage('*');
  if (isRemote()) { try { await fetch(`${base()}/${ROOT}/teams.json`, {method: 'DELETE'}); } catch { /* 무시 */ } }
}

/* 변화 감시: callback()은 너무 자주 불리지 않도록 0.4초 묶어서 호출 */
function watch(path, filter, callback) {
  let t = null; const fire = () => { clearTimeout(t); t = setTimeout(callback, 400); };
  const onStorage = e => { if (e.key === KEY) fire(); };
  const onMsg = e => { if (filter(e.data)) fire(); };
  window.addEventListener('storage', onStorage); channel?.addEventListener('message', onMsg);
  let es = null, poll = null;
  if (isRemote()) {
    try { es = new EventSource(`${base()}${path}`); ['put', 'patch'].forEach(ev => es.addEventListener(ev, fire)); } catch { es = null; }
    poll = setInterval(fire, es ? 20000 : 4000);   // 스트림이 끊겨도 주기적으로 다시 확인
  }
  return () => { window.removeEventListener('storage', onStorage); channel?.removeEventListener('message', onMsg); es?.close(); clearInterval(poll); clearTimeout(t); };
}
export const watchTeams = cb => watch(`/${ROOT}/teams.json`, () => true, cb);
export const watchTeam = (id, cb) => watch(`/${ROOT}/teams/${encodeURIComponent(id)}.json`, d => d === id || d === '*', cb);

export const syncLabel = () => isRemote() ? (isPreview() ? '시험용 공유 (Firebase · 미리보기 칸)' : '실시간 공유 (Firebase)') : '이 기기에만 저장 (미리보기)';

/* ── 명예의 전당 (보너스 게임 기록) : /smartfarm/hall/{게임} ── */
const HALL = 'sf2-hall';
const readHall = () => { try { return JSON.parse(localStorage.getItem(HALL)) || {}; } catch { return {}; } };
export async function addHall(game, entry) {
  const rec = {...entry, at: now()};
  const all = readHall(); (all[game] = all[game] || []).push(rec); try { localStorage.setItem(HALL, JSON.stringify(all)); } catch { /* 무시 */ }
  if (isRemote()) { try { await fetch(`${base()}/${ROOT}/hall/${game}.json`, {method: 'POST', body: JSON.stringify({...entry, at: SERVER_TIME})}); } catch { /* 무시 */ } }
}
export async function fetchHall(game) {
  if (isRemote()) {
    try { const r = await fetch(`${base()}/${ROOT}/hall/${game}.json`, {cache: 'no-store'}); if (r.ok) return Object.values((await r.json()) || {}); }
    catch { /* 로컬 기록으로 대체 */ }
  }
  return readHall()[game] || [];
}
export async function clearHall() {
  try { localStorage.removeItem(HALL); } catch { /* 무시 */ }
  if (isRemote()) { try { await fetch(`${base()}/${ROOT}/hall.json`, {method: 'DELETE'}); } catch { /* 무시 */ } }
}
