import type { CSSProperties } from "react";

import { readBoolean, readCssSize, readNumber, readString } from "./parser-primitives";

export type PhiMaskSource = "preset" | "asset";

export type PhiMaskPreset =
  | "circle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "star"
  | "cloud"
  | "blob";

export type PhiMaskRepeat = "no-repeat" | "repeat";

export type PhiMaskMode = "alpha" | "luminance";

export type PhiMaskConfig = {
  enabled?: boolean;
  source?: PhiMaskSource;
  preset?: PhiMaskPreset;
  assetId?: number;
  assetUrl?: string;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  rotationDeg?: number;
  position?: CSSProperties["maskPosition"];
  repeat?: PhiMaskRepeat;
  mode?: PhiMaskMode;
};

const PHI_MASK_PRESETS = new Set<PhiMaskPreset>([
  "circle",
  "ellipse",
  "triangle",
  "diamond",
  "hexagon",
  "star",
  "cloud",
  "blob",
]);

export const PHI_MASK_DEFAULT_CONFIG: PhiMaskConfig = {
  enabled: false,
  source: "preset",
  preset: "circle",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotationDeg: 0,
  position: "center",
  repeat: "no-repeat",
  mode: "alpha",
};

export const PHI_MASK_PRESET_OPTIONS: ReadonlyArray<{ value: PhiMaskPreset; label: string }> = [
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "triangle", label: "Triangle" },
  { value: "diamond", label: "Diamond" },
  { value: "hexagon", label: "Hexagon" },
  { value: "star", label: "Star" },
  { value: "cloud", label: "Cloud" },
  { value: "blob", label: "Blob" },
];

const PHI_MASK_PRESET_SVG_PATHS: Record<PhiMaskPreset, string> = {
  circle: '<circle cx="50" cy="50" r="48" fill="white"/>',
  ellipse: '<ellipse cx="50" cy="50" rx="48" ry="34" fill="white"/>',
  triangle: '<path d="M50 3 98 94H2Z" fill="white"/>',
  diamond: '<path d="M50 2 98 50 50 98 2 50Z" fill="white"/>',
  hexagon: '<path d="M25 6h50l23 44-23 44H25L2 50Z" fill="white"/>',
  star: '<path d="m50 3 12.9 30.6 33.1 2.8-25.1 21.8 7.6 32.3L50 73.8 21.5 90.5l7.6-32.3L4 36.4l33.1-2.8Z" fill="white"/>',
  cloud: '<path d="M29.5 81C15.4 81 4 70.2 4 56.8c0-12.2 9.5-22.4 21.9-24 5.5-10.8 17-17.8 29.7-17.8 16.1 0 29.6 11.1 32.1 25.7C95 44.7 100 52 100 60.5 100 71.8 90.2 81 78.1 81Z" fill="white"/>',
  blob: '<path d="M88.3 27.5c9.1 13.1 6.8 34.5-4.8 48.3-11.7 13.8-32.8 20-50.7 12.9C15 81.6.5 61.3 5.5 43.9c5-17.5 29.5-32.2 49.3-35.1 19.9-2.9 24.4 5.6 33.5 18.7Z" fill="white"/>',
};

function encodeSvgDataUrl(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22")}")`;
}

export function resolvePhiMaskPresetImage(preset: PhiMaskPreset | null | undefined) {
  const resolvedPreset = preset && PHI_MASK_PRESETS.has(preset) ? preset : PHI_MASK_DEFAULT_CONFIG.preset;
  const body = resolvedPreset ? PHI_MASK_PRESET_SVG_PATHS[resolvedPreset] : null;
  if (!body) {
    return null;
  }

  return encodeSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`);
}

