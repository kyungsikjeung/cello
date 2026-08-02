const restaurantHero = new URL("../../assets/restaurant-hero.png", import.meta.url).href;
const restaurantChicken = new URL("../../assets/restaurant-chicken.png", import.meta.url).href;
const restaurantPasta = new URL("../../assets/restaurant-pasta.png", import.meta.url).href;
const restaurantInterior = new URL("../../assets/restaurant-interior.png", import.meta.url).href;

export const restaurantSite = {
  id: "morrow-table",
  category: "restaurant",
  name: "모로우 테이블",
  wordmark: "MORROW / TABLE",
  template: "restaurant-editorial-01",
  theme: {
    primary: "#275DFF",
    background: "#F5F3ED",
    text: "#111111",
    imageMode: "color",
  },
  hero: {
    kicker: "SEASONAL DINING · SEOUL · 2026",
    title: ["TASTE THE", "SEASON.", "STAY AWHILE."],
    description: ["제철의 온도를 가장 좋은 순간에 한 접시에 담습니다.", "느긋한 저녁과 오래 남는 대화를 위한 작은 테이블입니다."],
    cta: "카카오톡 예약 문의",
    secondaryCta: "메뉴 보기",
    media: {
      kind: "image",
      src: restaurantHero,
      poster: restaurantHero,
      mobileFallback: restaurantHero,
      alt: "따뜻한 햇살이 들어오는 모로우 테이블과 제철 요리",
      focusDesktop: { x: 68, y: 50 },
      focusMobile: { x: 68, y: 50 },
      autoplay: true,
      muted: true,
      loop: true,
    },
  },
  service: {
    statusLabel: "오늘 저녁 예약 가능",
    todayHours: "DINNER 17:30 — 22:00",
    breakTime: "월요일 휴무",
    lastOrder: "LAST ORDER 20:30",
  },
  franchise: {
    title: "작은 접시에도 계절은 선명합니다.",
    description: "재료가 가장 좋은 시기를 기다리고, 필요한 만큼만 조리하며, 손님 한 사람의 속도에 맞춰 테이블을 완성합니다.",
    advantages: [
      { metric: "SEASONAL", title: "제철을 담는 메뉴", description: "산지와 계절에 따라 가장 좋은 재료를 골라 메뉴를 조금씩 바꿉니다." },
      { metric: "ATTENTIVE", title: "조용한 환대", description: "설명은 충분하게, 식사의 흐름은 방해하지 않게 세심한 서비스를 지향합니다." },
      { metric: "INTIMATE", title: "머물기 좋은 공간", description: "가까운 대화와 편안한 식사를 위해 테이블 간격과 빛의 온도를 설계했습니다." },
    ],
    steps: [
      { title: "예약 문의", description: "방문 날짜와 인원, 알레르기 또는 기념일 여부를 알려주세요." },
      { title: "예약 확인", description: "가능한 시간과 좌석을 확인해 카카오톡 또는 전화로 안내합니다." },
      { title: "테이블 준비", description: "계절 메뉴와 요청 사항을 반영해 방문 전 테이블을 준비합니다." },
      { title: "식사와 다음 계절", description: "천천히 식사를 즐기고 다음 계절의 새로운 메뉴를 만나보세요." },
    ],
  },
  menu: {
    title: "오늘 가장 좋은 재료로 만듭니다.",
    description: "핵심 메뉴는 선명하게 유지하고 제철 재료에 따라 가니시와 소스를 조금씩 바꿉니다.",
    items: [
      { name: "허브 그릴 치킨", description: "제철 채소 · 허브 소스", price: 22000, image: restaurantChicken, alt: "허브 그릴 치킨과 제철 채소", focusDesktop: { x: 50, y: 50 }, focusMobile: { x: 50, y: 52 } },
      { name: "토마토 바질 파스타", description: "토마토 · 바질 · 파르미지아노", price: 18000, image: restaurantPasta, alt: "토마토 바질 파스타", focusDesktop: { x: 50, y: 52 }, focusMobile: { x: 50, y: 54 } },
    ],
  },
  gallery: {
    title: "배우듯 맛보고, 머물듯 기억합니다.",
    images: [
      { image: restaurantInterior, alt: "오픈 키친이 보이는 레스토랑 내부", focusDesktop: { x: 50, y: 50 }, focusMobile: { x: 58, y: 50 } },
      { image: restaurantChicken, alt: "대표 메뉴 허브 그릴 치킨", focusDesktop: { x: 50, y: 50 }, focusMobile: { x: 50, y: 52 } },
      { image: restaurantPasta, alt: "대표 메뉴 토마토 바질 파스타", focusDesktop: { x: 50, y: 52 }, focusMobile: { x: 50, y: 54 } },
    ],
  },
  visit: {
    address: "서울시 ○○구 ○○로 00, 1층",
    transit: "○○역 2번 출구 도보 5분",
    parking: "인근 공영주차장 1시간 지원",
    mapUrl: "https://map.kakao.com",
  },
  inquiry: {
    label: "RESERVATION",
    title: ["오늘의 계절을", "예약하세요."],
    description: "방문 날짜와 인원, 알레르기 또는 기념일 여부를 남겨주세요. 좌석을 확인한 뒤 순서대로 답변드립니다.",
    kakaoUrl: "https://pf.kakao.com/",
    phone: "02-000-0000",
  },
  seo: {
    title: "모로우 테이블 | 서울의 계절 레스토랑",
    description: "제철 재료와 조용한 환대, 따뜻한 공간을 경험하는 서울의 작은 레스토랑 모로우 테이블",
  },
};

export const cloneRestaurantSite = () => JSON.parse(JSON.stringify(restaurantSite));
