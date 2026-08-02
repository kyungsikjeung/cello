// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  accessibleProjects,
  demoUsers,
  permissions,
  readSession,
  signIn,
  signOut,
} from "../src/cms/auth.js";

beforeEach(() => sessionStorage.clear());

describe("signIn / readSession", () => {
  it("올바른 자격으로 세션을 만들고 다시 읽는다", () => {
    const session = signIn("owner@ongyeol.local", "demo1234");
    expect(session.user.role).toBe("owner");
    expect(readSession()?.user.id).toBe(session.user.id);
  });

  it("이메일 대소문자·공백을 허용한다", () => {
    expect(signIn("  OWNER@ongyeol.local ", "demo1234").user.role).toBe(
      "owner",
    );
  });

  it("잘못된 비밀번호를 거부한다", () => {
    expect(() => signIn("owner@ongyeol.local", "wrong")).toThrow();
    expect(readSession()).toBeNull();
  });

  it("손상된 세션 저장값은 null 로 처리한다", () => {
    sessionStorage.setItem("landing-cms:auth-session", "{broken");
    expect(readSession()).toBeNull();
  });

  it("signOut 은 세션을 제거한다", () => {
    signIn("owner@ongyeol.local", "demo1234");
    signOut();
    expect(readSession()).toBeNull();
  });
});

describe("권한 모델", () => {
  it("역할별 edit/publish/manage 경계를 유지한다", () => {
    expect(permissions.owner).toEqual({ edit: true, publish: true, manage: true });
    expect(permissions.editor).toEqual({ edit: true, publish: false, manage: false });
    expect(permissions.viewer).toEqual({ edit: false, publish: false, manage: false });
  });

  it("접근 가능한 프로젝트만 돌려준다", () => {
    const session = signIn(demoUsers[0].email, "demo1234");
    expect(accessibleProjects(session).map((p) => p.id)).toEqual([
      "ongyeol-cello",
    ]);
    expect(accessibleProjects(null)).toEqual([]);
  });
});