function resolvePhiMaskPresetImageWithRotation(
  preset: PhiMaskPreset | null | undefined,
  rotationDeg: number,
) {
  const resolvedPreset = preset && PHI_MASK_PRESETS.has(preset) ? preset : PHI_MASK_DEFAULT_CONFIG.preset;
  const body = resolvedPreset ? PHI_MASK_PRESET_SVG_PATHS[resolvedPreset] : null;
  if (!body) {
    return null;
  }

  const transform = rotationDeg !== 0 ? ` transform="rotate(${rotationDeg} 50 50)"` : "";
  return encodeSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g${transform}>${body}</g></svg>`);
}

export function resolvePhiMaskStyle(mask: PhiMaskConfig | null | undefined): CSSProperties | undefined {
  const resolved = mergePhiMaskConfigDefaults(mask);
  if (resolved.enabled !== true) {
    return undefined;
  }

  const rotationDeg = typeof resolved.rotationDeg === "number" && Number.isFinite(resolved.rotationDeg)
    ? Math.min(180, Math.max(-180, resolved.rotationDeg))
    : 0;
  const image = resolved.source === "asset"
    ? resolved.assetUrl?.trim()
      ? `url("${resolved.assetUrl.trim().replace(/"/g, "%22")}")`
      : null
    : resolvePhiMaskPresetImageWithRotation(resolved.preset, rotationDeg);
  if (!image) {
    return undefined;
  }

  const scale = typeof resolved.scale === "number" && Number.isFinite(resolved.scale)
    ? Math.min(2, Math.max(0.25, resolved.scale))
    : 1;
  const size = `${Math.round(scale * 100)}%`;
  const offsetX = typeof resolved.offsetX === "number" && Number.isFinite(resolved.offsetX)
    ? Math.min(100, Math.max(-100, resolved.offsetX))
    : 0;
  const offsetY = typeof resolved.offsetY === "number" && Number.isFinite(resolved.offsetY)
    ? Math.min(100, Math.max(-100, resolved.offsetY))
    : 0;
  const position = `${50 + offsetX}% ${50 + offsetY}%`;
  const repeat = resolved.repeat ?? "no-repeat";
  const mode = resolved.mode ?? "alpha";

  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: size,
    WebkitMaskSize: size,
    maskPosition: position,
    WebkitMaskPosition: position,
    maskRepeat: repeat,
    WebkitMaskRepeat: repeat,
    maskMode: mode,
  } as CSSProperties;
}

function readMaskSource(value: unknown): PhiMaskSource | undefined {
  const source = readString(value);
  return source === "asset" || source === "preset" ? source : undefined;
}

function readMaskPreset(value: unknown): PhiMaskPreset | undefined {
  const preset = readString(value);
  return preset && PHI_MASK_PRESETS.has(preset as PhiMaskPreset)
    ? (preset as PhiMaskPreset)
    : undefined;
}

function readMaskRepeat(value: unknown): PhiMaskRepeat | undefined {
  const repeat = readString(value);
  return repeat === "repeat" || repeat === "no-repeat" ? repeat : undefined;
}

function readMaskMode(value: unknown): PhiMaskMode | undefined {
  const mode = readString(value);
  return mode === "luminance" || mode === "alpha" ? mode : undefined;
}

function readMaskScale(value: unknown) {
  const scale = readNumber(value);
  if (scale == null) {
    return undefined;
  }

  return Math.min(2, Math.max(0.25, scale));
}

function readMaskOffset(value: unknown) {
  const offset = readNumber(value);
  if (offset == null) {
    return undefined;
  }

  return Math.min(100, Math.max(-100, offset));
}

function readMaskRotation(value: unknown) {
  const rotation = readNumber(value);
  if (rotation == null) {
    return undefined;
  }

  return Math.min(180, Math.max(-180, rotation));
}

export function normalizePhiMaskConfig(value: unknown): PhiMaskConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const enabled = readBoolean(raw.enabled);
  const source = readMaskSource(raw.source);
  const preset = readMaskPreset(raw.preset);
  const assetId = readNumber(raw.assetId);
  const assetUrl = readString(raw.assetUrl);
  const scale = readMaskScale(raw.scale);
  const offsetX = readMaskOffset(raw.offsetX);
  const offsetY = readMaskOffset(raw.offsetY);
  const rotationDeg = readMaskRotation(raw.rotationDeg);
  const position = readCssSize(raw.position) ?? readString(raw.position);
  const repeat = readMaskRepeat(raw.repeat);
  const mode = readMaskMode(raw.mode);

  if (
    enabled == null &&
    !source &&
    !preset &&
    assetId == null &&
    !assetUrl &&
    scale == null &&
    offsetX == null &&
    offsetY == null &&
    rotationDeg == null &&
    position == null &&
    !repeat &&
    !mode
  ) {
    return undefined;
  }

  return {
    ...(enabled == null ? {} : { enabled }),
    ...(source ? { source } : {}),
    ...(preset ? { preset } : {}),
    ...(assetId == null ? {} : { assetId }),
    ...(assetUrl ? { assetUrl } : {}),
    ...(scale == null ? {} : { scale }),
    ...(offsetX == null ? {} : { offsetX }),
    ...(offsetY == null ? {} : { offsetY }),
    ...(rotationDeg == null ? {} : { rotationDeg }),
    ...(position == null ? {} : { position }),
    ...(repeat ? { repeat } : {}),
    ...(mode ? { mode } : {}),
  };
}

export function mergePhiMaskConfigDefaults(mask: PhiMaskConfig | null | undefined): PhiMaskConfig {
  return {
    ...PHI_MASK_DEFAULT_CONFIG,
    ...(mask ?? {}),
  };
}
