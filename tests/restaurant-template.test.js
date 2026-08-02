// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RestaurantTemplate } from "../src/RestaurantTemplate.jsx";
import { restaurantSite } from "../src/data/restaurant-site.js";
import { franchiseSite } from "../src/data/franchise-site.js";

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("RestaurantTemplate", () => {
  it("레스토랑 기본 데이터를 흰 화면 없이 렌더링한다", () => {
    act(() => root.render(React.createElement(RestaurantTemplate, { site: restaurantSite })));

    expect(container.querySelector("#restaurant-home")).not.toBeNull();
    expect(container.textContent).toContain("허브 그릴 치킨");
    expect(container.querySelectorAll(".restaurant-location-grid article")).toHaveLength(1);
    expect(container.querySelectorAll(".restaurant-orbit-card")).toHaveLength(3);
  });

  it("프랜차이즈도 별도 카테고리로 렌더링한다", () => {
    act(() => root.render(React.createElement(RestaurantTemplate, { site: franchiseSite })));

    expect(container.textContent).toContain("성수 플래그십");
    expect(container.querySelector(".restaurant-site.is-franchise")).not.toBeNull();
    expect(container.querySelector(".restaurant-hotspot-scene")).not.toBeNull();
    expect(container.querySelectorAll(".restaurant-hotspot-trigger")).toHaveLength(4);
    expect(container.querySelectorAll(".restaurant-location-grid article")).toHaveLength(3);
    expect(container.querySelectorAll("[data-parallax]").length).toBeGreaterThanOrEqual(4);

    const firstTrigger = container.querySelector(".restaurant-hotspot-trigger");
    act(() => firstTrigger.click());
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("주문과 결제를 한 번에 처리");
  });

  it("HMR 중 선택 데이터가 비어도 안내 상태를 렌더링한다", () => {
    const sparseSite = {
      name: "임시 브랜드",
      wordmark: "TEMP / BRAND",
      category: "franchise",
      theme: {},
      hero: { title: "TEMP TABLE", description: "편집 중 데이터" },
      offerings: { title: "운영 기반", items: [] },
      locations: { title: "지점", items: [] },
      gallery: { title: "공간", images: [] },
    };

    act(() => root.render(React.createElement(RestaurantTemplate, { site: sparseSite, preview: true })));

    expect(container.textContent).toContain("운영 기반 항목을 CMS에서 추가해 주세요.");
    expect(container.textContent).toContain("매장 사진을 CMS에서 추가해 주세요.");
  });
});
