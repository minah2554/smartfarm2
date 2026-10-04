/* 선생님 편집 파일: 이야기·화면 문구, 암호(정답), 오답 피드백, 게임 설정.
   힌트 문구는 hints.js, 비밀번호·반/모둠 수는 config.js에서 고칩니다. */
export const CONTENT = {
  title: '스마트팜 바이오 랩',
  aiName: 'FARM-OS',

  // 낮 모드 입장 후 보여 주는 작전 브리핑 (한 장씩 넘어갑니다)
  briefing: [
    { tag: '긴급 통신', text: '오전 9시, 스마트팜 바이오 랩 1구역. 온실을 관리하던 AI ‘FARM-OS’가 갑자기 오작동을 일으켰다.' },
    { tag: '피해 상황', text: 'AI가 배관 이름표를 뒤섞고, 실험 기록을 조작하고, 정비 로봇의 경로까지 지워 버렸다. 광합성 제어 시스템이 멈추고 새싹이 시들기 시작했다.' },
    { tag: '광합성 공식', text: '식물은 물과 이산화탄소를 재료로, 빛 에너지를 받아 엽록체에서 양분(포도당)을 만든다. 재료 셋 중 하나라도 끊기면 식물은 자랄 수 없다.', formula: true },
    { tag: '작전 목표', text: '활동지 LOCK 1~3에서 단서를 찾아 암호를 풀어라. 온실 속에서 색이 다른 분자를 찾아 누르면 암호 입력 장치가 열린다.' },
    { tag: '작전 규칙', text: '막히면 힌트를 열 수 있다(3단계는 정답 공개). 장치를 복구하면 온실의 시설물에서 보너스 게임이 열린다. 해가 지기 전에 식물을 꽃피워라!' }
  ],

  aiLines: {
    idle: ['ERR 0x01 · 물관 배관 이름표 불일치', 'ERR 0x02 · BTB 기록 무결성 손상', 'ERR 0x03 · 정비 경로 데이터 없음', '경고: 광합성량 0% · 새싹 수분 부족'],
    decoyWater: ['평범한 물 분자예요. 색이 다른 H₂O를 찾아보세요!', '이 물 분자는 정상이에요. 반짝이는 분자는 어디 있을까요?'],
    decoyCarbon: ['평범한 이산화탄소 분자예요. 색이 다른 CO₂를 찾아보세요!', '이 CO₂는 정상이에요. 공기 중에 다른 색 분자가 숨어 있어요.'],
    decoyLight: ['평범한 빛 알갱이예요. 색이 다른 빛을 찾아보세요!'],
    lockedGame: '아직 잠겨 있어요. 연결된 장치를 먼저 복구하세요.',
    allClear: 'FARM-OS 재부팅 완료 · 광합성 정상 가동'
  },

  labels: {
    resultTab: '🔐 암호 입력', hintTab: '💡 힌트 보기',
    submit: '장치 복구', retry: '다시 도전',
    name: '우리 식물의 이름', download: '식물 기록 이미지 저장'
  },

  missions: {
    water: {
      title: '수분 펌프', icon: '💧', reward: '물(H₂O)', prompt: '배관 미로에서 지나간 밸브 7개의 문자·숫자를 순서대로 입력하세요.',
      placeholder: '7자리 (문자·숫자)', answer: '9C4E2R0',
      wrong: '체관(///)을 지났거나 막다른 길의 밸브까지 적었는지 확인해 보세요. 물은 물관으로만 이동해요.'
    },
    carbon: {
      title: 'CO₂ 공급 밸브', icon: '🌬️', reward: '이산화탄소(CO₂)', prompt: '활동지 하단 암호 조립 패널의 6칸을 왼쪽부터 이어서 입력하세요.',
      placeholder: '6자리', answer: '4K7L29',
      wrong: 'AI 기록이 아니라 내가 예측한 색으로 코드표를 찾았는지, 센서 로그의 파란색이 무엇을 뜻하는지 다시 확인해 보세요.'
    },
    light: {
      title: '엽록체 합성 엔진', icon: '☀️', reward: '빛 에너지',
      checkpoint: {
        label: '1단계 · 점검 기준 승인', button: '기준 승인 요청',
        prompt: '활동지 ① 점검 기준 카드의 O/X 4칸(빛 → 엽록소 → 이산화탄소 → 질소 비료)을 차례로 입력하세요.',
        placeholder: 'O/X 4글자', answer: 'OOOX',
        wrong: '기준이 승인되지 않았어요. 시료 1과 조건이 딱 하나만 다른 시료를 찾아 다시 비교해 보세요.',
        success: '점검 기준 승인 완료! 이제 엔진실 배치도에서 장비를 점검하고 그린봇의 동선을 복원하세요.'
      },
      finalLabel: '2단계 · 엔진 재가동',
      prompt: '③ 그린봇 동선의 노란 칸을 ①→⑦ 순서로 읽고, ✕를 건너뛴 4자리를 입력하세요.',
      placeholder: '4자리 숫자', answer: '7294',
      wrong: '승인된 기준으로 9개 장비를 다시 점검하고, 그린봇 메모 ①~⑦에 맞는 장비를 골랐는지 살펴보세요.'
    }
  },
  // 보너스 게임: 온실 시설물을 누르면 시작 (unlockBy = 먼저 복구해야 할 장치)
  games: {
    observation: { title: '순간 관찰', place: '물뿌리개', unlockBy: 'water', instruction: '그림이 빠르게 지나가요. 모든 그림을 잘 기억하세요! 질문은 마지막에 나와요.', icons: ['🍃', '🌼', '☀️', '💧', '🐞'], frames: 20, intervalMs: 500 },
    hidden: { title: '온실 숨은그림찾기', place: '공구 창고', unlockBy: 'carbon', instruction: '온실에 숨어 있는 다섯 물건을 찾아 누르세요.', targets: ['돋보기', '장갑', '열쇠', '나비', '물뿌리개'] },
    color: { title: '컬러 터치', place: '조명 제어판', unlockBy: 'light', instruction: '10초 동안 계속 바뀌는 칸 중 목표 색만 터치하세요. 다른 색은 감점됩니다.', target: '빨강', duration: 10, passAbove: 200, correctPoints: 20, wrongPoints: -15, changeMs: 650 }
  },

  completion: '낮의 온실 복구 완료! 식물에게 이름을 지어 주세요.',
  nightWaiting: '밤 모드는 준비 중이에요. 선생님의 신호를 기다려 주세요.'
};
