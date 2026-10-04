/* ───────────────────────────────────────────────
   선생님 설정 파일 — 수업 전에 이 파일만 확인하세요.
   학생 이름·학번은 저장하지 않습니다. 반·모둠 번호만 사용합니다.
   ─────────────────────────────────────────────── */
export const CONFIG = {
  grade: '2학년',
  classCount: 10,      // 반 선택 버튼 개수 (1반 ~ 10반)
  teamCount: 6,        // 모둠 선택 버튼 개수 (1모둠 ~ 6모둠)

  // 입장 비밀번호 — 수업 전에 꼭 바꾸세요. 숫자·영문 모두 가능합니다.
  passwords: {
    day: '0909',       // ☀️ 낮 모드 입장
    night: '1818',     // 🌙 밤 모드 입장
    admin: '7777'      // 🛰️ 관리자(관제 센터) 입장
  },

  // 진행 상황 공유 방식
  //  'local'    : 같은 기기(같은 브라우저)의 탭끼리만 공유 — 미리보기·연습용
  //  'firebase' : Firebase Realtime Database로 모든 태블릿 → 교실 모니터 실시간 공유
  //               (README의 'Firebase 연결' 순서대로 databaseURL만 넣으면 됩니다)
  sync: {
    mode: 'local',
    firebaseDatabaseURL: ''   // 예시 형식: https://프로젝트이름-default-rtdb.asia-southeast1.firebasedatabase.app
  }
};
