# 🌱 스마트팜 바이오 랩 : 낮과 밤 연구실 — 웹앱 (v2.6.0)

융합 방탈출 · 과학 × 가정 | 중2 과학 Ⅳ. 식물과 에너지 · 2022 개정 [9과12-01]~[9과12-03]
© 2026 minari&zinbong

현재 범위: **처음 화면(연구원 출입증) + 낮 구역 프롤로그 영상 + 브리핑(낮·밤 공통) + 낮 구역 + 교사용 대시보드**
밤 구역은 '준비 중' 화면만 있어요 (`config.js`의 `nightEnabled`).

**v2.6.0 (2026-10-04)** 낮 구역 프롤로그 영상·자막 7장면 추가 · 브리핑 5장(낮과 밤을 잇는 '당의 여정', 수정된 밤 계획서 반영) · 낮 완료 이야기 문구 · 영상 글씨체 본문과 통일

---

## 1. 바로 찾기 — 무엇을 어디서 고치나요?

> 고친 뒤에는 그 파일을 깃허브에 다시 올리면 Vercel이 1~2분 뒤 자동 반영해요. 학생 기기는 새로고침 한 번!
> 파일은 메모장·VS Code로 열고, **따옴표 `' '` 안의 글자와 숫자만** 고치세요. 쉼표·괄호를 지우면 앱이 멈춰요.

| 바꾸고 싶은 것 | 파일 | 고칠 곳 |
|---|---|---|
| 🔐 **낮·밤 관리코드 / 대시보드 코드** | `api/verify.js` | 맨 위 `CODES` → `day` · `night` · `admin` |
| 학년 버튼 | `config.js` | `grades: [2]` → 예 `[1, 2, 3]` |
| 반 수 · 모둠 수 | `config.js` | `classCount: 6` · `teamCount: 6` |
| 연구원(팀원) 입력 칸 수 | `config.js` | `memberMax: 6` (팀장 칸은 별도) |
| 이름 글자 수 제한 | `config.js` | `nameMaxLength: 10` |
| 제한 시간(분) | `config.js` | `missionMinutes: { day: 35, night: 35 }` |
| 밤 구역 켜기 | `config.js` | `nightEnabled: false` → `true` |
| Firebase 주소 · 저장 방식 | `config.js` | `sync.mode` · `sync.firebaseDatabaseURL` |
| 처음 화면 작은 글씨 · 큰 제목 · 부제목 · 안내문 | `content.js` | `entry.kicker` · `entry.title` · `entry.subtitle` · `entry.lead` |
| 🎬 낮 구역 프롤로그 영상 자막 (7장면) | `content.js` | `prologue` 의 `tag`(장면 이름) · `text`(자막) — 그림은 `prologue.js` |
| 브리핑 이야기 (5장) | `content.js` | `briefing` 의 `text` (작전 규칙은 `split.day` / `split.night`) · 당의 여정 칸은 `journey` |
| ✅ **미션 정답** | `content.js` | `missions.water.answer` · `missions.carbon.answer` · `missions.light.checkpoint.answer` · `missions.light.answer` |
| 정답 입력 안내 · 오답 피드백 | `content.js` | 각 미션의 `prompt` · `placeholder` · `wrong` |
| 💡 **힌트 내용 (1·2·3단계)** | `hints.js` | `HINTS.water/carbon/light.levels[]` 의 `title` · `lines` · `answer` |
| 힌트 여는 규칙 | `hints.js` | `HINT_RULES.sequential` (true = 1→2→3 순서대로) |
| FARM-OS 대사 · 일반 분자 말풍선 | `content.js` | `aiLines` |
| 보너스: 순간 관찰 | `content.js` | `games.observation` (`frames` 그림 수 · `intervalMs` 속도) |
| 보너스: 숨은 물건 찾기 | `content.js` | `games.hidden` (`pick` 찾을 개수 · `timeLimit` · `penalty` · `targets` · `decoys`) |
| 보너스: 컬러 터치 목표 점수 | `content.js` | `games.color.modes` (쉬운 `goal: 50` · 도전 `goal: 100`) |
| 연구 점수 계산 | `content.js` | `certificate.score` (`lock` · `bonus` · `time` · `hint` · `answerHint`) |
| 연구원 등급 이름 · 기준 점수 | `content.js` | `certificate.tiers` |
| ⚡ 스피드 도장 기준(분) | `content.js` | `certificate.speedMinutes` |
| 완료·시간 종료 문구 | `content.js` | `completion`(제목) · `completionStory`(완료 이야기) · `timeUp` · `nightWaiting` |
| 꽃 화분 사진 | `photos/` 폴더 + `content.js` | 사진을 `flower-01.jpg`~`flower-06.jpg`로 넣기 · 목록은 `photos` |
| 푸터 버전 · 저작권 | `content.js` | `footer` |
| 분자 위치 · 색이 다른 분자 | `scene.js` | `WATER` · `CARBON` · `PHOTON` 좌표, `WATER_KEY` 등 번호 |

