export const defaultSite = {
  id: "ongyeol-cello",
  category: "lesson",
  name: "온결 첼로 스튜디오",
  wordmark: "ONGYEOL / CELLO",
  template: "editorial-02b",
  theme: {
    primary: "#275DFF",
    background: "#FFFFFF",
    text: "#111111",
    imageMode: "grayscale",
  },
  hero: {
    kicker: "PRIVATE LESSON · SEOUL",
    title: ["SEE THE", "SOUND", "TAKE SHAPE."],
    description: [
      "한 번의 레슨, 한 번의 발견.",
      "배우는 장면에서 수업의 차이를 확인하세요.",
    ],
    cta: "체험 레슨 문의 ↗",
    autoplayMs: 3600,
    slides: [
      {
        image: "cello-carousel-detail.png",
        label: "01 / BOW CONTROL",
        caption: "활 끝에서 시작되는 변화",
        alt: "성인 학생이 첼로 활 쓰기를 연습하는 모습",
      },
      {
        image: "cello-carousel-adult.png",
        label: "02 / ATTENTIVE FEEDBACK",
        caption: "소리를 먼저 듣는 수업",
        alt: "선생님이 성인 학생의 연주를 듣는 모습",
      },
      {
        image: "cello-carousel-notes.png",
        label: "03 / LESSON NOTES",
        caption: "나만의 연습을 기록하다",
        alt: "학생이 레슨 노트를 확인하는 모습",
      },
      {
        image: "cello-lesson-hero.png",
        label: "04 / ONE TO ONE",
        caption: "한 사람에게 집중하는 시간",
        alt: "선생님이 학생의 자세를 지도하는 모습",
      },
    ],
  },
  programs: [
    {
      label: "PROGRAM 01 / BEGINNER",
      title: ["처음 시작하는", "첼로"],
      description:
        "악기 선택부터 바른 자세와 활 쓰기까지, 첫 소리를 편안하고 탄탄하게 만듭니다.",
      image: "cello-carousel-adult.png",
      meta: [
        [
          "01 / SETUP",
          "몸에 맞는 시작",
          "악기와 의자 높이, 자세를 함께 맞춥니다.",
        ],
        [
          "02 / BOW",
          "첫 소리 만들기",
          "활의 무게와 속도를 익혀 안정된 소리를 냅니다.",
        ],
        [
          "03 / READ",
          "악보와 친해지기",
          "리듬과 음정을 실제 연주 속에서 배웁니다.",
        ],
        [
          "FORMAT",
          "주 1회 · 50분",
          "악기가 없어도 상담 후 시작할 수 있습니다.",
        ],
      ],
    },
    {
      label: "PROGRAM 02 / INTERMEDIATE",
      title: ["한 단계", "깊어지는 연주"],
      description:
        "정확하게 켜는 것을 넘어, 프레이징과 음색으로 나만의 해석을 만들어 갑니다.",
      image: "cello-carousel-detail.png",
      meta: [
        ["01 / LISTEN", "현재 소리 진단", "음정·리듬·보잉 습관을 확인합니다."],
        ["02 / REFINE", "소리 다듬기", "활의 속도와 무게를 조절합니다."],
        [
          "03 / EXPRESS",
          "표현 설계하기",
          "곡의 흐름을 나만의 언어로 만듭니다.",
        ],
        ["FORMAT", "주 1–2회 · 60분", "레슨 노트와 연습 가이드를 제공합니다."],
      ],
    },
    {
      label: "PROGRAM 03 / PROJECT",
      title: ["나만의", "한 곡 완성"],
      description:
        "좋아하는 곡을 골라 작은 목표를 세우고, 기록으로 남길 한 번의 연주를 완성합니다.",
      image: "cello-carousel-notes.png",
      meta: [
        [
          "01 / CHOOSE",
          "한 곡 선택하기",
          "취향과 현재 수준에 맞는 곡을 고릅니다.",
        ],
        ["02 / PLAN", "연습 설계하기", "4–8주의 작은 목표로 곡을 나눕니다."],
        ["03 / RECORD", "연주 기록하기", "집중 코칭 뒤 연주를 녹음합니다."],
        ["FORMAT", "4–8주 프로젝트", "원포인트 또는 정규 과정으로 진행합니다."],
      ],
    },
  ],
  teacher: {
    kicker: "ABOUT THE TEACHER",
    title: ["소리를 내기 전,", "먼저 사람을 듣습니다."],
    description: [
      "어려운 것을 참게 하는 수업보다,",
      "오늘의 소리를 스스로 좋아하게 되는 수업을 합니다.",
    ],
    name: "김온결 원장",
    role: "CELLIST & EDUCATOR",
    image: "cello-lesson-hero.png",
  },
  visit: {
    kicker: "VISIT THE STUDIO",
    title: ["조용히 집중할 수 있는", "당신 가까이의 레슨실"],
    address: "서울시 ○○구 ○○로 00, 3층",
    transit: "○○역 2번 출구 도보 5분",
  },
  contact: {
    title: ["첫 소리부터", "함께할게요."],
    kakaoChannelId: "",
    phone: "02-000-0000",
  },
  seo: {
    title: "온결 첼로 스튜디오 | 1:1 첼로 레슨",
    description: "서울 1:1 첼로 개인 레슨",
  },
};

export const cloneSite = (site = defaultSite) =>
  JSON.parse(JSON.stringify(site));
