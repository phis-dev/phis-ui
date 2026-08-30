import type { CSSProperties } from "react";

import type { PhiMediaImageSourceConfig } from "../../../types/media";
import { buildPhiMediaAssetContentDeliveryUrl } from "../../../constants/media";
import {
  resolvePhiImagePresentation,
  type PhiImageDeliveryProjection,
} from "../../media/image-presentation";
import { readPhiMediaImageSourceConfig } from "./image-source-parser";
import { readBoolean, readNumber, readString } from "./parser-primitives";
import {
  isPhiLayoutEffectId,
  type PhiLayoutEffectId,
} from "../../../types/layout-style";
import { composePhiLayoutEffectStyle, resolvePhiLayoutEffectStyle } from "../../../helpers/layout-style";
import {
  PHI_DEFAULT_BACKGROUND_PATTERN_KEY,
  isPhiBackgroundPatternKey,
  type PhiBackgroundNoiseGrain,
  type PhiBackgroundPatternKey,
  type PhiBackgroundPatternValues,
} from "./background-pattern-contract";
import {
  resolvePhiBackgroundNoiseLiveLayer,
  resolvePhiBackgroundPatternLiveLayer,
} from "./background-pattern-live";

export type { PhiBackgroundNoiseGrain } from "./background-pattern-contract";

export type PhiBackgroundDirection = "to right" | "to left" | "to bottom" | "to top" | `${number}deg`;

export type PhiBackgroundGradientStop = {
  color: string;
  percent: number;
};

export type PhiBackgroundBaseColor = {
  kind: "color";
  color: string;
};

export type PhiBackgroundBaseNone = {
  kind: "none";
};

export type PhiBackgroundBaseGradient = {
  kind: "gradient";
  direction: PhiBackgroundDirection;
  stops: PhiBackgroundGradientStop[];
};

export type PhiBackgroundBaseImage = {
  kind: "image";
} & PhiMediaImageSourceConfig & {
    focalRect?: unknown;
    /**
     * Render-time projection of the bound Asset, never authoring intent. Normalization folds its
     * focal rectangle into `focalRect`, so every consumer reads one field.
     */
    resolvedAsset?: PhiImageDeliveryProjection | null;
    position?: string;
    size?: string;
    repeat?: string;
  };

export type PhiBackgroundMotionMode = "static" | "fixed" | "parallax";
export type PhiBackgroundMotionDirection = "natural" | "reverse";
/**
 * What `strength` measures, and therefore how the effect ends.
 *
 * `rate` is a speed: pixels of layer travel per pixel of progress, cut off once the original runs out of
 * surplus material. `range` is a proportion: the whole progress the effect is live for is laid onto the
 * surplus that exists, so it never dead-ends and never depends on how far the reader still has to go.
 */
export type PhiBackgroundMotionTravel = "rate" | "range";

export type PhiBackgroundMotion = {
  mode: PhiBackgroundMotionMode;
  strength?: number;
  direction?: PhiBackgroundMotionDirection;
  travel?: PhiBackgroundMotionTravel;
};

export type PhiBackgroundPatternOverlay = {
  kind: "pattern";
  patternKey: PhiBackgroundPatternKey;
  opacity?: number;
  values: PhiBackgroundPatternValues;
};

export type PhiBackgroundNoiseOverlay = {
  kind: "noise";
  opacity?: number;
  grain: PhiBackgroundNoiseGrain;
};

export type PhiBackgroundOverlay = PhiBackgroundPatternOverlay | PhiBackgroundNoiseOverlay;

export type PhiCmsBackgroundWidgetConfig = {
  base: PhiBackgroundBaseColor | PhiBackgroundBaseGradient | PhiBackgroundBaseImage | PhiBackgroundBaseNone;
  overlay?: PhiBackgroundOverlay | null;
  effect?: PhiLayoutEffectId | null;
  motion?: PhiBackgroundMotion | null;
};

export const PHI_BACKGROUND_PARALLAX_DEFAULT_STRENGTH = 0.2;
/**
 * Under `range`, `strength` is the share of the available surplus the effect spends rather than a speed,
 * so the rate default would read as almost no motion at all. Fitted travel means the whole of it.
 */
export const PHI_BACKGROUND_PARALLAX_DEFAULT_RANGE_STRENGTH = 1;

