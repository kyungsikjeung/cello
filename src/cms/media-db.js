export const MEDIA_LIMITS = {
  projectBytes: 250 * 1024 * 1024,
  fileBytes: 15 * 1024 * 1024,
  maxItems: 100,
};

const DB_NAME = "landing-cms-media";
const STORE = "assets";

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("projectId", "projectId");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export async function listMedia(projectId) {
  const db = await openDb();
  const transaction = db.transaction(STORE, "readonly");
  const items = await requestResult(
    transaction.objectStore(STORE).index("projectId").getAll(projectId),
  );
  db.close();
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteMedia(id) {
  const db = await openDb();
  const transaction = db.transaction(STORE, "readwrite");
  transaction.objectStore(STORE).delete(id);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

const dimensions = (blob) =>
  new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });

export async function addMedia(file, projectId) {
  const current = await listMedia(projectId);
  if (current.length >= MEDIA_LIMITS.maxItems)
    throw new Error("프로젝트당 최대 100개까지 업로드할 수 있습니다.");
  if (file.size > MEDIA_LIMITS.fileBytes)
    throw new Error("파일 하나는 15MB 이하여야 합니다.");
  const used = current.reduce(
    (sum, item) => sum + item.original.size + (item.display?.size || 0),
    0,
  );
  if (used + file.size > MEDIA_LIMITS.projectBytes)
    throw new Error("프로젝트 저장 한도 250MB를 초과합니다.");
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    if (estimate.quota && estimate.usage + file.size > estimate.quota * 0.9)
      throw new Error("이 기기의 브라우저 저장공간이 부족합니다.");
  }

  const heic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  let display = file;
  if (heic) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.88,
    });
    display = Array.isArray(converted) ? converted[0] : converted;
  }
  if (used + file.size + (heic ? display.size : 0) > MEDIA_LIMITS.projectBytes)
    throw new Error(
      "HEIC 변환본을 포함하면 프로젝트 저장 한도 250MB를 초과합니다.",
    );
  const { width, height } = await dimensions(display);
  if (!width || !height) throw new Error("이미지를 읽을 수 없습니다.");
  const item = {
    id: crypto.randomUUID(),
    projectId,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    createdAt: new Date().toISOString(),
    width,
    height,
    original: file,
    display: heic ? display : null,
    convertedFromHeic: heic,
  };
  const db = await openDb();
  const transaction = db.transaction(STORE, "readwrite");
  transaction.objectStore(STORE).put(item);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return item;
}

export const mediaRef = (id) => `media:${id}`;
export const bytesLabel = (bytes) =>
  `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)}MB`;