### 현재 기본값
- 관리코드: 낮 `0909` · 밤 `1818` · 대시보드 `7777` → **수업 전에 꼭 바꾸세요**
- 정답: LOCK1 `9C4E2R0` · LOCK2 `4K7L29` · LOCK3 기준카드 `OOOX` → 최종 `7294`
- 컬러 터치: 쉬운 모드 50점 · 도전 모드 100점 이상이면 성공

---

## 2. 🔐 관리코드가 숨겨지는 방식
- 코드는 `api/verify.js`에만 있어요. 이 파일은 **Vercel 서버에서만 실행**돼서 학생 기기로 내려가지 않아요. 그래서 개발자 도구(F12)로 봐도 찾을 수 없어요.
- 입장할 때 앱이 서버에 "이 코드 맞나요?"만 물어보고, 맞다/아니다만 돌려받아요.
- 더 숨기고 싶다면 (선택) Vercel → 프로젝트 → **Settings → Environment Variables**에 `CODE_DAY`, `CODE_NIGHT`, `CODE_ADMIN`을 넣으세요. 그러면 깃허브 저장소(Public)에서도 코드가 보이지 않고, 파일 값보다 먼저 쓰여요.
- ⚠️ `api` 폴더도 꼭 함께 깃허브에 올려야 해요. 없으면 "관리코드 확인 서버에 연결하지 못했어요"가 떠요.
- 내 컴퓨터(Live Server · localhost)에서 미리 볼 때는 서버가 없어서 **코드 확인을 건너뛰어요** (아무 코드나 입장).
- 관리코드는 기기에 기억되지 않아요. 처음 화면에서 입장할 때마다, 수업 중 낮↔밤 스위치를 돌릴 때마다 다시 물어봐요. 같은 탭에서 새로고침한 경우만 그대로 이어져요.

> 미션 **정답**은 학생이 화면에서 입력해 바로 맞았는지 확인해야 해서 `content.js`(학생 기기로 내려가는 파일)에 있어요. 개발자 도구까지 열어 정답을 찾는 경우는 드물지만, 걱정되면 수업 중 기기 관리 모드를 활용하세요.

---

## 3. 수업 흐름
1. **연구원 출입증** (처음 화면): 학년·반·모둠 → 대표 연구원(팀장)·연구원(팀원) 이름 → 낮/밤 토글 → **구역 책임자 관리코드** → 입장
   - 입장하는 순간 **35분 카운트다운** 시작 (낮·밤 따로)
   - 같은 학년·반·모둠으로 다시 입장하면 이름이 자동으로 채워지고 기록·타이머가 이어져요 (다른 기기에서도, Firebase 연결 시)