export function resolvePhiBackgroundParallaxDefaultStrength(travel: PhiBackgroundMotionTravel | undefined) {
  return travel === "range" ? PHI_BACKGROUND_PARALLAX_DEFAULT_RANGE_STRENGTH : PHI_BACKGROUND_PARALLAX_DEFAULT_STRENGTH;
}

function readBackgroundResolvedAsset(value: unknown): PhiImageDeliveryProjection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  return {
    deliveryUrl: readString(raw.deliveryUrl) ?? null,
    deliveryRevision: readNumber(raw.deliveryRevision) ?? null,
    variantVersion: readNumber(raw.variantVersion) ?? null,
    focalRect: raw.focalRect ?? null,
    width: readNumber(raw.width) ?? null,
    height: readNumber(raw.height) ?? null,
  };
}

function readBackgroundDirection(value: unknown): PhiBackgroundDirection {
  const direction = readString(value);
  if (direction === "to right" || direction === "to left" || direction === "to bottom" || direction === "to top") {
    return direction;
  }
  return direction && /^-?\d+(\.\d+)?deg$/.test(direction) ? (direction as PhiBackgroundDirection) : "to right";
}

function readBackgroundStops(value: unknown): PhiBackgroundGradientStop[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const stops = value
    .map((stop): PhiBackgroundGradientStop | null => {
      if (!stop || typeof stop !== "object" || Array.isArray(stop)) {
        return null;
      }
      const raw = stop as Record<string, unknown>;
      const color = readString(raw.color);
      const percent = readNumber(raw.percent);
      return color && percent !== undefined ? { color, percent } : null;
    })
    .filter((stop): stop is PhiBackgroundGradientStop => stop !== null);

  return stops.length > 0 ? stops : undefined;
}

function splitPhiBackgroundGradientStops(input: string) {
  const stops: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of input) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      stops.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) stops.push(current.trim());
  return stops;
}

function parsePhiBackgroundGradientCss(background: string): PhiBackgroundBaseGradient | null {
  if (!background.startsWith("linear-gradient(") || !background.endsWith(")")) {
    return null;
  }

  const parts = splitPhiBackgroundGradientStops(background.slice("linear-gradient(".length, -1));
  if (parts.length < 2) return null;
  const stops = parts.slice(1).map((part) => {
    const match = part.match(/(.+)\s+(\d+)%$/);
    return match ? { color: match[1].trim(), percent: Number(match[2]) } : null;
  });
  if (stops.some((stop) => !stop)) return null;
  return {
    kind: "gradient",
    direction: readBackgroundDirection(parts[0]),
    stops: stops as PhiBackgroundGradientStop[],
  };
}

