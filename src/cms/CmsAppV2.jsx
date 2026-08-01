import { useEffect, useMemo, useRef, useState } from "react";
import { LandingTemplate } from "./PreviewBridge.jsx";
import { cloneSite } from "../data/default-site.js";
import { validateSite } from "../data/site-schema.js";
import {
  FocusControls,
  MediaLibrary,
  useMediaLibrary,
} from "./MediaLibrary.jsx";
import { permissions, roleLabels } from "./auth.js";

const projectKeys = (projectId) => ({
  draft: `landing-cms:draft:${projectId}`,
  published: `landing-cms:published:${projectId}`,
  versions: `landing-cms:versions:${projectId}`,
});
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const fieldNames = {
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
const friendlyIssue = (issue) =>
  `${fieldNames[issue.path.join(".")] || issue.path.join(".")}: ${issue.code === "too_small" ? "필수 입력값입니다." : issue.code === "too_big" ? "허용 길이를 초과했습니다." : "입력값을 확인해 주세요."}`;

function flatten(value, path = "", result = {}) {
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
function compareSites(published, draft) {
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
const display = (value) => (value === undefined ? "—" : String(value));
const resolveMedia = (value, urls) => {
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

function Field({ label, value, onChange, multiline = false, type = "text" }) {
  const Control = multiline ? "textarea" : "input";
  return (
    <label className="cms-field">
      <span>{label}</span>
      <Control
        type={type}
        value={value}
        onChange={(e) =>
          onChange(type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
    </label>
  );
}
function SectionTitle({ number, children }) {
  return (
    <h2 className="cms-section-title">
      <span>{number}</span>
      {children}
    </h2>
  );
}
function ImageEditor({ item, path, update, chooseMedia, updateFocus }) {
  return (
    <div className="cms-image-editor">
      <div className="cms-image-source">
        <Field
          label="이미지 참조"
          value={item.image}
          onChange={(value) => update([...path, "image"], value)}
        />
        <button type="button" onClick={() => chooseMedia([...path, "image"])}>
          미디어에서 선택
        </button>
      </div>
      <FocusControls
        item={item}
        onChange={(kind, axis, value) =>
          updateFocus(path, item, kind, axis, value)
        }
      />
    </div>
  );
}
function ConfirmModal({ title, description, onCancel, onConfirm }) {
  return (
    <div className="cms-modal-backdrop" role="presentation">
      <section
        className="cms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <small>CONFIRM ACTION</small>
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        <div>
          <button onClick={onCancel}>취소</button>
          <button className="danger" onClick={onConfirm}>
            복원하기
          </button>
        </div>
      </section>
    </div>
  );
}

export function CmsAppV2({ session, project, onLogout }) {
  const projectId = project.id;
  const keys = useMemo(() => projectKeys(projectId), [projectId]);
  const access = permissions[session.user.role] || permissions.viewer;
  const initialDraft = useMemo(
    () => read(keys.draft, cloneSite()),
    [keys.draft],
  );
  const [site, setSite] = useState(initialDraft),
    [published, setPublished] = useState(() => read(keys.published, null)),
    [versions, setVersions] = useState(() => read(keys.versions, []));
  const [tab, setTab] = useState("hero"),
    [device, setDevice] = useState("desktop"),
    [dirty, setDirty] = useState(false),
    [status, setStatus] = useState(
      localStorage.getItem(keys.draft) ? "저장된 초안 불러옴" : "새 초안",
    );
  const [errors, setErrors] = useState([]),
    [compareOpen, setCompareOpen] = useState(false),
    [confirmReset, setConfirmReset] = useState(false),
    [mediaTarget, setMediaTarget] = useState(null);
  const media = useMediaLibrary(projectId);
  const fileRef = useRef(null),
    autoSaveReady = useRef(false);
  const validation = useMemo(() => validateSite(site), [site]);
  const changes = useMemo(
    () => compareSites(published?.site || published, site),
    [published, site],
  );
  const previewSite = useMemo(
    () => resolveMedia(site, media.resolved),
    [site, media.resolved],
  );
  const usedMediaRefs = useMemo(
    () =>
      new Set(
        Object.values(flatten(site)).filter(
          (value) => typeof value === "string" && value.startsWith("media:"),
        ),
      ),
    [site],
  );
  const update = (path, value) =>
    setSite((previous) => {
      if (!access.edit) return previous;
      const next = cloneSite(previous);
      let target = next;
      path.slice(0, -1).forEach((key) => {
        target = target[key];
      });
      target[path.at(-1)] = value;
      setDirty(true);
      setStatus("저장되지 않은 변경");
      return next;
    });
  const updateFocus = (path, item, kind, axis, value) =>
    update([...path, kind], {
      ...(item[kind] || { x: 50, y: 50 }),
      [axis]: value,
    });
  const chooseMedia = (path) => {
    setMediaTarget(path);
    setTab("media");
  };

  useEffect(() => {
    if (!autoSaveReady.current) {
      autoSaveReady.current = true;
      return;
    }
    if (!dirty) return;
    setStatus("자동 저장 대기 중");
    const timer = setTimeout(() => {
      const result = validateSite(site);
      if (!result.success) {
        setStatus("검증 오류 · 자동 저장 보류");
        return;
      }
      localStorage.setItem(keys.draft, JSON.stringify(site));
      setDirty(false);
      setStatus(`자동 저장 완료 · ${new Date().toLocaleTimeString("ko-KR")}`);
    }, 900);
    return () => clearTimeout(timer);
  }, [site, dirty]);
  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () => {
    if (!access.edit) {
      setStatus("검토자 권한은 저장할 수 없습니다.");
      return;
    }
    const result = validateSite(site);
    if (!result.success) {
      setErrors(result.error.issues.map(friendlyIssue));
      setStatus("검증 오류");
      return;
    }
    localStorage.setItem(keys.draft, JSON.stringify(site));
    setErrors([]);
    setDirty(false);
    setStatus(`수동 저장 완료 · ${new Date().toLocaleTimeString("ko-KR")}`);
  };
  const publish = () => {
    if (!access.publish) {
      setStatus("소유자만 사이트를 공개할 수 있습니다.");
      return;
    }
    const result = validateSite(site);
    if (!result.success) {
      setErrors(result.error.issues.map(friendlyIssue));
      setStatus("검증 오류");
      return;
    }
    const snapshot = {
      id: `v${String(versions.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      summary: `${changes.length}개 항목 변경`,
      site: cloneSite(site),
    };
    const nextVersions = [snapshot, ...versions].slice(0, 20);
    localStorage.setItem(keys.draft, JSON.stringify(site));
    localStorage.setItem(keys.published, JSON.stringify(snapshot));
    localStorage.setItem(keys.versions, JSON.stringify(nextVersions));
    setPublished(snapshot);
    setVersions(nextVersions);
    setDirty(false);
    setErrors([]);
    setStatus(`${snapshot.id} 공개본 생성 완료`);
    setCompareOpen(false);
  };
  const restoreDefaults = () => {
    const next = cloneSite();
    setSite(next);
    setDirty(true);
    setErrors([]);
    setStatus("기본값 복원 · 자동 저장 대기");
    setConfirmReset(false);
  };
  const restoreVersion = (version) => {
    setSite(cloneSite(version.site));
    setDirty(true);
    setErrors([]);
    setStatus(`${version.id} 복원 · 자동 저장 대기`);
    setTab("hero");
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(site, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `${site.id}-site.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = async (event) => {
    if (!access.edit) return;
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const next = JSON.parse(await file.text()),
        result = validateSite(next);
      if (!result.success)
        throw new Error("사이트 데이터 형식이 맞지 않습니다.");
      setSite(next);
      setDirty(true);
      setErrors([]);
      setStatus("JSON 불러옴 · 자동 저장 대기");
    } catch (error) {
      setErrors([`가져오기 실패: ${error.message}`]);
    }
    event.target.value = "";
  };
  const tabs = [
    ["hero", "첫 화면"],
    ["program", "프로그램"],
    ["teacher", "강사"],
    ["visit", "위치"],
    ["theme", "디자인"],
    ["media", "미디어"],
    ["versions", "버전"],
  ];
  const logout = () => {
    if (dirty && validation.success)
      localStorage.setItem(keys.draft, JSON.stringify(site));
    onLogout();
  };

  return (
    <div className="cms-shell">
      <header className="cms-topbar">
        <div>
          <b>LANDING CMS</b>
          <span>{site.name}</span>
          {dirty && <i className="cms-dirty-dot" title="저장되지 않은 변경" />}
        </div>
        <div className="cms-top-actions">
          <span className="cms-user">
            <b>{session.user.name}</b> · {roleLabels[session.user.role]}
          </span>
          <span className={validation.success ? "valid" : "invalid"}>
            {validation.success
              ? dirty
                ? "변경사항 있음"
                : "데이터 정상"
              : "입력 확인 필요"}
          </span>
          <button onClick={() => setCompareOpen(true)}>
            변경 비교 <b>{changes.length}</b>
          </button>
          <button disabled={!access.edit} onClick={save}>
            지금 저장
          </button>
          <button
            className="primary"
            disabled={!access.publish}
            onClick={publish}
          >
            사이트에 공개
          </button>
          <button onClick={logout}>로그아웃</button>
        </div>
      </header>
      <aside className="cms-sidebar">
        <button className="cms-project">
          <span>PROJECT</span>
          <b>{project.name}</b>
          <small>{project.id}</small>
        </button>
        <nav>
          {tabs.map(([id, label], i) => (
            <button
              className={tab === id ? "active" : ""}
              key={id}
              onClick={() => setTab(id)}
            >
              <span>0{i + 1}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="cms-file-actions">
          <button
            disabled={!access.edit}
            onClick={() => fileRef.current.click()}
          >
            JSON 불러오기
          </button>
          <button onClick={exportJson}>JSON 내보내기</button>
          <button disabled={!access.edit} onClick={() => setConfirmReset(true)}>
            기본값 복원
          </button>
          <input
            hidden
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={importJson}
          />
        </div>
      </aside>
      <main className={`cms-editor ${access.edit ? "" : "is-readonly"}`}>
        <div className="cms-editor-head">
          <p>CONTENT EDITOR</p>
          <h1>{tabs.find((x) => x[0] === tab)?.[1]}</h1>
          <small className={dirty ? "dirty" : ""}>{status}</small>
        </div>
        {tab === "hero" && (
          <div className="cms-form">
            <SectionTitle number="01">브랜드 메시지</SectionTitle>
            <Field
              label="작은 라벨"
              value={site.hero.kicker}
              onChange={(v) => update(["hero", "kicker"], v)}
            />
            {site.hero.title.map((x, i) => (
              <Field
                key={i}
                label={`제목 ${i + 1}`}
                value={x}
                onChange={(v) => update(["hero", "title", i], v)}
              />
            ))}
            {site.hero.description.map((x, i) => (
              <Field
                key={i}
                label={`설명 ${i + 1}`}
                value={x}
                onChange={(v) => update(["hero", "description", i], v)}
              />
            ))}
            <Field
              label="CTA"
              value={site.hero.cta}
              onChange={(v) => update(["hero", "cta"], v)}
            />
            <Field
              type="number"
              label="자동재생 간격(ms)"
              value={site.hero.autoplayMs}
              onChange={(v) => update(["hero", "autoplayMs"], v)}
            />
            <SectionTitle number="02">캐러셀 이미지</SectionTitle>
            {site.hero.slides.map((slide, i) => (
              <div className="cms-card" key={i}>
                <b>IMAGE {String(i + 1).padStart(2, "0")}</b>
                <ImageEditor
                  item={slide}
                  path={["hero", "slides", i]}
                  update={update}
                  chooseMedia={chooseMedia}
                  updateFocus={updateFocus}
                />
                <Field
                  label="캡션"
                  value={slide.caption}
                  onChange={(v) => update(["hero", "slides", i, "caption"], v)}
                />
                <Field
                  label="대체 텍스트"
                  value={slide.alt}
                  onChange={(v) => update(["hero", "slides", i, "alt"], v)}
                />
              </div>
            ))}
          </div>
        )}
        {tab === "program" && (
          <div className="cms-form">
            {site.programs.map((p, i) => (
              <div className="cms-card" key={i}>
                <SectionTitle number={`0${i + 1}`}>프로그램</SectionTitle>
                <Field
                  label="라벨"
                  value={p.label}
                  onChange={(v) => update(["programs", i, "label"], v)}
                />
                {p.title.map((x, j) => (
                  <Field
                    key={j}
                    label={`제목 ${j + 1}`}
                    value={x}
                    onChange={(v) => update(["programs", i, "title", j], v)}
                  />
                ))}
                <Field
                  multiline
                  label="설명"
                  value={p.description}
                  onChange={(v) => update(["programs", i, "description"], v)}
                />
                <ImageEditor
                  item={p}
                  path={["programs", i]}
                  update={update}
                  chooseMedia={chooseMedia}
                  updateFocus={updateFocus}
                />
              </div>
            ))}
          </div>
        )}
        {tab === "teacher" && (
          <div className="cms-form">
            <SectionTitle number="01">강사 소개</SectionTitle>
            <Field
              label="이름"
              value={site.teacher.name}
              onChange={(v) => update(["teacher", "name"], v)}
            />
            <Field
              label="역할"
              value={site.teacher.role}
              onChange={(v) => update(["teacher", "role"], v)}
            />
            {site.teacher.title.map((x, i) => (
              <Field
                key={i}
                label={`제목 ${i + 1}`}
                value={x}
                onChange={(v) => update(["teacher", "title", i], v)}
              />
            ))}
            <ImageEditor
              item={site.teacher}
              path={["teacher"]}
              update={update}
              chooseMedia={chooseMedia}
              updateFocus={updateFocus}
            />
          </div>
        )}
        {tab === "visit" && (
          <div className="cms-form">
            <Field
              label="주소"
              value={site.visit.address}
              onChange={(v) => update(["visit", "address"], v)}
            />
            <Field
              label="교통"
              value={site.visit.transit}
              onChange={(v) => update(["visit", "transit"], v)}
            />
            <Field
              label="전화번호"
              value={site.contact.phone}
              onChange={(v) => update(["contact", "phone"], v)}
            />
          </div>
        )}
        {tab === "theme" && (
          <div className="cms-form">
            <Field
              label="학원명"
              value={site.name}
              onChange={(v) => update(["name"], v)}
            />
            <Field
              label="워드마크"
              value={site.wordmark}
              onChange={(v) => update(["wordmark"], v)}
            />
            <Field
              label="포인트 색상"
              value={site.theme.primary}
              onChange={(v) => update(["theme", "primary"], v)}
            />
            <Field
              label="SEO 제목"
              value={site.seo.title}
              onChange={(v) => update(["seo", "title"], v)}
            />
          </div>
        )}
        {tab === "media" && (
          <MediaLibrary
            projectId={projectId}
            items={media.items}
            refresh={media.refresh}
            usedRefs={usedMediaRefs}
            canEdit={access.edit}
            selected={
              mediaTarget
                ? mediaTarget.reduce((value, key) => value?.[key], site)
                : null
            }
            onSelect={
              mediaTarget
                ? (reference) => {
                    update(mediaTarget, reference);
                    setStatus("이미지 선택 · 자동 저장 대기");
                    setMediaTarget(null);
                  }
                : undefined
            }
          />
        )}
        {tab === "versions" && (
          <div className="cms-versions">
            {versions.length === 0 ? (
              <div className="cms-empty">
                <b>아직 공개 버전이 없습니다.</b>
                <p>첫 공개 시 복구 가능한 스냅샷이 생성됩니다.</p>
              </div>
            ) : (
              versions.map((version, i) => (
                <article key={version.id}>
                  <div>
                    <small>{i === 0 ? "CURRENT PUBLISHED" : "VERSION"}</small>
                    <h3>{version.id}</h3>
                    <p>
                      {new Date(version.createdAt).toLocaleString("ko-KR")} ·{" "}
                      {version.summary}
                    </p>
                  </div>
                  <button onClick={() => restoreVersion(version)}>
                    이 버전을 초안으로 복원
                  </button>
                </article>
              ))
            )}
          </div>
        )}
        {errors.length > 0 && (
          <div className="cms-errors">
            <b>수정할 항목</b>
            {errors.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </div>
        )}
      </main>
      <section className="cms-preview">
        <div className="cms-preview-bar">
          <b>LIVE PREVIEW</b>
          <div>
            {["desktop", "tablet", "mobile"].map((x) => (
              <button
                className={device === x ? "active" : ""}
                key={x}
                onClick={() => setDevice(x)}
              >
                {x.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className={`cms-device ${device}`}>
          <div className="cms-site-scale">
            <LandingTemplate site={previewSite} />
          </div>
        </div>
      </section>
      {compareOpen && (
        <div
          className="cms-drawer-backdrop"
          onClick={() => setCompareOpen(false)}
        >
          <aside
            className="cms-compare-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <small>BEFORE PUBLISH</small>
                <h2>변경사항 {changes.length}개</h2>
              </div>
              <button onClick={() => setCompareOpen(false)}>닫기</button>
            </header>
            {changes.length === 0 ? (
              <div className="cms-empty">
                <b>공개본과 동일합니다.</b>
              </div>
            ) : (
              <div className="cms-change-list">
                {changes.map((change) => (
                  <article key={change.path}>
                    <b>{change.label}</b>
                    <div>
                      <span>공개본</span>
                      <p>{display(change.before)}</p>
                    </div>
                    <div className="after">
                      <span>초안</span>
                      <p>{display(change.after)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <footer>
              <button onClick={() => setCompareOpen(false)}>계속 편집</button>
              <button
                className="primary"
                disabled={!access.publish}
                onClick={publish}
              >
                확인하고 공개
              </button>
            </footer>
          </aside>
        </div>
      )}
      {confirmReset && (
        <ConfirmModal
          title="기본값으로 복원할까요?"
          description="현재 편집 중인 내용은 기본 콘텐츠로 교체됩니다. 공개된 버전은 변경되지 않습니다."
          onCancel={() => setConfirmReset(false)}
          onConfirm={restoreDefaults}
        />
      )}
    </div>
  );
}