2. **🎬 프롤로그 영상** (낮 구역 첫 입장): 06:00 긴급 통신 → 낮 구역 피해 → 작전 개시까지 7장면 + 자막. 처음엔 건너뛰기 없음, 상단 `프롤로그`로 다시 보기(건너뛰기 가능)
3. **작전 브리핑** (모둠당 처음 한 번): 낮·밤 두 구역 상황 + 우리 모둠 첫 투입 구역. 상단 `브리핑`으로 다시 보기
4. **연구 인증서 안내 팝업** (낮 구역 첫 입장): 점수 계산·등급·완료 조건. **☑ 확인했습니다**를 체크해야 시작. 상단 `점수 안내`로 다시 보기
5. **낮 구역 온실**
   - 흙 속 분홍 H₂O / 공기 중 주황 CO₂ / 해 옆 보라 빛 알갱이 → 암호 입력·힌트(1→2→3단계)
   - 장치를 복구하면 시설물(물뿌리개·공구 창고·조명 제어판)에 **★ BONUS** 배지 → 보너스 게임, 성공하면 **✓ CLEAR**
   - 보너스 성공 개수만큼 식물에 🍅 토마토가 열려요 (온실·인증서 모두)
   - 🏠 `처음으로` 버튼: 언제든 처음 화면으로 (기록 저장, 타이머는 계속)
6. **마무리 · 연구 인증서** (`🏅 인증서 저장`)
   - 장치 3 + 보너스 3 모두 완료 → 식물 이름표 꽂기 → 실제 꽃 화분 사진(무작위, 사진이 없으면 그림) + 인증서
   - 시간 종료 → 키운 단계까지의 화분 그림으로 인증서 (이름 짓기 없음)
   - 인증서: 등급 · 연구 점수 계산식 · 연구원 이름 · **실제 미션 완료 시간**(또는 진행도) · 토마토 수 · 날짜 · 도장
7. **컬러 터치 명예의 전당**: 쉬운/도전 모드 → 게임 후 '누가 해냈는지' 골라 기록 등록 → 모든 반이 함께 보는 TOP 10

### 연구 점수 (기본값, 최고 100점)
| 항목 | 점수 |
|---|---|
| 암호 장치 복구 | 1개당 +15 (최대 45) |
| 보너스 게임 성공 | 1개당 +10 (최대 30) |
| 완료 시간 (모두 끝냈을 때만) | 20분 안 +25 · 25분 안 +20 · 30분 안 +15 · 35분 안 +10 |
| 힌트 | 1·2단계 열 때마다 −2 · 3단계(정답) −5 |

등급: 🏆 마스터(90↑) · 🥇 수석(75↑) · 🥈 책임(55↑) · 🥉 선임(35↑) · 🌱 새싹 | ⚡ 20분 안에 모두 끝내면 스피드 도장

---

## 4. 교사용 대시보드
- 처음 화면의 **화분 그림을 누르면** 열려요 (대시보드 코드 필요).
- 반별로 묶어서 모둠 카드 표시: 팀원 이름 · 낮 미션 6칸(장치 3 + 보너스 3) · 밤 미션 줄 · 남은 시간(1초마다) · 힌트 사용 · 연구 점수 · 식물 이름
- `모니터 크게` : 교실 TV용 큰 글씨
- `기록 삭제`(모둠별) · `모든 모둠 기록 지우기` · `명예의 전당 기록 지우기` — 실수 방지를 위해 **두 번** 눌러야 지워져요
- 진행 중인 모둠의 기록을 지우면 그 모둠 화면은 안내와 함께 처음 화면으로 돌아가요.

---

## 5. Firebase (여러 기기 · 실시간)
현재 `config.js`: `sync.mode: 'firebase'`, 주소 `https://smartfarmdaynnight-default-rtdb.asia-southeast1.firebasedatabase.app`

- Realtime Database **규칙(Rules)** 예시 — 수업 기간에만 열고, 끝나면 `false`로 잠그기 권장
  ```json
  { "rules": {
      "smartfarm":         { ".read": true, ".write": true },
      "smartfarm-preview": { ".read": true, ".write": true }
  } }
  ```
