# 밤 구역(NIGHT) 변경 내역

## 방식: 낮 앱 구조로 다시 만들기 (iframe 없음)
나이트 미션(기술·가정 · LOCK 4~8)의 **문제·스토리·관제 AI 플로·보너스 게임**만 가져와 `night/` 폴더에 낮 앱과 같은 구조로 다시 만들었어요.
- 모둠 선택·입장·타이머·저장(Firebase `/smartfarm/teams/{모둠}`)·대시보드·음소거는 **낮 앱 것을 그대로** 써요. 밤 구역은 자체 Firebase·자체 모둠 선택·자체 타이머가 없어요.
- 기록은 `night/…` 경로에만 저장해요: `startedAt · introSeen · rulesOk · done · checkpoint · hints · bonus · finishedAt · pledges`
- 진행 상태를 localStorage에 저장하지 않아요. 관리코드·PIN은 코드에 없어요 (서버 확인).

## 학생 흐름
입장(🌙 밤) → 밤 스토리 영상 7장면 (첫 시청은 건너뛰기 없음) → 작전 설명(처음일 때) → 점수 안내·확인 → **밤의 온실**
→ 색이 다른 신호를 눌러 LOCK 4~7 → LOCK 8 재가동 콘솔 (실천 서약 3개 + 연구소장 승인 + 명령어 조각 맞추기)
→ 보너스 '모두의 온기'(멀티터치, 한 명씩 채우기 모드) → NIGHT CLEAR + 밤 인증서(1080×1440)

## 새 파일
| 파일 | 내용 |
|---|---|
| `night/night-content.js` | **선생님이 고치는 곳** — 스토리 영상 장면, 미션 문구·정답, 오답 안내, 보너스 게임 설정, 점수·등급 |
| `night/night-hints.js` | 미션별 힌트 3단계 (개념 → 방법·함정 → 풀이) |
| `night/index.js` | 밤 화면 (스토리 영상·점수 안내·온실·장치 창·LOCK 8·완료/시간 종료·인증서) |
| `night/night-scene.js` | 밤의 온실 SVG (낮과 같은 유리 온실, 달·별, 신호 5종, 재가동 코어) |
| `night/night-games.js` | 보너스 게임 '모두의 온기' |
| `night/night-cert.js` | 밤 인증서 (낮 cert.js와 같은 틀, 밤 색) |
| `night/night.css` | 밤 색·밤 전용 화면. `.nz` 등 밤 클래스 안에서만 적용 (style.css 수정 없음) |
| `night/assets/` | 스토리 영상 7개 (540p mp4 + webm, 합계 약 9MB) · `bgm_night.mp3` |
| `night/REQUEST_낮구역.md` | 낮 선생님께 요청할 것 |

## 공용 파일 수정 (모두 `// [NIGHT]` 표시)
| 파일 | 수정 | 이유 |
|---|---|---|
| `app.js` | `import * as NZ from './night/index.js'` | 밤 화면 모듈 |
| `app.js` | `topbar(mode)`의 밤 분기 | 밤도 같은 메뉴 3개 + 인증서 버튼 |
| `app.js` | `nightApi` 객체 | 낮 앱의 저장·타이머·상단 바·관리코드 확인을 밤 화면에 넘겨줌 |
| `app.js` | `nightView()` | `nightEnabled`이면 `NZ.view()` (아니면 기존 '준비 중' 카드) |
| `app.js` | `render()`, `tick()` 각 1줄 | 밤 화면 연결, 밤 시간 종료 감지 |
| `app.js` | `enterMode()` 1줄 | 밤 첫 입장 → 밤 스토리 영상 |
| `app.js` | `startTeamWatch` 조건 1개 | 밤 스토리 영상 중에는 다시 그리지 않음 |
| `config.js` | `nightEnabled: true`, `nightSlots` 주석 | 밤 구역 켜기 (장치 5 + 보너스 1) |

낮 구역 파일(content.js, hints.js, scene.js, games.js, plant.js, prologue.js, style.css, sync.js, sound.js, api/verify.js), cert.js, index.html은 고치지 않았어요.

## 점수 (최고 100점)
장치 복구 5개 × 13 = 65 · 보너스 10 · 완료 시간 보너스 20분 +25 / 25분 +20 / 30분 +15 / 35분 +10 · 힌트 1·2단계 −2, 3단계 −5
등급: 🏆 혈당 수호 연구소장 90 · 🥇 수석 영양 연구원 75 · 🥈 책임 연구원 55 · 🥉 선임 연구원 35 · 🌙 야간 견습 연구원 0

## 🔒 교사용 정답 (학생 화면에 넣지 않기)
| 장치 | 확인 단계 | 암호 | 조각 |
|---|---|---|---|
| LOCK 4 체관 배송 라인 | 당 화물 10개 분류 | 321 | 게 |
| LOCK 5 에너지 계량기 | 음식 3개 고르기 | 1512 | 덜 |
| LOCK 6 혈당 모니터 | 그래프 A · 30분 | 1435 | 먹 |
| LOCK 7 프로토콜 서버 | 간식 6개 고르기 | 1503 | 달 |
| LOCK 8 재가동 콘솔 | 서약 3개 + 밤 구역 관리코드 승인 | 덜달게먹자 | 자 |

## 테스트
- 밤 전체 흐름 (입장 → 영상 → 작전 설명 → LOCK 4~8 → 보너스 → 100점 인증서): 1280×800 · 820×1180 · 390×844, 오류 0 · 가로 스크롤 없음
- 시간 종료(35분 경과) → TIME OVER 창 + 진행 인증서
- 낮 구역 입장·스토리 영상·점수 안내 그대로 작동 (밤 스타일이 낮 화면에 섞이지 않음)
