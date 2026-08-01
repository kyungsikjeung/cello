import { describe, expect, it } from "vitest";
import { cloneSite, defaultSite } from "../src/data/default-site.js";
import { validateSite } from "../src/data/site-schema.js";

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
});
