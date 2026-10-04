# 밤 구역(NIGHT) 변경 내역

## 방식: 나이트 미션 통째로 넣기
밤 구역 미션(기술·가정 · LOCK 4~8)은 이미 완성해 수업에 쓰던 **나이트 미션 웹앱**을 그대로 `night/mission/` 폴더에 넣었어요.
학생이 🌙 밤으로 입장하면 **상단 바(처음으로 · 모둠 배지 · 낮/밤 스위치) 아래에 나이트 미션 화면이 바로 열려요.** 새 탭이나 외부 주소(넷리파이)로 나가지 않아요.

- 나이트 미션 화면은 한 번만 열고 보였다 숨겼다 해요. 앱 화면이 다시 그려지거나 낮/밤 스위치를 오가도 미션이 처음으로 돌아가지 않아요.
- 학년·반·모둠(`g`, `c`, `t`)을 나이트 미션에 함께 넘겨요.
- 낮 구역 진행이 없는 모둠(장치 0 · 보너스 0, 밤 먼저)은 `first=night`로 열어 '밤 → 낮' 스토리가 나와요.
- 나이트 미션의 기록·교사 대시보드·인증서는 나이트 미션 자체 기능을 그대로 써요(기존 Firebase 프로젝트).

## 새 파일
| 파일 | 내용 |
|---|---|
| `night/night-content.js` | 나이트 미션 위치, 밤 먼저 설정 (밤 구역 선생님이 고치는 곳) |
| `night/index.js` | 밤 구역 화면에 나이트 미션을 띄우는 코드. app.js가 그린 '밤의 온실' 카드가 보일 때만 동작 |
| `night/mission/index.html` | 나이트 미션 웹앱 (한 파일) |
| `night/mission/videos/*` | 스토리 영상·배경음악 (mp4/webm, mp3/ogg) |
| `night/mission/favicon*`, `apple-touch-icon.png` | 나이트 미션 아이콘 |
| `CHANGES-NIGHT.md` | 이 문서 |

## 공용 파일 수정 (`[NIGHT]` 표시)
| 파일 | 줄 | 이유 |
|---|---|---|
| `index.html` | `app.js` 바로 아래 `<script>` 1줄 | 밤 구역 화면 모듈 불러오기 |

`app.js`, `config.js`, `cert.js`와 낮 구역 파일(content.js, hints.js, scene.js, games.js, plant.js, prologue.js, style.css, sync.js, api/verify.js)은 고치지 않았어요.

## 아직 하지 않은 것 (피드백 후 결정)
- 글꼴·밤 색상을 낮 앱과 맞추기
- 교사용 대시보드 🌙 줄에 나이트 미션 진행 표시
- `config.js`의 `nightEnabled`는 `false` 그대로예요 (이 앱의 밤 35분 타이머는 쓰지 않고, 나이트 미션 자체 타이머를 써요)

## 밤 정답 (나이트 미션)
LOCK 4 `321` · LOCK 5 `1512` · LOCK 6 `1435` · LOCK 7 `1503` · LOCK 8 재가동 명령어 `덜달게먹자`
