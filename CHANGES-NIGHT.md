# 밤 구역(NIGHT) 변경 내역

## 방식: 낮 앱 구조 안에 나이트 미션 원래 화면 그대로 (iframe 없음)
- 밤 구역 화면(`night/`)은 낮 앱의 모둠 선택·입장·타이머(35분)·저장(Firebase `/smartfarm/teams/{모둠}`)·대시보드·음소거를 그대로 써요. 자체 Firebase·모둠 선택·타이머는 없어요.
- **밤의 온실 지도**: 낮 온실과 같은 틀(유리 아치·관제 단말기·시설물)에 딸기·토마토 재배 베드, 땅속 뿌리·감자, 체관 배송관을 그렸어요. 낮처럼 **색이 다른 신호**를 찾아 누르면 LOCK이 열려요. LOCK을 복구할 때마다 야간 LED가 하나씩 켜지고, 모두 끝나면 새벽(꽃이 핌)으로 바뀌어요.
- 장치를 누르면 **나이트 미션의 원래 LOCK 화면**(다이얼 자물쇠·A/B 단계·관제 AI 플로·프로토콜 설치 애니메이션·영양정보 라벨·뉴스·승인 키패드·모두의 온기·06:00 엔딩)이 온실 위에 겹쳐 열려요. 디자인은 원래 CSS를 `.nm` 안에서만 적용(`mission.css`)해서 낮 화면과 섞이지 않아요.
- 기록은 `night/…` 경로에만 저장: `startedAt · introSeen · rulesOk · checkpoint(A 단계) · done(LOCK 복구) · hints · wrongs · pledges · approvalRequested · approvedAt · bonus · finishedAt`
- 진행 상태를 localStorage에 저장하지 않아요. 관리코드·PIN은 코드에 없어요.
- **LOCK 8 연구소장 승인**: 학생이 서약을 내면(`night/pledges`, `night/approvalRequested`) 교사용 대시보드 모둠 카드에 서약과 [승인] 버튼이 떠요. 선생님이 누르면 `night/approvedAt`이 저장되고 학생 태블릿 패드가 저절로 열려요. 인터넷이 불안하면 '선생님이 이 태블릿에서 직접 승인' → 밤 구역 관리코드(서버 확인).

## 학생 흐름
입장(🌙 밤) → 밤 스토리 영상 7장면 → 작전 설명 → 점수 안내 → **밤의 온실 지도**
→ LOCK 4~7 (순서 자유, 장치마다 A 시스템 점검 → B 코드 락) → LOCK 8 (실천 서약 → 연구소장 승인 키패드 → 명령어 조각 맞추기)
→ 보너스 '모두의 온기' → 06:00 엔딩 + 밤 인증서(1080×1440)

## 새 파일
| 파일 | 내용 |
|---|---|
| `night/night-content.js` | **선생님이 고치는 곳** — 스토리 영상 장면, 미션 문구·정답·오답 안내, 역할·태블릿 순서, 뉴스 기사, 엔딩, 점수·등급 |
| `night/night-hints.js` | LOCK마다 힌트 2개 (나이트 미션 원래 힌트) |
| `night/index.js` | 밤 화면 바깥 틀: 스토리 영상 · 점수 안내 · 밤의 온실 지도 · 시간 종료 · 인증서 |
| `night/mission.js` | 나이트 미션 원래 LOCK 4~8 화면 · 모두의 온기 · 06:00 엔딩 |
| `night/mission.css` | 나이트 미션 원래 디자인 (`.nm` 안에서만). 글꼴 Jua·Gowun Dodum(Google Fonts) |
| `night/night-scene.js` | 밤의 온실 지도(신호·재배 베드·땅속) + 06:00 엔딩용 유리 온실 그림 |
| `night/night-cert.js` | 밤 인증서 (낮 cert.js와 같은 틀, 밤 색) |
| `night/night.css` | 밤 화면 바깥 틀(상단 카드·지도·점수 안내 창·스토리 영상) 밤 색 |
| `night/assets/` | 스토리 영상 7개 (540p mp4 + webm) · `bgm_night.mp3` |
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
| `app.js` | `startTeamWatch` 조건 1개 | 밤 스토리 영상·밤 미션 화면 중에는 다시 그리지 않음 |
| `app.js` | 대시보드 모둠 카드에 `NZ.adminCard(t)` · `render()`에 `NZ.bindAdmin` 1줄 · `nightApi`에 `patchTeam` | 밤 점수·실천 서약 목록·[승인] 버튼 (선생님이 승인하면 학생 태블릿 승인 패드가 열림) |
| `config.js` | `nightEnabled: true`, `nightSlots` 주석 | 밤 구역 켜기 (장치 5 + 보너스 1) |

낮 구역 파일(content.js, hints.js, scene.js, games.js, plant.js, prologue.js, style.css, sync.js, sound.js, api/verify.js), cert.js, index.html은 고치지 않았어요.

## 점수 (최고 100점)
장치 복구 5개 × 13 = 65 · 보너스 10 · 완료 시간 보너스 20분 +25 / 25분 +20 / 30분 +15 / 35분 +10 · 힌트 1개당 −2 (LOCK마다 2개)
등급: 🏆 혈당 수호 연구소장 90 · 🥇 수석 영양 연구원 75 · 🥈 책임 연구원 55 · 🥉 선임 연구원 35 · 🌙 야간 견습 연구원 0

## 🔒 교사용 정답 (학생 화면에 넣지 않기)
| 장치 | 확인 단계 | 암호 | 조각 |
|---|---|---|---|
| LOCK 4 체관 배송 라인 | 당 화물 10개 분류 | 321 | 게 |
| LOCK 5 에너지 계량기 | 음식 3개 고르기 | 1512 | 덜 |
| LOCK 6 혈당 모니터 | 그래프 A · 30분 | 1435 | 먹 |
| LOCK 7 프로토콜 서버 | 간식 6개 고르기 | 1503 | 달 |
| LOCK 8 내일 아침 운영 계획 | 서약 3개 + 밤 구역 관리코드 승인 | 덜달게먹자 | 자 |

## 테스트
- 밤 전체 흐름 (입장 → 영상 → 작전 설명 → 점수 안내 → 지도 → LOCK 4~8 → 모두의 온기 → 엔딩 → 100점 인증서): 1280×800 · 820×1180 · 390×844, 오류 0 · 가로 스크롤 없음
- 낮을 먼저 한 모둠도 밤 첫 입장 때 영상 → 작전 설명 → 점수 안내 순서
- 시간 종료(35분 경과) → TIME OVER 창 + 진행 인증서
- 낮 구역 입장·스토리 영상·점수 안내 그대로 작동 (밤 스타일이 낮 화면에 섞이지 않음)
