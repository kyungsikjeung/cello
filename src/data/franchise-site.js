// 음식점에 한정하지 않는 소형 매장 프랜차이즈 기본 데이터입니다.
const franchiseHero = new URL("../../assets/franchise-hero.png", import.meta.url).href;
const branchNeighborhood = new URL("../../assets/franchise-branch-neighborhood.png", import.meta.url).href;
const branchOffice = new URL("../../assets/franchise-branch-office.png", import.meta.url).href;
const branchResidential = new URL("../../assets/franchise-branch-residential.png", import.meta.url).href;

export const franchiseSite = {
  id: "morrow-green",
  category: "franchise",
  name: "모로우 그린",
  wordmark: "MORROW / GREEN",
  template: "franchise-brand-01",
  theme: { primary: "#006241", background: "#F3F0E7", text: "#143A2E", imageMode: "color" },
  hero: {
    kicker: "NEIGHBORHOOD COFFEE · SMART OPERATION",
    title: ["YOUR DAILY.", "COFFEE", "RITUAL."],
    description: ["동네의 하루에 자연스럽게 스며드는 커피 브랜드.", "작은 매장에서도 한결같은 맛과 편안한 경험을 만듭니다."],
    cta: "가맹 상담 시작하기",
    secondaryCta: "브랜드 경쟁력",
    media: {
      kind: "image", src: franchiseHero, poster: franchiseHero, mobileFallback: franchiseHero,
      alt: "따뜻한 우드와 그린 톤의 셀프 서비스 커피 매장",
      focusDesktop: { x: 66, y: 50 }, focusMobile: { x: 68, y: 50 }, autoplay: true, muted: true, loop: true,
    },
  },
  service: { statusLabel: "가맹 상담 접수 중", todayHours: "평일 10:00 — 18:00", breakTime: "초기 상담 무료", lastOrder: "접수 순서대로 회신" },
  franchise: {
    title: "매일 찾고 싶은 동네의 커피 리추얼.",
    description: "편안한 그린과 우드의 공간, 일관된 한 잔, 작은 매장에 맞춘 운영 시스템을 하나의 브랜드 경험으로 설계합니다.",
    advantages: [
      { metric: "LOCAL", title: "동네에 머무는 브랜드", description: "출근길과 산책길에 자연스럽게 들르는 편안하고 친숙한 공간을 만듭니다." },
      { metric: "CRAFT", title: "한결같은 한 잔", description: "원두, 레시피, 장비 점검 기준을 표준화해 지점마다 같은 품질을 유지합니다." },
      { metric: "SMART", title: "작고 효율적인 운영", description: "셀프 주문과 단순한 동선으로 작은 면적에서도 안정적인 운영을 돕습니다." },
    ],
    steps: [
      { title: "카카오톡 상담", description: "희망 지역과 업종, 예상 일정과 예산 범위를 간단히 남깁니다." },
      { title: "상권·조건 검토", description: "브랜드 적합성과 예상 매장 규모, 운영 형태를 함께 검토합니다." },
      { title: "계약·교육", description: "비용과 역할을 확인한 뒤 장비, 상품, 운영 교육을 진행합니다." },
      { title: "오픈·운영 지원", description: "현장 점검 후 오픈하고 지점 운영 데이터를 함께 확인합니다." },
    ],
  },
  offerings: {
    title: "좋은 한 잔을 반복하는 운영 기반",
    description: "대표 매장 이미지의 + 포인트를 눌러 작은 공간 안에 구성된 운영 시스템을 확인하세요.",
    scene: {
      image: franchiseHero,
      alt: "셀프 주문 키오스크, 커피 바와 상품 진열이 구성된 소형 매장",
      focusDesktop: { x: 62, y: 50 },
      focusMobile: { x: 65, y: 50 },
    },
    items: [
      { badge: "SELF ORDER", name: "셀프 주문 키오스크", description: "주문과 결제를 한 번에 처리해 피크 시간의 대기와 운영 부담을 줄입니다.", image: franchiseHero, alt: "셀프 주문 키오스크", focusDesktop: { x: 52, y: 50 }, focusMobile: { x: 52, y: 50 }, positions: { desktop: { x: 52, y: 47, width: 280, side: "top" }, tablet: { x: 47, y: 48, width: 240, side: "top" }, mobile: { x: 40, y: 44, width: 220, side: "top" } } },
      { badge: "COFFEE BAR", name: "스마트 커피 바", description: "추출 장비와 작업대를 한 동선에 배치해 적은 인원으로도 일정한 품질을 유지합니다.", image: franchiseHero, alt: "커피 추출 바", focusDesktop: { x: 69, y: 50 }, focusMobile: { x: 69, y: 50 }, positions: { desktop: { x: 68, y: 48, width: 280, side: "top" }, tablet: { x: 67, y: 46, width: 240, side: "left" }, mobile: { x: 67, y: 40, width: 220, side: "left" } } },
      { badge: "PICKUP", name: "빠른 픽업 동선", description: "주문 고객과 픽업 고객의 흐름이 겹치지 않도록 전달 구역을 분리합니다.", image: franchiseHero, alt: "커피 픽업 공간", focusDesktop: { x: 75, y: 58 }, focusMobile: { x: 75, y: 58 }, positions: { desktop: { x: 73, y: 66, width: 260, side: "left" }, tablet: { x: 70, y: 65, width: 230, side: "left" }, mobile: { x: 62, y: 65, width: 220, side: "top" } } },
      { badge: "RETAIL", name: "상품 진열 모듈", description: "원두와 시즌 상품을 작은 면적에서도 선명하게 보여주는 표준 진열 기준을 제공합니다.", image: franchiseHero, alt: "원두와 상품 진열 선반", focusDesktop: { x: 88, y: 42 }, focusMobile: { x: 88, y: 42 }, positions: { desktop: { x: 88, y: 39, width: 270, side: "left" }, tablet: { x: 84, y: 38, width: 230, side: "left" }, mobile: { x: 78, y: 28, width: 220, side: "left" } } },
    ],
  },
  locations: {
    title: "가까운 지점을 확인하세요",
    description: "운영 중인 지점과 오픈 예정 지점을 사진, 주소, 운영시간과 함께 안내합니다.",
    items: [
      { name: "성수 플래그십", status: "운영 중", address: "서울 성동구 성수동 · 오피스 상권", hours: "평일 07:00 — 22:00", image: branchOffice, alt: "오피스 상권의 밝은 무인 매장", focusDesktop: { x: 50, y: 50 }, focusMobile: { x: 54, y: 50 } },
      { name: "연남 커뮤니티", status: "운영 중", address: "서울 마포구 연남동 · 주거 상권", hours: "매일 08:00 — 23:00", image: branchNeighborhood, alt: "주거 상권에 위치한 소형 매장 외관", focusDesktop: { x: 50, y: 50 }, focusMobile: { x: 50, y: 50 } },
      { name: "광교 레이크", status: "오픈 예정", address: "경기 수원시 광교 · 호수 상권", hours: "COMING 2026 H2", image: branchResidential, alt: "아파트 상권의 편안한 셀프 매장", focusDesktop: { x: 50, y: 50 }, focusMobile: { x: 52, y: 50 } },
    ],
  },
  gallery: {
    title: "우리 동네의 편안한 커피 장면",
    images: [
      { image: franchiseHero, alt: "키오스크와 셀프 서비스 공간을 갖춘 소형 매장", focusDesktop: { x: 65, y: 50 }, focusMobile: { x: 68, y: 50 } },
      { image: branchOffice, alt: "오피스 상권의 효율적인 셀프 서비스 매장", focusDesktop: { x: 50, y: 50 }, focusMobile: { x: 52, y: 50 } },
      { image: branchResidential, alt: "주거 상권의 편안한 무인 매장", focusDesktop: { x: 50, y: 50 }, focusMobile: { x: 52, y: 50 } },
    ],
  },
  inquiry: {
    label: "FRANCHISE INQUIRY",
    title: ["우리 동네에", "새로운 커피 리추얼."],
    description: "아직 업종이나 매장이 확정되지 않아도 괜찮습니다. 희망 지역과 운영 방식, 궁금한 점을 카카오톡으로 남겨주세요.",
    kakaoUrl: "https://pf.kakao.com/", phone: "",
  },
  seo: { title: "모로우 그린 | 동네 커피 프랜차이즈", description: "편안한 그린 공간과 스마트 운영 시스템을 갖춘 소형 커피 프랜차이즈 브랜드와 지점 안내" },
};

export const cloneFranchiseSite = () => JSON.parse(JSON.stringify(franchiseSite));