- 저장 위치: `/smartfarm/teams` (모둠 기록) · `/smartfarm/hall` (명예의 전당)
- **수업 주소(`config.js`의 `sync.productionHosts`)에서만** `/smartfarm`에 저장해요. 브랜치 미리보기 주소·내 컴퓨터에서는 `/smartfarm-preview`(시험용 칸)에 따로 저장돼서 수업 대시보드에 시험 기록이 섞이지 않아요. 수업 주소가 바뀌면 `productionHosts`도 바꿔 주세요.
- 대시보드는 실시간 스트림으로 갱신 · 남은 시간은 서버 시각 기준 · 와이파이가 잠깐 끊겨도 기록을 모아 두었다가 다시 보냄
- 연습용으로 이 기기에만 저장하려면 `sync.mode: 'local'`
- Firebase 요금제·콘솔 화면은 바뀔 수 있으니 확인 필요

### 저장되는 데이터
학년·반·모둠, 대표 연구원·연구원 이름(학생 입력), 해결한 장치·보너스, 힌트 단계, 시작·완료 시각, 식물 이름, 명예의 전당 기록(이름·점수).
학번은 받지 않아요. 이름은 **성 빼고 이름만** 또는 별명으로 쓰게 하면 더 안전해요. 수업이 끝나면 대시보드에서 기록을 지워 주세요.

---

## 6. 깃허브 브랜치 (낮·밤 공동 작업)
| 브랜치 | 누가 | 용도 |
|---|---|---|
| `main` | 직접 올리지 않기 | 🎓 수업용 완성본 → Vercel 수업 주소 |
| `day` | 낮 구역(미나리쌤) | 낮·공용 기능 수정 |
| `night` | 밤 구역 선생님 | 밤 구역(`night/` 폴더) |

- 각자 자기 브랜치에서 고치고 → 미리보기 주소에서 시험 → **합치기 요청(Pull Request)** 으로 `main`에 합쳐요.
- 작업을 시작할 때마다 `main`의 최신 내용을 자기 브랜치로 먼저 가져와요.
- 밤 구역 작업 안내: `밤모드_작업안내_클로드코드용.md`

## 6-1. 배포 · 실행
- **Vercel** (현재 사용): 깃허브 저장소에 폴더 안의 모든 파일·폴더(`api`, `icons`, `photos` 포함)를 올리면 자동 배포
- 내 컴퓨터 미리보기: VS Code **Live Server** 또는 `npx serve .` (파일 더블클릭 file:// 는 안 열려요)

## 7. 파일 구성
| 파일 | 역할 | 선생님 수정 |
|---|---|---|
| `config.js` | 학년·반·모둠, 시간, 저장 방식 | ✅ |
| `content.js` | 화면 문구·정답·게임·인증서 설정 | ✅ |
| `hints.js` | 힌트 1·2·3단계 | ✅ |
| `api/verify.js` | 🔐 관리코드 (서버 전용) | ✅ |
| `scene.js` | 온실 장면·분자 위치 | 필요할 때만 |
| `prologue.js` | 프롤로그 영상 장면 그림 (자막은 `content.js`) | 필요할 때만 |
| `photos/` | 꽃 화분 사진 | ✅ |
| `app.js` · `games.js` · `cert.js` · `plant.js` · `sync.js` · `sound.js` | 앱 동작 | ✖ |
| `style.css` · `index.html` · `manifest.webmanifest` · `icons/` | 디자인·아이콘 | ✖ |

## 8. 글꼴 · 아이콘
- 본문: 롯데마트 드림(LotteMartDream) · 큰 제목만 평창평화체(PyeongChangPeace) — jsDelivr CDN. 학교망에서 막히면 기본 글꼴로 보여요.
- 인증서도 큰 제목 외 모든 글씨(이름·이름표·등급·점수·도장)는 본문 글꼴로 그려요.
- `icons/`: 파비콘(logo.svg, favicon-32.png), 홈 화면 바로가기(apple-touch-icon.png, icon-192/512.png)

## 9. 밤 구역을 붙일 때 (개발 메모)
모둠 기록의 `night` 칸(`night/startedAt`, `night/done/{미션}`, `night/finishedAt`)을 채우면 대시보드 🌙 줄이 자동으로 움직여요.
