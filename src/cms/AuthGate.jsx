import { useState } from "react";
import {
  accessibleProjects,
  demoUsers,
  readSession,
  roleLabels,
  signIn,
  signOut,
} from "./auth.js";

export function AuthGate({ children }) {
  const [session, setSession] = useState(readSession);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!session)
    return (
      <LoginScreen
        error={error}
        busy={busy}
        onSubmit={(email, password) => {
          setBusy(true);
          setError("");
          try {
            setSession(signIn(email, password));
          } catch (nextError) {
            setError(nextError.message);
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  const available = accessibleProjects(session);
  const project = available[0];
  if (!project)
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <p className="auth-kicker">ACCESS DENIED</p>
          <h1>접근 가능한 프로젝트가 없습니다.</h1>
          <button
            onClick={() => {
              signOut();
              setSession(null);
            }}
          >
            로그아웃
          </button>
        </section>
      </div>
    );
  return children({
    session,
    project,
    onLogout: () => {
      signOut();
      setSession(null);
    },
  });
}

function LoginScreen({ error, busy, onSubmit }) {
  const [email, setEmail] = useState(demoUsers[0].email);
  const [password, setPassword] = useState("demo1234");
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div>
          <p className="auth-kicker">LANDING CMS / LOCAL MVP</p>
          <h1>
            고객 작업공간에
            <br />
            로그인하세요.
          </h1>
          <p className="auth-warning">
            현재 단계는 로컬 권한 흐름 검증용입니다. 실제 고객 정보나 운영
            비밀번호를 입력하지 마세요.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(email, password);
          }}
        >
          <label>
            <span>EMAIL</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>PASSWORD</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "확인 중…" : "작업공간 열기"}
          </button>
        </form>
        <div className="auth-demo">
          <b>테스트 계정</b>
          {demoUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                setEmail(user.email);
                setPassword("demo1234");
              }}
            >
              <span>{roleLabels[user.role]}</span>
              {user.email}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
