# 밤 구역(NIGHT) 변경 내역

## 방식: 연결형
밤 구역 미션(기술·가정 · LOCK 4~8)은 따로 운영 중인 **나이트 미션 웹앱**(https://biolab-night-mission.netlify.app)에서 진행해요.
이 앱의 밤 구역 화면은 그 웹앱으로 들어가는 **입구**만 보여 줘요.

- 버튼을 누르면 나이트 미션이 새 탭으로 열려요.
- 주소에 학년·반·모둠(`g`, `c`, `t`)을 함께 보내요.
- 낮 구역 진행이 없는 모둠(장치 0 · 보너스 0, 밤 먼저)은 `first=night`를 붙여 '밤 → 낮' 스토리로 열려요.

## 새 파일
| 파일 | 내용 |
|---|---|
| `night/night-content.js` | 나이트 미션 주소, 밤 화면 문구 (밤 구역 선생님이 고치는 곳) |
| `night/index.js` | 밤 구역 입구 화면. app.js가 그린 '밤의 온실' 카드(`.night-card`) 안의 내용만 바꿔요 |
| `CHANGES-NIGHT.md` | 이 문서 |

## 공용 파일 수정 (`[NIGHT]` 표시)
| 파일 | 줄 | 이유 |
|---|---|---|
| `index.html` | `app.js` 바로 아래 `<script>` 1줄 | 밤 구역 입구 화면 모듈 불러오기 |

`app.js`, `config.js`, `cert.js`와 낮 구역 파일(content.js, hints.js, scene.js, games.js, plant.js, style.css, sync.js, api/verify.js)은 고치지 않았어요.

## 그대로 둔 것
- `config.js`의 `nightEnabled: false`를 유지해요. 밤 구역 35분 타이머와 이 앱의 밤 인증서는 쓰지 않고, 밤 기록·대시보드·인증서는 나이트 미션 웹앱의 것을 써요.
- 교사용 대시보드 🌙 줄은 '준비 중'으로 보여요.

## 밤 정답 (나이트 미션 웹앱)
LOCK 4 `321` · LOCK 5 `1512` · LOCK 6 `1435` · LOCK 7 `1503` · LOCK 8 재가동 명령어 `덜달게먹자`
