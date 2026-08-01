import { validateSite } from "../data/site-schema.js";

export const fieldNames = {
  name: "학원명",
  wordmark: "워드마크",
  "hero.kicker": "첫 화면 라벨",
  "hero.title.0": "첫 화면 제목 1",
  "hero.title.1": "첫 화면 제목 2",
  "hero.title.2": "첫 화면 제목 3",
  "hero.description.0": "첫 화면 설명 1",
  "hero.description.1": "첫 화면 설명 2",
  "hero.cta": "CTA",
  "hero.autoplayMs": "캐러셀 속도",
  "teacher.name": "강사 이름",
  "teacher.role": "강사 역할",
  "visit.address": "주소",
  "visit.transit": "교통 안내",
  "contact.phone": "전화번호",
  "theme.primary": "포인트 색상",
  "seo.title": "SEO 제목",
};

export const friendlyIssue = (issue) =>
  `${fieldNames[issue.path.join(".")] || issue.path.join(".")}: ${issue.code === "too_small" ? "필수 입력값입니다." : issue.code === "too_big" ? "허용 길이를 초과했습니다." : "입력값을 확인해 주세요."}`;

export function flatten(value, path = "", result = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      flatten(item, path ? `${path}.${i}` : `${i}`, result),
    );
    return result;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      flatten(item, path ? `${path}.${key}` : key, result),
    );
    return result;
  }
  result[path] = value;
  return result;
}

export function compareSites(published, draft) {
  const before = flatten(published || {}),
    after = flatten(draft),
    metadata = new Set(["publishedAt", "createdAt", "id", "summary"]);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(
      (path) =>
        !metadata.has(path) &&
        JSON.stringify(before[path]) !== JSON.stringify(after[path]),
    )
    .map((path) => ({
      path,
      label: fieldNames[path] || path,
      before: before[path],
      after: after[path],
    }));
}

export const resolveMedia = (value, urls) => {
  if (Array.isArray(value))
    return value.map((item) => resolveMedia(item, urls));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveMedia(item, urls),
      ]),
    );
  return typeof value === "string" && value.startsWith("media:")
    ? urls[value] || value
    : value;
};

// 버전 목록이 20개로 잘려도 ID가 겹치지 않도록 기존 최대 번호에서 이어서 발급한다.
export function nextVersionId(versions) {
  const max = versions.reduce((highest, version) => {
    const number = Number(/^v(\d+)$/.exec(version.id || "")?.[1]);
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `v${String(max + 1).padStart(3, "0")}`;
}

// ── 저장소(localStorage) 복원 방어: 손상·구버전 데이터로 admin 이 크래시하지 않게 한다 ──

// 초안 복원: 스키마 통과본만 신뢰. 실패 시 fallback + recovered 플래그로 사용자에게 고지.
export function sanitizeStoredDraft(raw, fallbackSite) {
  if (raw && typeof raw === "object") {
    const result = validateSite(raw);
    if (result.success) return { site: result.data, recovered: false };
  }
  return { site: fallbackSite, recovered: raw != null };
}

// 공개본 복원: V2 스냅샷({site:...}) 또는 V1 레거시(사이트 객체)만 허용.
export function sanitizeStoredPublished(raw) {
  return raw && typeof raw === "object" ? raw : null;
}

// 버전 목록 복원: 배열이 아니거나 항목이 스키마를 통과하지 못하면 걸러낸다.
export function sanitizeStoredVersions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (version) =>
      version &&
      typeof version.id === "string" &&
      version.site &&
      validateSite(version.site).success,
  );
}
