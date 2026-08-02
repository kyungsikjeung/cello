import { describe, expect, it } from "vitest";
import { cloneSite, defaultSite } from "../src/data/default-site.js";
import { validateSite } from "../src/data/site-schema.js";
import { cloneRestaurantSite, restaurantSite } from "../src/data/restaurant-site.js";
import { cloneFranchiseSite, franchiseSite } from "../src/data/franchise-site.js";

const withChange = (mutate) => {
  const site = cloneSite(defaultSite);
  mutate(site);
  return validateSite(site);
};

describe("siteSchema", () => {
  it("기본 사이트 데이터를 통과시킨다", () => {
    expect(validateSite(defaultSite).success).toBe(true);
  });

  it("문자열 앞뒤 공백을 trim 해서 반환한다", () => {
    const result = withChange((site) => {
      site.name = "  온결 첼로 스튜디오  ";
    });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe("온결 첼로 스튜디오");
  });

  it("빈 필수 문자열을 거부한다", () => {
    expect(withChange((s) => (s.hero.kicker = " ")).success).toBe(false);
  });

  it("캐러셀 슬라이드 3장 미만을 거부한다", () => {
    expect(
      withChange((s) => (s.hero.slides = s.hero.slides.slice(0, 2))).success,
    ).toBe(false);
  });

  it("포인트 색상 형식(#RRGGBB)을 강제한다", () => {
    expect(withChange((s) => (s.theme.primary = "blue")).success).toBe(false);
  });

  it("이미지 초점 좌표를 10~90% 범위로 제한한다", () => {
    expect(
      withChange((s) => (s.hero.slides[0].focusDesktop = { x: 95, y: 50 }))
        .success,
    ).toBe(false);
    expect(
      withChange((s) => (s.hero.slides[0].focusDesktop = { x: 90, y: 10 }))
        .success,
    ).toBe(true);
  });

  it("자동재생 간격을 2000~12000ms로 제한한다", () => {
    expect(withChange((s) => (s.hero.autoplayMs = 1000)).success).toBe(false);
  });

  it("허용되지 않은 템플릿을 거부한다", () => {
    expect(withChange((s) => (s.template = "unknown-01")).success).toBe(false);
  });

  it("레스토랑 템플릿 기본 데이터를 통과시킨다", () => {
    expect(validateSite(restaurantSite).success).toBe(true);
  });

  it("레스토랑 갤러리 이미지 3장 미만을 거부한다", () => {
    const site = cloneRestaurantSite();
    site.gallery.images = site.gallery.images.slice(0, 2);
    expect(validateSite(site).success).toBe(false);
  });

  it("레스토랑 메뉴와 갤러리 초점을 10~90%로 제한한다", () => {
    const offeringSite = cloneRestaurantSite();
    offeringSite.menu.items[0].focusMobile = { x: 91, y: 50 };
    expect(validateSite(offeringSite).success).toBe(false);

    const gallerySite = cloneRestaurantSite();
    gallerySite.gallery.images[0].focusDesktop = { x: 10, y: 90 };
    expect(validateSite(gallerySite).success).toBe(true);
  });

  it("프랜차이즈와 운영 기반 초점 계약을 별도로 유지한다", () => {
    expect(validateSite(franchiseSite).success).toBe(true);
    const offeringSite = cloneFranchiseSite();
    offeringSite.offerings.items[0].focusMobile = { x: 91, y: 50 };
    expect(validateSite(offeringSite).success).toBe(false);
  });

  it("운영 이미지 포인트 좌표와 설명창 폭을 화면별 안전 범위로 제한한다", () => {
    const coordinateSite = cloneFranchiseSite();
    coordinateSite.offerings.items[0].positions.desktop.x = 4;
    expect(validateSite(coordinateSite).success).toBe(false);

    const widthSite = cloneFranchiseSite();
    widthSite.offerings.items[0].positions.mobile.width = 370;
    expect(validateSite(widthSite).success).toBe(false);

    const legacySite = cloneFranchiseSite();
    delete legacySite.offerings.scene;
    legacySite.offerings.items.forEach((item) => delete item.positions);
    expect(validateSite(legacySite).success).toBe(true);
  });

  it("지점은 최소 1개를 유지하고 최대 30개까지 허용한다", () => {
    const empty = cloneFranchiseSite();
    empty.locations.items = [];
    expect(validateSite(empty).success).toBe(false);

    const one = cloneFranchiseSite();
    one.locations.items = one.locations.items.slice(0, 1);
    expect(validateSite(one).success).toBe(true);
  });

  it("Hero 영상은 음소거와 모바일 대체 이미지를 강제한다", () => {
    const site = cloneRestaurantSite();
    site.hero.media.kind = "video";
    site.hero.media.src = "media:video";
    site.hero.media.poster = "";
    site.hero.media.mobileFallback = "";
    expect(validateSite(site).success).toBe(false);
  });
});
