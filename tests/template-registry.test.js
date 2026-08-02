import { describe, expect, it } from "vitest";
import { resolveTemplateRequest } from "../src/data/template-registry.js";

describe("template registry", () => {
  it.each([
    "?template=restaurant",
    "?template=restaurant-editorial-01",
    "?template=restaurant-essential-01",
    "?template=restaurant-franchise-01",
    "?category=restaurant",
    "?template=%20RESTAURANT%20",
  ])("레스토랑 deep link와 이전 호환 주소 %s를 같은 템플릿으로 해석한다", (search) => {
    const resolved = resolveTemplateRequest(search);
    expect(resolved.site.category).toBe("restaurant");
    expect(resolved.site.template).toBe("restaurant-editorial-01");
  });

  it.each(["?template=franchise", "?template=franchise-brand-01"])("프랜차이즈 주소 %s를 레스토랑과 분리한다", (search) => {
    const resolved = resolveTemplateRequest(search);
    expect(resolved.site.category).toBe("franchise");
    expect(resolved.site.template).toBe("franchise-brand-01");
  });

  it("기본 주소는 기존 02B 레슨 템플릿을 유지한다", () => {
    const resolved = resolveTemplateRequest("");
    expect(resolved.site.category).toBe("lesson");
    expect(resolved.site.template).toBe("editorial-02b");
  });

  it("알 수 없는 템플릿을 조용히 02B로 대체하지 않는다", () => {
    const resolved = resolveTemplateRequest("?template=missing-template");
    expect(resolved.site).toBeNull();
    expect(resolved.entry).toBeNull();
  });
});
