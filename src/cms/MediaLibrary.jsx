import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMedia,
  bytesLabel,
  deleteMedia,
  listMedia,
  MEDIA_LIMITS,
  mediaRef,
} from "./media-db.js";

export function useMediaLibrary(projectId) {
  const [items, setItems] = useState([]);
  const urls = useRef([]);
  const refresh = async () => setItems(await listMedia(projectId));
  useEffect(() => {
    refresh();
  }, [projectId]);
  const resolved = useMemo(() => {
    urls.current.forEach(URL.revokeObjectURL);
    urls.current = [];
    return Object.fromEntries(
      items.map((item) => {
        const url = URL.createObjectURL(item.display || item.original);
        urls.current.push(url);
        return [mediaRef(item.id), url];
      }),
    );
  }, [items]);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);
  return { items, resolved, refresh };
}

export function MediaLibrary({
  projectId,
  items,
  urls = {},
  refresh,
  onSelect,
  selected,
  usedRefs = new Set(),
  canEdit = true,
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const input = useRef(null);
  const used = items.reduce(
    (sum, item) => sum + item.original.size + (item.display?.size || 0),
    0,
  );
  const upload = async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    setBusy(true);
    setMessage("");
    try {
      for (const file of files) await addMedia(file, projectId);
      await refresh();
      setMessage(`${files.length}개 이미지 업로드 완료`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };
  const requestRemove = (item) => {
    if (usedRefs.has(mediaRef(item.id))) {
      setMessage(
        "페이지에서 사용 중인 이미지는 먼저 다른 이미지로 교체해 주세요.",
      );
      return;
    }
    setPendingDelete(item);
  };
  const remove = async () => {
    const item = pendingDelete;
    if (!item) return;
    await deleteMedia(item.id);
    await refresh();
    setPendingDelete(null);
  };
  return (
    <div className="media-library">
      <div className="media-summary">
        <div>
          <small>LOCAL MEDIA / INDEXEDDB</small>
          <b>
            {items.length} / {MEDIA_LIMITS.maxItems}개
          </b>
          <span>{bytesLabel(used)} / 250MB 사용</span>
        </div>
        <button
          className="primary"
          disabled={busy || !canEdit}
          onClick={() => input.current.click()}
        >
          {busy ? "처리 중…" : "이미지 업로드"}
        </button>
        <input
          ref={input}
          hidden
          multiple
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          onChange={upload}
        />
      </div>
      <p className="media-policy">
        JPG · PNG · WebP · HEIC / 파일당 15MB · 원본 보관 · HEIC는 화면 표시용
        JPEG를 함께 생성합니다.
      </p>
      {message && <p className="media-message">{message}</p>}
      {items.length === 0 ? (
        <div className="cms-empty">
          <b>업로드한 이미지가 없습니다.</b>
          <p>고객이 직접 이미지를 추가하고 페이지 영역에 배치할 수 있습니다.</p>
        </div>
      ) : (
        <div className="media-grid">
          {items.map((item) => {
            const ref = mediaRef(item.id);
            const url = urls[ref] || "";
            const used = usedRefs.has(ref);
            return (
              <article
                className={selected === ref ? "selected" : ""}
                key={item.id}
              >
                <button
                  className="media-thumb"
                  disabled={!canEdit && Boolean(onSelect)}
                  onClick={() => onSelect?.(ref)}
                >
                  <img src={url} alt="" />
                  <span>
                    {selected === ref
                      ? "선택됨"
                      : onSelect
                        ? "이 이미지 사용"
                        : "미디어"}
                  </span>
                </button>
                <div>
                  <b title={item.name}>{item.name}</b>
                  <small>
                    {item.width}×{item.height} · {bytesLabel(item.size)}
                    {item.convertedFromHeic ? " · HEIC 변환" : ""}
                    {used ? " · 사용 중" : ""}
                  </small>
                  <button
                    aria-label="이미지 삭제"
                    disabled={used || !canEdit}
                    onClick={() => requestRemove(item)}
                  >
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {pendingDelete && (
        <div className="cms-modal-backdrop">
          <section className="cms-modal" role="dialog" aria-modal="true">
            <small>DELETE MEDIA</small>
            <h2>이미지를 삭제할까요?</h2>
            <p>
              “{pendingDelete.name}”의 원본과 표시용 변환본이 이 브라우저에서
              삭제됩니다.
            </p>
            <div>
              <button onClick={() => setPendingDelete(null)}>취소</button>
              <button className="danger" onClick={remove}>
                삭제하기
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function FocusControls({ item, onChange }) {
  const focus = (kind) => item[kind] || { x: 50, y: 50 };
  return (
    <div className="focus-controls">
      <p>
        초점 위치 <span>10–90% 안전 범위</span>
      </p>
      {[
        ["focusDesktop", "PC"],
        ["focusMobile", "모바일"],
      ].map(([kind, label]) => (
        <div key={kind}>
          <b>{label}</b>
          {["x", "y"].map((axis) => (
            <label key={axis}>
              <span>{axis.toUpperCase()}</span>
              <input
                type="range"
                min="10"
                max="90"
                value={focus(kind)[axis]}
                onChange={(e) => onChange(kind, axis, Number(e.target.value))}
              />
              <output>{focus(kind)[axis]}%</output>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