function parsePhiBackgroundImageCss(background: string): PhiBackgroundBaseImage | null {
  if (!background.startsWith("url(")) return null;
  const match = background.match(/^url\((["']?)(.*?)\1\)/);
  return match?.[2] ? { kind: "image", sourceKind: "url", sourceUrl: match[2] } : null;
}

function normalizePhiBackgroundBase(value: unknown): PhiCmsBackgroundWidgetConfig["base"] | null {
  if (typeof value === "string") {
    return parsePhiBackgroundGradientCss(value) ??
      parsePhiBackgroundImageCss(value) ?? { kind: "color", color: value };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const kind = readString(raw.kind);
  if (kind === "gradient") {
    return {
      kind,
      direction: readBackgroundDirection(raw.direction ?? raw.backgroundDirection),
      stops: readBackgroundStops(raw.stops) ?? readBackgroundStops(raw.colors) ?? [
        { color: readString(raw.from) ?? "#ffffff", percent: 0 },
        { color: readString(raw.to) ?? "#000000", percent: 100 },
      ],
    };
  }
  if (kind === "image") {
    const source = readPhiMediaImageSourceConfig(raw);
    const resolvedAsset = readBackgroundResolvedAsset(raw.resolvedAsset);
    const normalized = {
      kind: "image" as const,
      trusted: readBoolean(raw.trusted) ?? false,
      alt: readString(raw.alt),
      blurDataUrl: readString(raw.blurDataUrl),
      // The projection wins; the raw value stays readable for content persisted before it existed.
      focalRect: resolvedAsset?.focalRect ?? raw.focalRect,
      resolvedAsset,
      position: readString(raw.position),
      size: readString(raw.size),
      repeat: readString(raw.repeat),
    };
    return source.sourceKind === "asset"
      ? { ...normalized, ...source }
      : { ...normalized, ...source };
  }
  if (kind === "none") return { kind };
  if (kind === "color") return { kind, color: readString(raw.color) ?? "#ffffff" };

  const background = readString(raw.background);
  if (background) {
    if (background === "none" || background === "transparent") return { kind: "none" };
    return parsePhiBackgroundGradientCss(background) ??
      parsePhiBackgroundImageCss(background) ?? { kind: "color", color: background };
  }
  const color = readString(raw.color);
  return color ? { kind: "color", color } : null;
}

function readBackgroundOverlay(value: unknown): PhiBackgroundOverlay | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const kind = readString(raw.kind);
  if (kind === "noise") {
    const grain = readString(raw.grain);
    return {
      kind,
      opacity: readNumber(raw.opacity),
      grain: grain === "medium" || grain === "coarse" ? grain : "fine",
    };
  }
  if (kind !== "pattern") return null;

  const patternKey = isPhiBackgroundPatternKey(raw.patternKey)
    ? raw.patternKey
    : PHI_DEFAULT_BACKGROUND_PATTERN_KEY;
  const rawValues = raw.values && typeof raw.values === "object" && !Array.isArray(raw.values)
    ? raw.values as Record<string, unknown>
    : {};
  const values = Object.fromEntries(
    Object.entries(rawValues).filter((entry): entry is [string, string | number | boolean] => {
      const fieldValue = entry[1];
      return typeof fieldValue === "string" || typeof fieldValue === "boolean" || (
        typeof fieldValue === "number" && Number.isFinite(fieldValue)
      );
    }),
  );
  return {
    kind,
    patternKey,
    opacity: readNumber(raw.opacity),
    values,
  };
}

function readBackgroundMotion(value: unknown): PhiBackgroundMotion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const mode = readString(raw.mode);
  if (mode !== "fixed" && mode !== "parallax" && mode !== "static") return null;
  const strength = readNumber(raw.strength);
  const direction = readString(raw.direction);
  const travel = readString(raw.travel);
  // `rate` is what every Background authored before this field existed means.
  const resolvedTravel: PhiBackgroundMotionTravel = travel === "range" ? "range" : "rate";
  return {
    mode,
    ...(mode === "parallax"
      ? {
          strength: Math.max(
            0,
            Math.min(1, strength ?? resolvePhiBackgroundParallaxDefaultStrength(resolvedTravel)),
          ),
          direction: direction === "reverse" ? "reverse" : "natural",
          travel: resolvedTravel,
        }
      : {}),
  };
}

export function normalizePhiBackgroundWidgetConfig(config: unknown): PhiCmsBackgroundWidgetConfig {
  if (typeof config === "string") {
    return {
      base: parsePhiBackgroundGradientCss(config) ??
        parsePhiBackgroundImageCss(config) ?? { kind: "color", color: config },
      overlay: null,
      effect: null,
      motion: null,
    };
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { base: { kind: "none" }, overlay: null, effect: null, motion: null };
  }

  const raw = config as Record<string, unknown>;
  const base = normalizePhiBackgroundBase(raw.base) ?? normalizePhiBackgroundBase(raw) ?? { kind: "none" as const };
  return {
    base,
    overlay: readBackgroundOverlay(raw.overlay),
    effect: isPhiLayoutEffectId(raw.effect) ? raw.effect : null,
    motion: base.kind === "image" ? readBackgroundMotion(raw.motion) : null,
  };
}

export function serializePhiBackgroundBaseCss(base: PhiCmsBackgroundWidgetConfig["base"]) {
  if (base.kind === "none") return "none";
  if (base.kind === "color") return base.color;
  if (base.kind === "gradient") {
    return `linear-gradient(${base.direction}, ${base.stops.map((stop) => `${stop.color} ${stop.percent}%`).join(", ")})`;
  }
  const presentation = resolvePhiBackgroundImagePresentation(base);
  return presentation.url
    ? `url("${presentation.url}") ${presentation.objectPosition} / ${base.size ?? "cover"} ${base.repeat ?? "no-repeat"}`
    : "none";
}

function resolvePhiBackgroundImagePresentation(base: PhiBackgroundBaseImage) {
  const asset = base.resolvedAsset ?? null;
  return resolvePhiImagePresentation({
    sourceKind: base.sourceKind,
    assetId: base.sourceKind === "asset" ? base.assetId ?? null : null,
    variantKey: base.sourceKind === "asset" ? base.variantKey : null,
    variantVersion:
      asset?.variantVersion ?? (base.sourceKind === "asset" ? base.variantVersion : null),
    deliveryRevision: asset?.deliveryRevision,
    originalUrl:
      base.sourceKind === "asset" && base.assetId != null
        ? asset?.deliveryUrl?.trim() || buildPhiMediaAssetContentDeliveryUrl(base.assetId)
        : null,
    sourceUrl: base.sourceKind === "asset" ? null : base.sourceUrl,
    focalRect: base.focalRect,
    objectPosition: base.position,
    sourceWidth: asset?.width,
    sourceHeight: asset?.height,
  });
}

function resolvePhiBackgroundOverlayLayer(overlay: PhiBackgroundOverlay | null | undefined) {
  if (!overlay) return null;
  const opacity = Math.max(0, Math.min(1, overlay.opacity ?? 0.14));
  if (overlay.kind === "noise") return resolvePhiBackgroundNoiseLiveLayer(overlay.grain, opacity);
  return resolvePhiBackgroundPatternLiveLayer(overlay.patternKey, overlay.values, opacity);
}

export function resolvePhiBackgroundWidgetStyle(config: unknown): CSSProperties {
  const normalized = normalizePhiBackgroundWidgetConfig(config);
  const base = normalized.base;
  const style: CSSProperties = {};

  if (base.kind === "color") style.backgroundColor = base.color;
  if (base.kind === "gradient") style.backgroundImage = serializePhiBackgroundBaseCss(base);
  if (base.kind === "image") {
    // A generated variant already carries the server crop, so the resolver hands back a centered
    // position and leaves both the focal rectangle and a configured position to the original.
    const presentation = resolvePhiBackgroundImagePresentation(base);
    if (presentation.url) style.backgroundImage = `url("${presentation.url}")`;
    style.backgroundPosition = presentation.objectPosition;
    style.backgroundSize = base.size ?? "cover";
    style.backgroundRepeat = base.repeat ?? "no-repeat";
  }

  const overlayLayer = resolvePhiBackgroundOverlayLayer(normalized.overlay);
  if (overlayLayer) {
    const baseImages = style.backgroundImage == null ? [] : [String(style.backgroundImage)];
    const baseSizes = baseImages.length === 0 ? [] : [String(style.backgroundSize ?? "auto")];
    const basePositions = baseImages.length === 0 ? [] : [String(style.backgroundPosition ?? "0 0")];
    const baseRepeats = baseImages.length === 0 ? [] : [String(style.backgroundRepeat ?? "no-repeat")];
    style.backgroundImage = [...overlayLayer.images, ...baseImages].join(", ");
    style.backgroundSize = [
      ...overlayLayer.images.map((_, index) => overlayLayer.sizes?.[index] ?? "auto"),
      ...baseSizes,
    ].join(", ");
    style.backgroundPosition = [
      ...overlayLayer.images.map((_, index) => overlayLayer.positions?.[index] ?? "0 0"),
      ...basePositions,
    ].join(", ");
    style.backgroundRepeat = [
      ...overlayLayer.images.map((_, index) => overlayLayer.repeats?.[index] ?? "repeat"),
      ...baseRepeats,
    ].join(", ");
  }

  return composePhiLayoutEffectStyle(
    style,
    resolvePhiLayoutEffectStyle({
      effect: normalized.effect,
      background: style.background ?? style.backgroundColor,
    }),
  );
}

export function resolvePhiBackgroundMotion(config: unknown): PhiBackgroundMotion | null {
  const normalized = normalizePhiBackgroundWidgetConfig(config);
  const motion = normalized.base.kind === "image" ? normalized.motion : null;
  return motion && motion.mode !== "static" ? motion : null;
}

export function resolvePhiBackgroundMotionHostStyle(config: unknown): CSSProperties {
  const normalized = normalizePhiBackgroundWidgetConfig(config);
  return resolvePhiLayoutEffectStyle({ effect: normalized.effect }) ?? {};
}
