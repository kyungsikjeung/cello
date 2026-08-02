import { useEffect, useMemo, useRef, useState } from "react";
import { LandingTemplate } from "./PreviewBridge.jsx";
import { cloneSite } from "../data/default-site.js";
import { cloneRestaurantSite } from "../data/restaurant-site.js";
import { cloneFranchiseSite } from "../data/franchise-site.js";
import {
  HOTSPOT_DEVICES,
  HOTSPOT_SIDES,
  clampHotspotCoordinate,
  createHotspotPositions,
  getHotspotPosition,
} from "../data/hotspot.js";
import { validateSite } from "../data/site-schema.js";
import {
  FocusControls,
  MediaLibrary,
  useMediaLibrary,
} from "./MediaLibrary.jsx";
import { permissions, roleLabels } from "./auth.js";
import {
  compareSites,
  flatten,
  friendlyIssue,
  nextVersionId,
  resolveMedia,
  sanitizeStoredDraft,
  sanitizeStoredPublished,
  sanitizeStoredVersions,
} from "./site-utils.js";

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
const display = (value) => (value === undefined ? "—" : String(value));

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
function SceneHotspotEditor({ scene, items, previewImage, update, chooseMedia, updateFocus, canEdit }) {
  const [device, setDevice] = useState("desktop");
  const [activeIndex, setActiveIndex] = useState(0);
  const stageRef = useRef(null);
  const draggingIndex = useRef(null);
  const normalizedScene = scene || {
    image: items[0]?.image || "",
    alt: items[0]?.alt || "대표 매장 운영 구성",
    focusDesktop: items[0]?.focusDesktop || { x: 50, y: 50 },
    focusMobile: items[0]?.focusMobile || { x: 50, y: 50 },
  };
  const safeIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const activeItem = items[safeIndex];
  const position = getHotspotPosition(activeItem, device, safeIndex, items.length);

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(Math.max(0, items.length - 1));
  }, [activeIndex, items.length]);

  const updatePosition = (index, patch) => {
    const current = getHotspotPosition(items[index], device, index, items.length);
    update(["offerings", "items", index, "positions", device], { ...current, ...patch });
  };
  const updateFromPointer = (event, index) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;
    updatePosition(index, {
      x: clampHotspotCoordinate(((event.clientX - rect.left) / rect.width) * 100),
      y: clampHotspotCoordinate(((event.clientY - rect.top) / rect.height) * 100),
    });
  };
  const startDrag = (event, index) => {
    if (!canEdit) return;
    event.preventDefault();
    draggingIndex.current = index;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setActiveIndex(index);
    updateFromPointer(event, index);
  };
  const moveDrag = (event, index) => {
    if (draggingIndex.current === index) updateFromPointer(event, index);
  };
  const endDrag = (event) => {
    draggingIndex.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const addPoint = () => {
    if (!canEdit || items.length >= 12) return;
    const index = items.length;
    const image = normalizedScene.image || items[0]?.image || "";
    update(["offerings", "items"], [...items, {
      badge: "NEW POINT",
      name: "새 운영 포인트",
      description: "이 포인트에서 설명할 운영 특징을 입력하세요.",
      image,
      alt: normalizedScene.alt || "운영 포인트",
      focusDesktop: { x: 50, y: 50 },
      focusMobile: { x: 50, y: 50 },
      positions: createHotspotPositions(index, index + 1),
    }]);
    setActiveIndex(index);
  };
  const removePoint = () => {
    if (!canEdit || items.length <= 1) return;
    update(["offerings", "items"], items.filter((_, index) => index !== safeIndex));
    setActiveIndex(Math.max(0, safeIndex - 1));
  };

  return (
    <div className="cms-hotspot-editor">
      <div className="cms-card cms-hotspot-scene-source">
        <SectionTitle number="01">대표 이미지</SectionTitle>
        <Field label="이미지" value={normalizedScene.image} onChange={(value) => update(["offerings", "scene", "image"], value)} />
        <button className="cms-media-pick" type="button" onClick={() => chooseMedia(["offerings", "scene", "image"])}>대표 이미지 선택</button>
        <Field label="대체 설명" value={normalizedScene.alt} onChange={(value) => update(["offerings", "scene", "alt"], value)} />
        <FocusControls item={normalizedScene} onChange={(kind, axis, value) => updateFocus(["offerings", "scene"], normalizedScene, kind, axis, value)} />
      </div>

      <div className="cms-hotspot-workspace">
        <header>
          <div><small>RESPONSIVE POSITION</small><b>화면별 포인트 배치</b></div>
          <div className="cms-hotspot-devices" role="group" aria-label="편집 화면 크기">
            {HOTSPOT_DEVICES.map((option) => (
              <button key={option.id} type="button" className={device === option.id ? "active" : ""} onClick={() => setDevice(option.id)}>{option.label}<small>{option.width}</small></button>
            ))}
          </div>
        </header>
        <p className="cms-hotspot-help">포인트를 이미지 위에서 드래그하세요. 위치는 현재 선택한 화면 크기에만 저장됩니다.</p>
        <div className={`cms-hotspot-stage is-${device}`} ref={stageRef}>
          {previewImage
            ? <img src={previewImage} alt={normalizedScene.alt} style={{ objectPosition: device === "mobile" ? `${normalizedScene.focusMobile?.x ?? 50}% ${normalizedScene.focusMobile?.y ?? 50}%` : `${normalizedScene.focusDesktop?.x ?? 50}% ${normalizedScene.focusDesktop?.y ?? 50}%` }} />
            : <div className="cms-hotspot-placeholder">대표 이미지를 선택하세요.</div>}
          {items.map((item, index) => {
            const point = getHotspotPosition(item, device, index, items.length);
            return (
              <button
                key={`${item.name}-${index}`}
                className={`cms-hotspot-marker ${safeIndex === index ? "active" : ""}`}
                type="button"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={() => setActiveIndex(index)}
                onPointerDown={(event) => startDrag(event, index)}
                onPointerMove={(event) => moveDrag(event, index)}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                aria-label={`${item.name} 위치 이동`}
              ><span>+</span><b>{index + 1}</b></button>
            );
          })}
        </div>

        <div className="cms-hotspot-point-tabs" role="tablist" aria-label="설명 포인트">
          {items.map((item, index) => <button key={`${item.name}-tab-${index}`} type="button" className={safeIndex === index ? "active" : ""} onClick={() => setActiveIndex(index)}><small>{String(index + 1).padStart(2, "0")}</small>{item.name}</button>)}
          <button type="button" className="add" onClick={addPoint} disabled={!canEdit || items.length >= 12}>+ 포인트 추가</button>
        </div>

        {activeItem && (
          <div className="cms-card cms-hotspot-point-form">
            <SectionTitle number={String(safeIndex + 1).padStart(2, "0")}>설명 포인트</SectionTitle>
            <Field label="짧은 분류" value={activeItem.badge} onChange={(value) => update(["offerings", "items", safeIndex, "badge"], value)} />
            <Field label="제목" value={activeItem.name} onChange={(value) => update(["offerings", "items", safeIndex, "name"], value)} />
            <Field multiline label="설명" value={activeItem.description} onChange={(value) => update(["offerings", "items", safeIndex, "description"], value)} />
            <div className="cms-hotspot-sliders">
              <label><span>가로 좌표 <output>{position.x}%</output></span><input type="range" min="5" max="95" step="0.5" value={position.x} disabled={!canEdit} onChange={(event) => updatePosition(safeIndex, { x: Number(event.target.value) })} /></label>
              <label><span>세로 좌표 <output>{position.y}%</output></span><input type="range" min="5" max="95" step="0.5" value={position.y} disabled={!canEdit} onChange={(event) => updatePosition(safeIndex, { y: Number(event.target.value) })} /></label>
              <label><span>설명창 폭 <output>{position.width}px</output></span><input type="range" min="180" max="360" step="10" value={position.width} disabled={!canEdit} onChange={(event) => updatePosition(safeIndex, { width: Number(event.target.value) })} /></label>
              <label className="cms-hotspot-side"><span>설명창 방향</span><select value={position.side} disabled={!canEdit} onChange={(event) => updatePosition(safeIndex, { side: event.target.value })}>{HOTSPOT_SIDES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
            </div>
            <button className="cms-media-pick danger" type="button" onClick={removePoint} disabled={!canEdit || items.length <= 1}>이 포인트 삭제</button>
          </div>
        )}
      </div>
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
  const restored = useMemo(
    () => sanitizeStoredDraft(read(keys.draft, null), cloneSite()),
    [keys.draft],
  );
  const [site, setSite] = useState(restored.site),
    [published, setPublished] = useState(() =>
      sanitizeStoredPublished(read(keys.published, null)),
    ),
    [versions, setVersions] = useState(() =>
      sanitizeStoredVersions(read(keys.versions, [])),
    );
  const [tab, setTab] = useState("hero"),
    [device, setDevice] = useState("desktop"),
    [dirty, setDirty] = useState(false),
    [status, setStatus] = useState(
      restored.recovered
        ? "저장된 초안이 손상되어 기본값으로 대체했습니다. 저장 전 내용을 확인하세요."
        : localStorage.getItem(keys.draft)
          ? "저장된 초안 불러옴"
          : "새 초안",
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
      path.slice(0, -1).forEach((key, index) => {
        if (target[key] == null) {
          target[key] = typeof path[index + 1] === "number" ? [] : {};
        }
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
      localStorage.setItem(keys.draft, JSON.stringify(result.data));
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
    setSite(result.data);
    localStorage.setItem(keys.draft, JSON.stringify(result.data));
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
    const clean = result.data;
    const snapshot = {
      id: nextVersionId(versions),
      createdAt: new Date().toISOString(),
      summary: `${changes.length}개 항목 변경`,
      site: cloneSite(clean),
    };
    const nextVersions = [snapshot, ...versions].slice(0, 20);
    setSite(clean);
    localStorage.setItem(keys.draft, JSON.stringify(clean));
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
    const next = site.category === "franchise"
      ? cloneFranchiseSite()
      : site.category === "restaurant"
        ? cloneRestaurantSite()
        : cloneSite();
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
      setSite(result.data);
      setDirty(true);
      setErrors([]);
      setStatus("JSON 불러옴 · 자동 저장 대기");
    } catch (error) {
      setErrors([`가져오기 실패: ${error.message}`]);
    }
    event.target.value = "";
  };
  const isFranchise = site.category === "franchise";
  const isRestaurant = site.category === "restaurant";
  const isLesson = site.category === "lesson";
  const isBusiness = isFranchise || isRestaurant;
  const lessonTabs = [
    ["hero", "첫 화면"],
    ["program", "프로그램"],
    ["teacher", "강사"],
    ["visit", "위치"],
    ["theme", "디자인"],
    ["media", "미디어"],
    ["versions", "버전"],
  ];
  const franchiseTabs = [
    ["hero", "첫 화면"],
    ["franchise", "브랜드 경쟁력"],
    ["offerings", "운영 기반"],
    ["locations", "지점 안내"],
    ["hours", "상담 운영"],
    ["gallery", "매장 사진"],
    ["inquiry", "가맹 문의"],
    ["theme", "디자인"],
    ["media", "미디어"],
    ["versions", "버전"],
  ];
  const restaurantTabs = [
    ["hero", "첫 화면"],
    ["franchise", "브랜드 소개"],
    ["menu", "메뉴"],
    ["hours", "예약 운영"],
    ["gallery", "공간"],
    ["visit", "위치"],
    ["inquiry", "예약 문의"],
    ["theme", "디자인"],
    ["media", "미디어"],
    ["versions", "버전"],
  ];
  const tabs = isFranchise ? franchiseTabs : isRestaurant ? restaurantTabs : lessonTabs;
  const selectTemplate = (category) => {
    if (!access.edit || category === site.category) return;
    const next = category === "franchise"
      ? cloneFranchiseSite()
      : category === "restaurant"
        ? cloneRestaurantSite()
        : cloneSite();
    setSite(next);
    setTab("hero");
    setDirty(true);
    setErrors([]);
    setStatus("템플릿 변경 · 저장 전 미리보기를 확인하세요.");
  };
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
        <div className="cms-template-switch" aria-label="템플릿 선택">
          <small>TEMPLATE</small>
          <button className={isLesson ? "active" : ""} disabled={!access.edit} onClick={() => selectTemplate("lesson")}>학원 02B</button>
          <button className={isRestaurant ? "active" : ""} disabled={!access.edit} onClick={() => selectTemplate("restaurant")}>레스토랑 Editorial</button>
          <button className={isFranchise ? "active" : ""} disabled={!access.edit} onClick={() => selectTemplate("franchise")}>프랜차이즈 Brand</button>
        </div>
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
        {tab === "hero" && isLesson && (
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
                  label="라벨"
                  value={slide.label}
                  onChange={(v) => update(["hero", "slides", i, "label"], v)}
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
        {tab === "hero" && isBusiness && (
          <div className="cms-form">
            <SectionTitle number="01">가맹 모집 첫 화면</SectionTitle>
            <Field label="작은 라벨" value={site.hero.kicker} onChange={(v) => update(["hero", "kicker"], v)} />
            {site.hero.title.map((x, i) => <Field key={i} label={`제목 ${i + 1}`} value={x} onChange={(v) => update(["hero", "title", i], v)} />)}
            {site.hero.description.map((x, i) => <Field key={i} label={`설명 ${i + 1}`} value={x} onChange={(v) => update(["hero", "description", i], v)} />)}
            <Field label="카카오톡 문의 CTA" value={site.hero.cta} onChange={(v) => update(["hero", "cta"], v)} />
            <Field label="보조 CTA" value={site.hero.secondaryCta} onChange={(v) => update(["hero", "secondaryCta"], v)} />
            <SectionTitle number="02">Hero 미디어</SectionTitle>
            <label className="cms-field"><span>미디어 유형</span><select value={site.hero.media.kind} onChange={(e) => update(["hero", "media", "kind"], e.target.value)}><option value="image">이미지</option><option value="video">짧은 MP4 영상</option></select></label>
            <Field label={site.hero.media.kind === "video" ? "MP4 파일" : "대표 이미지"} value={site.hero.media.src} onChange={(v) => update(["hero", "media", "src"], v)} />
            <button className="cms-media-pick" onClick={() => chooseMedia(["hero", "media", "src"])}>미디어 보관함에서 선택</button>
            {site.hero.media.kind === "video" && <><Field label="Poster 이미지" value={site.hero.media.poster} onChange={(v) => update(["hero", "media", "poster"], v)} /><button className="cms-media-pick" onClick={() => chooseMedia(["hero", "media", "poster"])}>Poster 선택</button><Field label="모바일 대체 이미지" value={site.hero.media.mobileFallback} onChange={(v) => update(["hero", "media", "mobileFallback"], v)} /><button className="cms-media-pick" onClick={() => chooseMedia(["hero", "media", "mobileFallback"])}>모바일 이미지 선택</button></>}
            <Field multiline label="대체 설명" value={site.hero.media.alt} onChange={(v) => update(["hero", "media", "alt"], v)} />
            <FocusControls item={site.hero.media} onChange={(kind, axis, value) => updateFocus(["hero", "media"], site.hero.media, kind, axis, value)} />
          </div>
        )}
        {tab === "franchise" && isBusiness && (
          <div className="cms-form">
            <SectionTitle number="01">브랜드 경쟁력</SectionTitle>
            <Field label="섹션 제목" value={site.franchise.title} onChange={(v) => update(["franchise", "title"], v)} />
            <Field multiline label="섹션 설명" value={site.franchise.description} onChange={(v) => update(["franchise", "description"], v)} />
            {site.franchise.advantages.map((item, i) => (
              <div className="cms-card" key={i}>
                <Field label="짧은 지표" value={item.metric} onChange={(v) => update(["franchise", "advantages", i, "metric"], v)} />
                <Field label="경쟁력 제목" value={item.title} onChange={(v) => update(["franchise", "advantages", i, "title"], v)} />
                <Field multiline label="설명" value={item.description} onChange={(v) => update(["franchise", "advantages", i, "description"], v)} />
              </div>
            ))}
            <SectionTitle number="02">가맹 절차</SectionTitle>
            {site.franchise.steps.map((step, i) => (
              <div className="cms-card" key={i}>
                <Field label={`단계 ${i + 1}`} value={step.title} onChange={(v) => update(["franchise", "steps", i, "title"], v)} />
                <Field multiline label="설명" value={step.description} onChange={(v) => update(["franchise", "steps", i, "description"], v)} />
              </div>
            ))}
          </div>
        )}
        {tab === "program" && isLesson && (
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
        {tab === "teacher" && isLesson && (
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
        {tab === "offerings" && isFranchise && (
          <div className="cms-form">
            <SectionTitle number="01">운영 기반</SectionTitle>
            <Field label="섹션 제목" value={site.offerings.title} onChange={(v) => update(["offerings", "title"], v)} />
            <Field multiline label="섹션 설명" value={site.offerings.description} onChange={(v) => update(["offerings", "description"], v)} />
            <SceneHotspotEditor
              scene={site.offerings.scene}
              items={site.offerings.items}
              previewImage={previewSite.offerings?.scene?.image || previewSite.offerings?.items?.[0]?.image}
              update={update}
              chooseMedia={chooseMedia}
              updateFocus={updateFocus}
              canEdit={access.edit}
            />
          </div>
        )}
        {tab === "menu" && isRestaurant && (
          <div className="cms-form">
            <SectionTitle number="01">대표 메뉴</SectionTitle>
            <Field label="섹션 제목" value={site.menu.title} onChange={(v) => update(["menu", "title"], v)} />
            <Field multiline label="섹션 설명" value={site.menu.description} onChange={(v) => update(["menu", "description"], v)} />
            {site.menu.items.map((item, i) => (
              <div className="cms-card" key={`${item.name}-${i}`}>
                <Field label="메뉴명" value={item.name} onChange={(v) => update(["menu", "items", i, "name"], v)} />
                <Field multiline label="설명" value={item.description} onChange={(v) => update(["menu", "items", i, "description"], v)} />
                <Field type="number" label="가격(원)" value={item.price} onChange={(v) => update(["menu", "items", i, "price"], v)} />
                <Field label="이미지" value={item.image} onChange={(v) => update(["menu", "items", i, "image"], v)} />
                <button className="cms-media-pick" onClick={() => chooseMedia(["menu", "items", i, "image"])}>이미지 선택</button>
                <Field label="대체 설명" value={item.alt} onChange={(v) => update(["menu", "items", i, "alt"], v)} />
                <FocusControls item={item} onChange={(kind, axis, value) => updateFocus(["menu", "items", i], item, kind, axis, value)} />
              </div>
            ))}
          </div>
        )}
        {tab === "locations" && isFranchise && (
          <div className="cms-form">
            <SectionTitle number="01">지점 안내</SectionTitle>
            <Field label="섹션 제목" value={site.locations.title} onChange={(v) => update(["locations", "title"], v)} />
            <Field multiline label="섹션 설명" value={site.locations.description} onChange={(v) => update(["locations", "description"], v)} />
            {site.locations.items.map((item, i) => (
              <div className="cms-card" key={`${item.name}-${i}`}>
                <SectionTitle number={String(i + 1).padStart(2, "0")}>지점</SectionTitle>
                <Field label="지점명" value={item.name} onChange={(v) => update(["locations", "items", i, "name"], v)} />
                <Field label="운영 상태" value={item.status} onChange={(v) => update(["locations", "items", i, "status"], v)} />
                <Field label="주소" value={item.address} onChange={(v) => update(["locations", "items", i, "address"], v)} />
                <Field label="운영시간" value={item.hours} onChange={(v) => update(["locations", "items", i, "hours"], v)} />
                <Field label="지점 사진" value={item.image} onChange={(v) => update(["locations", "items", i, "image"], v)} />
                <button className="cms-media-pick" onClick={() => chooseMedia(["locations", "items", i, "image"])}>지점 사진 선택</button>
                <Field label="대체 설명" value={item.alt} onChange={(v) => update(["locations", "items", i, "alt"], v)} />
                <FocusControls item={item} onChange={(kind, axis, value) => updateFocus(["locations", "items", i], item, kind, axis, value)} />
                <button
                  className="cms-media-pick"
                  disabled={site.locations.items.length <= 1}
                  onClick={() => update(["locations", "items"], site.locations.items.filter((_, index) => index !== i))}
                >지점 삭제</button>
              </div>
            ))}
            <button
              className="cms-media-pick"
              disabled={site.locations.items.length >= 30}
              onClick={() => update(["locations", "items"], [...site.locations.items, {
                name: "새 지점",
                status: "오픈 예정",
                address: "주소를 입력하세요",
                hours: "운영시간을 입력하세요",
                image: site.hero.media.mobileFallback || site.hero.media.poster || site.hero.media.src,
                alt: "새 지점 사진",
                focusDesktop: { x: 50, y: 50 },
                focusMobile: { x: 50, y: 50 },
              }])}
            >+ 지점 추가</button>
          </div>
        )}
        {tab === "hours" && isBusiness && <div className="cms-form"><Field label="상태" value={site.service.statusLabel} onChange={(v) => update(["service", "statusLabel"], v)} /><Field label="운영 시간" value={site.service.todayHours} onChange={(v) => update(["service", "todayHours"], v)} /><Field label="안내 1" value={site.service.breakTime} onChange={(v) => update(["service", "breakTime"], v)} /><Field label="안내 2" value={site.service.lastOrder} onChange={(v) => update(["service", "lastOrder"], v)} /></div>}
        {tab === "gallery" && isBusiness && (
          <div className="cms-form">
            <SectionTitle number="01">공간 이미지 · 최소 3장</SectionTitle>
            <Field label="섹션 제목" value={site.gallery.title} onChange={(v) => update(["gallery", "title"], v)} />
            {site.gallery.images.map((item, i) => (
              <div className="cms-card" key={i}>
                <Field label={`이미지 ${i + 1}`} value={item.image} onChange={(v) => update(["gallery", "images", i, "image"], v)} />
                <button className="cms-media-pick" onClick={() => chooseMedia(["gallery", "images", i, "image"])}>이미지 선택</button>
                <Field label="대체 설명" value={item.alt} onChange={(v) => update(["gallery", "images", i, "alt"], v)} />
                <FocusControls item={item} onChange={(kind, axis, value) => updateFocus(["gallery", "images", i], item, kind, axis, value)} />
              </div>
            ))}
          </div>
        )}
        {tab === "visit" && isLesson && (
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
        {tab === "visit" && isRestaurant && (
          <div className="cms-form">
            <SectionTitle number="01">매장 위치</SectionTitle>
            <Field label="주소" value={site.visit.address} onChange={(v) => update(["visit", "address"], v)} />
            <Field label="교통" value={site.visit.transit} onChange={(v) => update(["visit", "transit"], v)} />
            <Field label="주차 안내" value={site.visit.parking} onChange={(v) => update(["visit", "parking"], v)} />
            <Field label="지도 URL" value={site.visit.mapUrl} onChange={(v) => update(["visit", "mapUrl"], v)} />
          </div>
        )}
        {tab === "inquiry" && isBusiness && <div className="cms-form"><Field label="작은 라벨" value={site.inquiry.label} onChange={(v) => update(["inquiry", "label"], v)} />{site.inquiry.title.map((line, i) => <Field key={i} label={`문의 제목 ${i + 1}`} value={line} onChange={(v) => update(["inquiry", "title", i], v)} />)}<Field multiline label="문의 안내" value={site.inquiry.description} onChange={(v) => update(["inquiry", "description"], v)} /><Field label="카카오톡 채널 URL" value={site.inquiry.kakaoUrl} onChange={(v) => update(["inquiry", "kakaoUrl"], v)} /><Field label="전화번호" value={site.inquiry.phone} onChange={(v) => update(["inquiry", "phone"], v)} /></div>}
        {tab === "theme" && (
          <div className="cms-form">
            <Field
              label={isBusiness ? "브랜드명" : "학원명"}
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
            urls={media.resolved}
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
