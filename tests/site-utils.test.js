import { describe, expect, it } from "vitest";
import {
  compareSites,
  flatten,
  nextVersionId,
  resolveMedia,
} from "../src/cms/site-utils.js";

describe("flatten", () => {
  it("중첩 객체·배열을 점 표기 경로로 평탄화한다", () => {
    expect(flatten({ a: { b: [1, 2] }, c: "x" })).toEqual({
      "a.b.0": 1,
      "a.b.1": 2,
      c: "x",
    });
  });
});

describe("compareSites", () => {
  it("공개본과 초안의 달라진 필드만 나열한다", () => {
    const changes = compareSites({ name: "이전", phone: "same" }, { name: "이후", phone: "same" });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ path: "name", before: "이전", after: "이후" });
  });

  it("publishedAt·createdAt·id·summary 메타데이터는 무시한다", () => {
    const changes = compareSites(
      { id: "v001", publishedAt: "t1", createdAt: "t1", summary: "a" },
      { id: "v002", publishedAt: "t2", createdAt: "t2", summary: "b" },
    );
    expect(changes).toHaveLength(0);
  });

  it("공개본이 없으면 초안 전체를 변경으로 본다", () => {
    expect(compareSites(null, { name: "새 사이트" })).toHaveLength(1);
  });
});

describe("resolveMedia", () => {
  it("media: 참조를 URL 맵으로 치환하고 나머지는 보존한다", () => {
    const urls = { "media:abc": "blob:1" };
    expect(
      resolveMedia(
        { hero: { slides: [{ image: "media:abc" }, { image: "file.png" }] } },
        urls,
      ),
    ).toEqual({
      hero: { slides: [{ image: "blob:1" }, { image: "file.png" }] },
    });
  });

  it("맵에 없는 media: 참조는 원문을 유지한다", () => {
    expect(resolveMedia("media:missing", {})).toBe("media:missing");
  });
});

describe("nextVersionId", () => {
  it("빈 목록이면 v001을 발급한다", () => {
    expect(nextVersionId([])).toBe("v001");
  });

  it("기존 최대 번호에서 이어서 발급한다", () => {
    expect(nextVersionId([{ id: "v003" }, { id: "v002" }])).toBe("v004");
  });

  it("목록이 20개로 잘려도 번호가 중복되지 않는다", () => {
    const sliced = Array.from({ length: 20 }, (_, i) => ({
      id: `v${String(21 - i).padStart(3, "0")}`,
    }));
    expect(nextVersionId(sliced)).toBe("v022");
  });

  it("형식이 다른 ID는 건너뛴다", () => {
    expect(nextVersionId([{ id: "draft" }, { id: "v005" }])).toBe("v006");
  });
});
