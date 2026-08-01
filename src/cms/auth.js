const SESSION_KEY = "landing-cms:auth-session";

export const demoUsers = [
  {
    id: "user-owner",
    email: "owner@ongyeol.local",
    password: "demo1234",
    name: "김온결",
    role: "owner",
    projectIds: ["ongyeol-cello"],
  },
  {
    id: "user-editor",
    email: "editor@ongyeol.local",
    password: "demo1234",
    name: "콘텐츠 편집자",
    role: "editor",
    projectIds: ["ongyeol-cello"],
  },
  {
    id: "user-viewer",
    email: "viewer@ongyeol.local",
    password: "demo1234",
    name: "검토 담당자",
    role: "viewer",
    projectIds: ["ongyeol-cello"],
  },
];

export const projects = [
  { id: "ongyeol-cello", name: "온결 첼로 스튜디오", status: "active" },
];

export const roleLabels = {
  owner: "소유자",
  editor: "편집자",
  viewer: "검토자",
};
export const permissions = {
  owner: { edit: true, publish: true, manage: true },
  editor: { edit: true, publish: false, manage: false },
  viewer: { edit: false, publish: false, manage: false },
};

export function signIn(email, password) {
  const user = demoUsers.find(
    (candidate) =>
      candidate.email.toLowerCase() === email.trim().toLowerCase() &&
      candidate.password === password,
  );
  if (!user) throw new Error("이메일 또는 비밀번호를 확인해 주세요.");
  const session = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      projectIds: user.projectIds,
    },
    createdAt: new Date().toISOString(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    const user = demoUsers.find(
      (candidate) => candidate.id === session?.user?.id,
    );
    if (!user) return null;
    return {
      ...session,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        projectIds: user.projectIds,
      },
    };
  } catch {
    return null;
  }
}

export function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function accessibleProjects(session) {
  const allowed = new Set(session?.user?.projectIds || []);
  return projects.filter((project) => allowed.has(project.id));
}
