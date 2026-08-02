export const HOTSPOT_DEVICES = [
  { id: "desktop", label: "PC", width: 1440 },
  { id: "tablet", label: "태블릿", width: 768 },
  { id: "mobile", label: "모바일", width: 390 },
];

export const HOTSPOT_SIDES = [
  { id: "top", label: "위" },
  { id: "right", label: "오른쪽" },
  { id: "bottom", label: "아래" },
  { id: "left", label: "왼쪽" },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const clampHotspotCoordinate = (value) =>
  Math.round(clamp(Number(value) || 0, 5, 95) * 10) / 10;

export const clampHotspotWidth = (value) =>
  Math.round(clamp(Number(value) || 240, 180, 360) / 10) * 10;

export function defaultHotspotPosition(index = 0, count = 1, device = "desktop") {
  const safeCount = Math.max(1, count);
  const column = index % 2;
  const row = Math.floor(index / 2);
  const rows = Math.max(1, Math.ceil(safeCount / 2));
  const presets = {
    desktop: {
      x: column ? 72 : 43,
      y: clamp(34 + (row * 38) / rows, 22, 78),
      width: 280,
      side: column ? "left" : "right",
    },
    tablet: {
      x: column ? 72 : 31,
      y: clamp(31 + (row * 42) / rows, 20, 80),
      width: 240,
      side: column ? "left" : "right",
    },
    mobile: {
      x: column ? 73 : 27,
      y: clamp(27 + (row * 48) / rows, 16, 84),
      width: 220,
      side: column ? "left" : "right",
    },
  };
  return presets[device] || presets.desktop;
}

export function getHotspotPosition(item, device, index, count) {
  const fallback = defaultHotspotPosition(index, count, device);
  const value = item?.positions?.[device] || {};
  return {
    x: clampHotspotCoordinate(value.x ?? fallback.x),
    y: clampHotspotCoordinate(value.y ?? fallback.y),
    width: clampHotspotWidth(value.width ?? fallback.width),
    side: HOTSPOT_SIDES.some(({ id }) => id === value.side) ? value.side : fallback.side,
  };
}

export const createHotspotPositions = (index, count) =>
  Object.fromEntries(HOTSPOT_DEVICES.map(({ id }) => [id, defaultHotspotPosition(index, count, id)]));

function placement(position) {
  const gap = "16px";
  if (position.side === "right") return { left: `calc(100% + ${gap})`, top: "50%", transform: "translateY(-50%)" };
  if (position.side === "bottom") return { left: "50%", top: `calc(100% + ${gap})`, transform: "translateX(-50%)" };
  if (position.side === "left") return { left: `-${gap}`, top: "50%", transform: "translate(-100%, -50%)" };
  return { left: "50%", top: `-${gap}`, transform: "translate(-50%, -100%)" };
}

export function hotspotStyle(item, index, count) {
  const style = { "--hotspot-delay": `${index * 0.08}s` };
  HOTSPOT_DEVICES.forEach(({ id }) => {
    const position = getHotspotPosition(item, id, index, count);
    const popover = placement(position);
    style[`--hotspot-${id}-x`] = `${position.x}%`;
    style[`--hotspot-${id}-y`] = `${position.y}%`;
    style[`--hotspot-${id}-width`] = `${position.width}px`;
    style[`--hotspot-${id}-popover-left`] = popover.left;
    style[`--hotspot-${id}-popover-top`] = popover.top;
    style[`--hotspot-${id}-popover-transform`] = popover.transform;
  });
  return style;
}
