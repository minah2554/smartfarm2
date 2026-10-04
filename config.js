/* ───────────────────────────────────────────────
   선생님 설정 파일 — 수업 전에 이 파일만 확인하세요.
   ─────────────────────────────────────────────── */
export const CONFIG = {
  grades: [2],          // 학년 선택 버튼 (예: [1, 2, 3]). 하나만 넣으면 그 학년으로 고정돼요.
  classCount: 6,        // 반 선택 버튼 개수 (1반 ~ 6반)
  teamCount: 6,         // 모둠 선택 버튼 개수 (1모둠 ~ 6모둠)
  memberMax: 6,         // 대표 연구원(팀장)을 뺀 연구원(팀원) 입력 칸 수 (최대 6명)
  nameMaxLength: 10,    // 이름 한 칸에 쓸 수 있는 글자 수

  // 미션 제한 시간(분) — 입장하는 순간부터 카운트다운이 시작돼요.
  missionMinutes: { day: 35, night: 35 },

  // 밤 모드 화면이 완성되면 true로 바꾸세요. false이면 밤 모드는 '준비 중' 화면만 보이고 타이머가 시작되지 않아요.
  nightEnabled: false,

  // 입장 비밀번호 — 수업 전에 꼭 바꾸세요. 숫자·영문 모두 가능합니다.
  passwords: {
    day: '0909',       // ☀️ 낮 모드 입장
    night: '1818',     // 🌙 밤 모드 입장
    admin: '7777'      // 🛰️ 교사용 대시보드(관제 센터) 입장
  },

  // 진행 상황 저장·공유 방식
  //  'local'    : 이 기기(이 브라우저)에만 저장 — 미리보기·연습용
  //  'firebase' : Firebase Realtime Database에 저장 — 어느 기기로 입장해도 모둠 기록이 이어지고,
  //               교사용 대시보드에 실시간으로 나타나요. (README의 'Firebase 연결' 참고)
  sync: {
    mode: 'firebase',
    firebaseDatabaseURL: 'https://smartfarmdaynnight-default-rtdb.asia-southeast1.firebasedatabase.app'   // 예시 형식: https://프로젝트이름-default-rtdb.asia-southeast1.firebasedatabase.app
  }
};
