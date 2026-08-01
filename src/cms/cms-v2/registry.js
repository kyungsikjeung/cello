export const CATEGORY_IDS = ["lesson", "company", "restaurant", "wedding"];

export const sectionRegistry = {
  hero: {
    id: "hero",
    label: "첫 화면",
    required: true,
    editorImplemented: true,
  },
  program: {
    id: "program",
    label: "프로그램",
    required: false,
    editorImplemented: true,
  },
  teacher: {
    id: "teacher",
    label: "강사",
    required: false,
    editorImplemented: true,
  },
  visit: {
    id: "visit",
    label: "위치",
    required: true,
    editorImplemented: true,
  },
  theme: {
    id: "theme",
    label: "디자인",
    required: true,
    editorImplemented: true,
  },
  media: {
    id: "media",
    label: "미디어",
    required: true,
    editorImplemented: true,
  },
  versions: {
    id: "versions",
    label: "버전",
    required: true,
    editorImplemented: true,
  },
  about: {
    id: "about",
    label: "소개",
    required: true,
    editorImplemented: false,
  },
  services: {
    id: "services",
    label: "서비스",
    required: true,
    editorImplemented: false,
  },
  cases: {
    id: "cases",
    label: "프로젝트",
    required: false,
    editorImplemented: false,
  },
  team: { id: "team", label: "팀", required: false, editorImplemented: false },
  contact: {
    id: "contact",
    label: "문의",
    required: true,
    editorImplemented: false,
  },
  menu: { id: "menu", label: "메뉴", required: true, editorImplemented: false },
  hours: {
    id: "hours",
    label: "영업시간",
    required: true,
    editorImplemented: false,
  },
  reservation: {
    id: "reservation",
    label: "예약",
    required: true,
    editorImplemented: false,
  },
  couple: {
    id: "couple",
    label: "신랑·신부",
    required: true,
    editorImplemented: false,
  },
  schedule: {
    id: "schedule",
    label: "예식 일정",
    required: true,
    editorImplemented: false,
  },
  gallery: {
    id: "gallery",
    label: "갤러리",
    required: false,
    editorImplemented: false,
  },
  rsvp: {
    id: "rsvp",
    label: "참석 응답",
    required: true,
    editorImplemented: false,
  },
};

export const categoryRegistry = {
  lesson: {
    id: "lesson",
    label: "레슨·교육",
    defaultTemplateId: "editorial-02b",
    templates: ["editorial-02b"],
    sectionIds: [
      "hero",
      "program",
      "teacher",
      "visit",
      "theme",
      "media",
      "versions",
    ],
  },
  company: {
    id: "company",
    label: "회사",
    defaultTemplateId: "company-editorial",
    templates: ["company-editorial"],
    sectionIds: [
      "hero",
      "about",
      "services",
      "cases",
      "team",
      "contact",
      "theme",
      "media",
      "versions",
    ],
  },
  restaurant: {
    id: "restaurant",
    label: "레스토랑",
    defaultTemplateId: "restaurant-editorial",
    templates: ["restaurant-editorial"],
    sectionIds: [
      "hero",
      "menu",
      "gallery",
      "hours",
      "visit",
      "reservation",
      "theme",
      "media",
      "versions",
    ],
  },
  wedding: {
    id: "wedding",
    label: "웨딩",
    defaultTemplateId: "wedding-editorial",
    templates: ["wedding-editorial"],
    sectionIds: [
      "hero",
      "couple",
      "schedule",
      "gallery",
      "visit",
      "rsvp",
      "theme",
      "media",
      "versions",
    ],
  },
};

export function getCategory(categoryId) {
  return categoryRegistry[categoryId] || categoryRegistry.lesson;
}

export function createSectionState(categoryId) {
  return getCategory(categoryId).sectionIds.map((id, index) => ({
    id,
    enabled: true,
    order: index,
  }));
}

export function getEditorTabs(categoryId, sectionState) {
  const configured =
    Array.isArray(sectionState) && sectionState.length
      ? sectionState
      : createSectionState(categoryId);
  return configured
    .filter(
      (section) =>
        section.enabled && sectionRegistry[section.id]?.editorImplemented,
    )
    .sort((a, b) => a.order - b.order)
    .map((section) => [section.id, sectionRegistry[section.id].label]);
}

export function validateCategoryConfig(site) {
  const category = categoryRegistry[site.category];
  if (!category) return ["지원하지 않는 업종 카테고리입니다."];
  if (!category.templates.includes(site.templateId))
    return ["선택한 업종에서 사용할 수 없는 템플릿입니다."];
  const sectionIds = new Set(
    (site.sections || []).map((section) => section.id),
  );
  return category.sectionIds
    .filter((id) => sectionRegistry[id].required && !sectionIds.has(id))
    .map((id) => `${sectionRegistry[id].label} 섹션이 필요합니다.`);
}
