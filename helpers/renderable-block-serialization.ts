import type {
  PhiRenderableBlock,
  PhiRenderableBlockAnchor,
  PhiRenderableBlockBase,
  PhiRenderableBlockCapabilities,
  PhiRenderableBlockEffects,
  PhiRenderableBlockInteractionState,
  PhiRenderableBlockRuntime,
  PhiRenderableBlockRuntimeContext,
  PhiRenderableBlockSize,
  PhiRenderableBlockTransition,
  PhiRenderableBlockTransitionAxis,
  PhiRenderableBlockTransitionDirection,
  PhiRenderableBlockTransitionEasing,
  PhiRenderableBlockTransitionMode,
  PhiRenderableBlockTransitionOrigin,
  PhiRenderableBlockTransitionTrigger,
  PhiRenderableBlockTransitionType,
  PhiRenderableBlockViewportEffect,
  PhiRenderableBlockViewportEffectAxis,
  PhiRenderableBlockViewportEffectProperty,
  PhiRenderableBlockViewportEffectRangePoint,
  PhiRenderableBlockViewportEffectUnit,
} from "../types";
import { isPhiLayoutEffectId, readPhiShadow } from "../types/layout-style";
import { readPhiCmsInstanceId } from "../types/cms-instance-id";
import {
  PHI_VIEWER_ACCESS_ANYONE,
  readPhiViewerAccessPolicy,
} from "../types/access";
import {
  PHI_RENDERABLE_BLOCK_DEFAULT_RENDER_MODE,
  PHI_RENDERABLE_BLOCK_DEFAULT_ENABLED,
  PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR,
  PHI_RENDERABLE_BLOCK_DEFAULT_DEBUG_MODE,
  PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS,
  PHI_RENDERABLE_BLOCK_DEFAULT_OPACITY,
  PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION,
  PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT,
  PHI_RENDERABLE_BLOCK_DEFAULT_VISIBILITY,
  PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_FLAGS,
  PHI_RENDERABLE_BLOCK_DEFAULT_Z_INDEX,
  createPhiRenderableBlockDefaults,
} from "./renderable-block-defaults";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeRenderableBlockAnchor(
  value: unknown,
): PhiRenderableBlockAnchor | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const horizontal = value.horizontal;
  const vertical = value.vertical;

  if (
    horizontal !== "left" &&
    horizontal !== "center" &&
    horizontal !== "right" &&
    vertical !== "top" &&
    vertical !== "middle" &&
    vertical !== "bottom"
  ) {
    return undefined;
  }

  return {
    ...(horizontal === "left" || horizontal === "center" || horizontal === "right"
      ? { horizontal }
      : {}),
    ...(vertical === "top" || vertical === "middle" || vertical === "bottom"
      ? { vertical }
      : {}),
  };
}

function normalizeRenderableBlockSize(value: unknown): PhiRenderableBlockSize | undefined {
  if (typeof value === "number" || typeof value === "string") {
    return { width: value };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const width = value.width;
  const height = value.height;

  if (width == null && height == null) {
    return undefined;
  }

  return {
    ...(width == null ? {} : { width: width as PhiRenderableBlockSize["width"] }),
    ...(height == null ? {} : { height: height as PhiRenderableBlockSize["height"] }),
  };
}

function normalizeRenderableBlockOpacity(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeRenderableBlockTransitionType(value: unknown): PhiRenderableBlockTransitionType | undefined {
  return value === "fade" ||
    value === "slide" ||
    value === "flip" ||
    value === "rotate" ||
    value === "scale"
    ? value
    : undefined;
}

function normalizeRenderableBlockTransitionMode(value: unknown): PhiRenderableBlockTransitionMode | undefined {
  return value === "in" || value === "out" ? value : undefined;
}

function normalizeRenderableBlockTransitionAxis(value: unknown): PhiRenderableBlockTransitionAxis | undefined {
  return value === "x" || value === "y" || value === "z" ? value : undefined;
}

function normalizeRenderableBlockTransitionOrigin(value: unknown): PhiRenderableBlockTransitionOrigin | undefined {
  return value === "top left" ||
    value === "top center" ||
    value === "top right" ||
    value === "center left" ||
    value === "center" ||
    value === "center right" ||
    value === "bottom left" ||
    value === "bottom center" ||
    value === "bottom right"
    ? value
    : undefined;
}

function normalizeRenderableBlockTransitionDirection(value: unknown): PhiRenderableBlockTransitionDirection | undefined {
  return value === "top" ||
    value === "top-right" ||
    value === "right" ||
    value === "bottom-right" ||
    value === "bottom" ||
    value === "bottom-left" ||
    value === "left" ||
    value === "top-left"
    ? value
    : undefined;
}

function normalizeRenderableBlockTransitionEasing(value: unknown): PhiRenderableBlockTransitionEasing | undefined {
  return value === "linear" ||
    value === "ease" ||
    value === "ease-in" ||
    value === "ease-out" ||
    value === "ease-in-out"
    ? value
    : undefined;
}

function normalizeRenderableBlockTransitionTrigger(value: unknown): PhiRenderableBlockTransitionTrigger | undefined {
  return value === "on_mount" ||
    value === "on_visible" ||
    value === "on_hover" ||
    value === "on_focus" ||
    value === "manual"
    ? value
    : undefined;
}

function normalizeRenderableBlockViewportEffectAxis(value: unknown): PhiRenderableBlockViewportEffectAxis | undefined {
  return value === "x" || value === "y" ? value : undefined;
}

function normalizeRenderableBlockViewportEffectProperty(value: unknown): PhiRenderableBlockViewportEffectProperty | undefined {
  return value === "translate" ||
    value === "opacity" ||
    value === "rotate" ||
    value === "scale"
    ? value
    : undefined;
}

function normalizeRenderableBlockViewportEffectRangePoint(value: unknown): PhiRenderableBlockViewportEffectRangePoint | number | undefined {
  if (value === "enter" || value === "center" || value === "exit") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }

  return undefined;
}

function normalizeRenderableBlockViewportEffectUnit(value: unknown): PhiRenderableBlockViewportEffectUnit | undefined {
  return value === "px" || value === "%" || value === "deg" || value === "" ? value : undefined;
}

function normalizeRenderableBlockTransitionMs(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(max, Math.max(0, Math.round(value)));
}

function normalizeRenderableBlockTransitionNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(max, Math.max(min, value));
}

function normalizeRenderableBlockTransitionDistance(value: unknown): number | string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

function normalizeRenderableBlockTransitionOffset(value: unknown): number | string | undefined {
  return normalizeRenderableBlockTransitionDistance(value);
}

function normalizeRenderableBlockTransition(value: unknown): PhiRenderableBlockTransition | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const type = normalizeRenderableBlockTransitionType(value.type);
  const mode = normalizeRenderableBlockTransitionMode(value.mode);
  const axis = normalizeRenderableBlockTransitionAxis(value.axis);
  const direction = normalizeRenderableBlockTransitionDirection(value.direction);
  const distance = normalizeRenderableBlockTransitionDistance(value.distance);
  const angleDeg = normalizeRenderableBlockTransitionNumber(value.angleDeg, -3600, 3600);
  const scale = normalizeRenderableBlockTransitionNumber(value.scale, 0, 10);
  const origin = normalizeRenderableBlockTransitionOrigin(value.origin);
  const originOffsetX = normalizeRenderableBlockTransitionOffset(value.originOffsetX);
  const originOffsetY = normalizeRenderableBlockTransitionOffset(value.originOffsetY);
  const perspectivePx = normalizeRenderableBlockTransitionNumber(value.perspectivePx, 0, 10000);
  const durationMs = normalizeRenderableBlockTransitionMs(value.durationMs, 10000);
  const delayMs = normalizeRenderableBlockTransitionMs(value.delayMs, 10000);
  const easing = normalizeRenderableBlockTransitionEasing(value.easing);

  if (
    !type &&
    !mode &&
    !axis &&
    !direction &&
    distance == null &&
    angleDeg == null &&
    scale == null &&
    !origin &&
    originOffsetX == null &&
    originOffsetY == null &&
    perspectivePx == null &&
    durationMs == null &&
    delayMs == null &&
    !easing
  ) {
    return undefined;
  }

  return {
    ...(type ? { type } : {}),
    ...(mode ? { mode } : {}),
    ...(axis ? { axis } : {}),
    ...(direction ? { direction } : {}),
    ...(distance == null ? {} : { distance }),
    ...(angleDeg == null ? {} : { angleDeg }),
    ...(scale == null ? {} : { scale }),
    ...(origin ? { origin } : {}),
    ...(originOffsetX == null ? {} : { originOffsetX }),
    ...(originOffsetY == null ? {} : { originOffsetY }),
    ...(perspectivePx == null ? {} : { perspectivePx }),
    ...(durationMs == null ? {} : { durationMs }),
    ...(delayMs == null ? {} : { delayMs }),
    ...(easing ? { easing } : {}),
  };
}

function normalizeRenderableBlockTransitions(value: unknown): PhiRenderableBlockTransition[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const transitions = value
    .map((entry) => normalizeRenderableBlockTransition(entry))
    .filter((entry): entry is PhiRenderableBlockTransition => entry != null);

  return transitions.length > 0 ? transitions : undefined;
}

function normalizeRenderableBlockViewportEffect(value: unknown): PhiRenderableBlockViewportEffect | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const axis = normalizeRenderableBlockViewportEffectAxis(value.axis);
  const property = normalizeRenderableBlockViewportEffectProperty(value.property);
  const from = normalizeRenderableBlockTransitionNumber(value.from, -10000, 10000);
  const to = normalizeRenderableBlockTransitionNumber(value.to, -10000, 10000);
  const unit = normalizeRenderableBlockViewportEffectUnit(value.unit);
  const rangeStart = normalizeRenderableBlockViewportEffectRangePoint(value.rangeStart);
  const rangeEnd = normalizeRenderableBlockViewportEffectRangePoint(value.rangeEnd);
  const easing = normalizeRenderableBlockTransitionEasing(value.easing);
  const clamp = typeof value.clamp === "boolean" ? value.clamp : undefined;

  if (
    !axis &&
    !property &&
    from == null &&
    to == null &&
    !unit &&
    rangeStart == null &&
    rangeEnd == null &&
    !easing &&
    clamp == null
  ) {
    return undefined;
  }

  return {
    ...(axis ? { axis } : {}),
    ...(property ? { property } : {}),
    ...(from == null ? {} : { from }),
    ...(to == null ? {} : { to }),
    ...(unit == null ? {} : { unit }),
    ...(rangeStart == null ? {} : { rangeStart }),
    ...(rangeEnd == null ? {} : { rangeEnd }),
    ...(easing ? { easing } : {}),
    ...(clamp == null ? {} : { clamp }),
  };
}

function normalizeRenderableBlockViewportEffects(value: unknown): PhiRenderableBlockViewportEffect[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const viewportEffects = value
    .map((entry) => normalizeRenderableBlockViewportEffect(entry))
    .filter((entry): entry is PhiRenderableBlockViewportEffect => entry != null);

  return viewportEffects.length > 0 ? viewportEffects : undefined;
}

function normalizeRenderableBlockEffects(value: unknown): PhiRenderableBlockEffects | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const opacity = normalizeRenderableBlockOpacity(value.opacity);
  const transitionTrigger = normalizeRenderableBlockTransitionTrigger(value.transitionTrigger);
  const transitionOnce = typeof value.transitionOnce === "boolean" ? value.transitionOnce : undefined;
  const transitions = normalizeRenderableBlockTransitions(value.transitions);
  const viewportEffects = normalizeRenderableBlockViewportEffects(value.viewportEffects);
  if (
    opacity == null &&
    !transitionTrigger &&
    transitionOnce == null &&
    !transitions &&
    !viewportEffects
  ) {
    return undefined;
  }

  return {
    ...(opacity == null ? {} : { opacity }),
    ...(transitionTrigger ? { transitionTrigger } : {}),
    ...(transitionOnce == null ? {} : { transitionOnce }),
    ...(transitions ? { transitions } : {}),
    ...(viewportEffects ? { viewportEffects } : {}),
  };
}

function normalizeRenderableBlockCapabilities(
  value: unknown,
): PhiRenderableBlockCapabilities | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const next: PhiRenderableBlockCapabilities = {};
  let hasValue = false;

  for (const key of ["selectable", "draggable", "hoverable", "activatable", "focusable", "droppable"] as const) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      next[key] = candidate;
      hasValue = true;
    }
  }

  return hasValue ? next : undefined;
}

function normalizeRenderableBlockRuntimeContext(
  value: unknown,
): PhiRenderableBlockRuntimeContext | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const next: PhiRenderableBlockRuntimeContext = {};
  let hasValue = false;

  if (typeof value.siteKey === "string" || value.siteKey === null) {
    next.siteKey = value.siteKey;
    hasValue = true;
  }
  if (typeof value.publicUrl === "string" || value.publicUrl === null) {
    next.publicUrl = value.publicUrl;
    hasValue = true;
  }
  if (typeof value.defaultLang === "string" || value.defaultLang === null) {
    next.defaultLang = value.defaultLang;
    hasValue = true;
  }
  if (typeof value.area === "string" || value.area === null) {
    next.area = value.area;
    hasValue = true;
  }
  if (typeof value.pageKey === "string" || value.pageKey === null) {
    next.pageKey = value.pageKey;
    hasValue = true;
  }
  if (typeof value.regionKey === "string" || value.regionKey === null) {
    next.regionKey = value.regionKey;
    hasValue = true;
  }
  const blockId = readPhiCmsInstanceId(value.blockId);
  if (blockId || value.blockId === null) {
    next.blockId = blockId ?? null;
    hasValue = true;
  }

  return hasValue ? next : undefined;
}

function normalizeRenderableBlockInteractionState(
  value: unknown,
): PhiRenderableBlockInteractionState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const next: PhiRenderableBlockInteractionState = {};
  let hasValue = false;

  for (const key of ["selected", "hovered", "dragging", "focused", "active"] as const) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      next[key] = candidate;
      hasValue = true;
    }
  }

  return hasValue ? next : undefined;
}

function normalizeRenderableBlockRuntime(value: unknown): PhiRenderableBlockRuntime | undefined {
  const context = normalizeRenderableBlockRuntimeContext(value);
  const interaction = normalizeRenderableBlockInteractionState(value);
  if (!context && !interaction) {
    return undefined;
  }

  return {
    ...context,
    ...interaction,
  };
}

function normalizeRenderableBlockBase(value: unknown): PhiRenderableBlockBase {
  if (!isRecord(value)) {
    return createPhiRenderableBlockDefaults();
  }

  return {
    renderMode:
      value.renderMode === "live" || value.renderMode === "editor"
        ? value.renderMode
        : PHI_RENDERABLE_BLOCK_DEFAULT_RENDER_MODE,
    visibility:
      value.visibility === "hidden" ||
      value.visibility === "collapsed" ||
      value.visibility === "visible"
        ? value.visibility
        : PHI_RENDERABLE_BLOCK_DEFAULT_VISIBILITY,
    accessPolicy:
      readPhiViewerAccessPolicy(value.accessPolicy) ??
      PHI_VIEWER_ACCESS_ANYONE,
    viewportFlags:
      typeof value.viewportFlags === "number" &&
      Number.isInteger(value.viewportFlags) &&
      value.viewportFlags >= 0 &&
      value.viewportFlags <= 6
        ? value.viewportFlags
        : PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_FLAGS,
    enabled: typeof value.enabled === "boolean" ? value.enabled : PHI_RENDERABLE_BLOCK_DEFAULT_ENABLED,
    debugMode: typeof value.debugMode === "boolean" ? value.debugMode : PHI_RENDERABLE_BLOCK_DEFAULT_DEBUG_MODE,
    anchor: normalizeRenderableBlockAnchor(value.anchor),
    zIndex: typeof value.zIndex === "number" && Number.isInteger(value.zIndex)
      ? value.zIndex
      : PHI_RENDERABLE_BLOCK_DEFAULT_Z_INDEX,
    opacity: normalizeRenderableBlockOpacity(value.opacity) ?? PHI_RENDERABLE_BLOCK_DEFAULT_OPACITY,
    effect: isPhiLayoutEffectId(value.effect) ? value.effect : undefined,
    shadow: readPhiShadow(value.shadow),
    className: typeof value.className === "string" ? value.className : undefined,
    size: normalizeRenderableBlockSize(value.size),
    minSize: normalizeRenderableBlockSize(value.minSize),
    maxSize: normalizeRenderableBlockSize(value.maxSize),
    collapsedSizeHint: normalizeRenderableBlockSize(value.collapsedSizeHint),
    effects: normalizeRenderableBlockEffects(value.effects),
  };
}

function stripRenderableBlockSize(value: PhiRenderableBlockSize | null | undefined) {
  if (!value) {
    return undefined;
  }

  const width = value.width ?? undefined;
  const height = value.height ?? undefined;

  if (width == null && height == null) {
    return undefined;
  }

  return {
    ...(width == null ? {} : { width }),
    ...(height == null ? {} : { height }),
  };
}

function stripRenderableBlockAnchor(
  value: unknown,
): PhiRenderableBlockAnchor | undefined {
  const normalized = normalizeRenderableBlockAnchor(value);
  if (!normalized) {
    return undefined;
  }

  const horizontal = normalized.horizontal ?? PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR.horizontal;
  const vertical = normalized.vertical ?? PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR.vertical;

  if (
    horizontal === PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR.horizontal &&
    vertical === PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR.vertical
  ) {
    return undefined;
  }

  return {
    ...(normalized.horizontal == null || normalized.horizontal === PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR.horizontal
      ? {}
      : { horizontal: normalized.horizontal }),
    ...(normalized.vertical == null || normalized.vertical === PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR.vertical
      ? {}
      : { vertical: normalized.vertical }),
  };
}

function stripRenderableBlockCapabilities(
  value: PhiRenderableBlockCapabilities | null | undefined,
): PhiRenderableBlockCapabilities | undefined {
  if (!value) {
    return undefined;
  }

  const next: PhiRenderableBlockCapabilities = {};
  let hasValue = false;

  for (const key of ["selectable", "draggable", "hoverable", "activatable", "focusable", "droppable"] as const) {
    if (value[key] === false) {
      next[key] = false;
      hasValue = true;
    }
  }

  return hasValue ? next : undefined;
}

function stripRenderableBlockEffects(
  value: PhiRenderableBlockEffects | null | undefined,
): PhiRenderableBlockEffects | undefined {
  const normalized = normalizeRenderableBlockEffects(value);
  if (!normalized) {
    return undefined;
  }

  const opacity = normalized.opacity ?? PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS.opacity;
  const transitionTrigger = normalized.transitionTrigger ?? PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS.transitionTrigger;
  const transitionOnce = normalized.transitionOnce ?? PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS.transitionOnce;
  const next: PhiRenderableBlockEffects = {};

  if (opacity !== PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS.opacity) {
    next.opacity = opacity;
  }
  if (transitionTrigger !== PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS.transitionTrigger) {
    next.transitionTrigger = transitionTrigger;
  }
  if (transitionOnce !== PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS.transitionOnce) {
    next.transitionOnce = transitionOnce;
  }
  if (normalized.transitions && normalized.transitions.length > 0) {
    next.transitions = normalized.transitions.map((transition) => {
      const merged = {
        ...PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION,
        ...transition,
      };
      const nextTransition: PhiRenderableBlockTransition = {
        type: merged.type,
      };

      if (merged.mode !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.mode) {
        nextTransition.mode = merged.mode;
      }
      if (merged.axis !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.axis) {
        nextTransition.axis = merged.axis;
      }
      if (merged.direction !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.direction) {
        nextTransition.direction = merged.direction;
      }
      if (merged.distance !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.distance) {
        nextTransition.distance = merged.distance;
      }
      if (merged.angleDeg !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.angleDeg) {
        nextTransition.angleDeg = merged.angleDeg;
      }
      if (merged.scale !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.scale) {
        nextTransition.scale = merged.scale;
      }
      if (merged.origin !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.origin) {
        nextTransition.origin = merged.origin;
      }
      if (merged.originOffsetX !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.originOffsetX) {
        nextTransition.originOffsetX = merged.originOffsetX;
      }
      if (merged.originOffsetY !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.originOffsetY) {
        nextTransition.originOffsetY = merged.originOffsetY;
      }
      if (merged.perspectivePx !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.perspectivePx) {
        nextTransition.perspectivePx = merged.perspectivePx;
      }
      if (merged.durationMs !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.durationMs) {
        nextTransition.durationMs = merged.durationMs;
      }
      if (merged.delayMs !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.delayMs) {
        nextTransition.delayMs = merged.delayMs;
      }
      if (merged.easing !== PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.easing) {
        nextTransition.easing = merged.easing;
      }

      return nextTransition;
    });
  }
  if (normalized.viewportEffects && normalized.viewportEffects.length > 0) {
    next.viewportEffects = normalized.viewportEffects.map((viewportEffect) => {
      const merged = {
        ...PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT,
        ...viewportEffect,
      };
      const nextViewportEffect: PhiRenderableBlockViewportEffect = {
        property: merged.property,
      };

      if (merged.axis !== PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.axis) {
        nextViewportEffect.axis = merged.axis;
      }
      if (merged.from !== PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.from) {
        nextViewportEffect.from = merged.from;
      }
      if (merged.to !== PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.to) {
        nextViewportEffect.to = merged.to;
      }
      if (merged.unit !== PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.unit) {
        nextViewportEffect.unit = merged.unit;
      }
      if (merged.rangeStart !== PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.rangeStart) {
        nextViewportEffect.rangeStart = merged.rangeStart;
      }
      if (merged.rangeEnd !== PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.rangeEnd) {
        nextViewportEffect.rangeEnd = merged.rangeEnd;
      }
      if (merged.easing !== PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.easing) {
        nextViewportEffect.easing = merged.easing;
      }
      if (merged.clamp !== PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.clamp) {
        nextViewportEffect.clamp = merged.clamp;
      }

      return nextViewportEffect;
    });
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function mergeRenderableBlockDefaults(
  value: Partial<PhiRenderableBlockBase> | null | undefined,
): PhiRenderableBlockBase {
  const normalized = normalizeRenderableBlockBase(value);
  return {
    ...createPhiRenderableBlockDefaults(),
    ...normalized,
    effects: {
      ...PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS,
      ...normalized.effects,
      transitions: normalized.effects?.transitions ?? PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS.transitions,
      viewportEffects: normalized.effects?.viewportEffects ?? PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS.viewportEffects,
    },
  };
}

export function stripRenderableBlockDefaults(
  value: Partial<PhiRenderableBlockBase> | null | undefined,
): Partial<PhiRenderableBlockBase> {
  const normalized = mergeRenderableBlockDefaults(value);
  const next: Partial<PhiRenderableBlockBase> = {};

  if (normalized.renderMode !== PHI_RENDERABLE_BLOCK_DEFAULT_RENDER_MODE) {
    next.renderMode = normalized.renderMode;
  }
  if (normalized.visibility !== PHI_RENDERABLE_BLOCK_DEFAULT_VISIBILITY) {
    next.visibility = normalized.visibility;
  }
  if (normalized.accessPolicy?.access !== PHI_VIEWER_ACCESS_ANYONE.access) {
    next.accessPolicy = normalized.accessPolicy;
  }
  if (normalized.viewportFlags !== PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_FLAGS) {
    next.viewportFlags = normalized.viewportFlags;
  }
  if (normalized.enabled !== PHI_RENDERABLE_BLOCK_DEFAULT_ENABLED) {
    next.enabled = normalized.enabled;
  }
  if (normalized.debugMode !== PHI_RENDERABLE_BLOCK_DEFAULT_DEBUG_MODE) {
    next.debugMode = normalized.debugMode;
  }
  const anchor = stripRenderableBlockAnchor(normalized.anchor);
  if (anchor) {
    next.anchor = anchor;
  }
  if (normalized.zIndex !== PHI_RENDERABLE_BLOCK_DEFAULT_Z_INDEX) {
    next.zIndex = normalized.zIndex;
  }
  if (normalized.opacity !== PHI_RENDERABLE_BLOCK_DEFAULT_OPACITY) {
    next.opacity = normalized.opacity;
  }
  if (normalized.effect !== undefined) {
    next.effect = normalized.effect;
  }
  if (normalized.shadow !== undefined) {
    next.shadow = normalized.shadow;
  }
  if (normalized.className) {
    next.className = normalized.className;
  }

  const size = stripRenderableBlockSize(normalized.size);
  if (size) {
    next.size = size;
  }

  const minSize = stripRenderableBlockSize(normalized.minSize);
  if (minSize) {
    next.minSize = minSize;
  }

  const maxSize = stripRenderableBlockSize(normalized.maxSize);
  if (maxSize) {
    next.maxSize = maxSize;
  }

  const collapsedSizeHint = stripRenderableBlockSize(normalized.collapsedSizeHint);
  if (collapsedSizeHint) {
    next.collapsedSizeHint = collapsedSizeHint;
  }

  const effects = stripRenderableBlockEffects(normalized.effects);
  if (effects) {
    next.effects = effects;
  }

  return next;
}

export function deserializeRenderableBlock(
  value: unknown,
): PhiRenderableBlock {
  if (!isRecord(value)) {
    return {
      ...createPhiRenderableBlockDefaults(),
    };
  }

  return {
    ...mergeRenderableBlockDefaults(value),
    capabilities: normalizeRenderableBlockCapabilities(value.capabilities),
    runtime: normalizeRenderableBlockRuntime(value.runtime),
  };
}

export function serializeRenderableBlock(
  value: Partial<PhiRenderableBlock> | null | undefined,
): JsonRecord {
  if (!value) {
    return {};
  }

  const next: JsonRecord = {
    ...stripRenderableBlockDefaults(value),
  };

  const capabilities = stripRenderableBlockCapabilities(value.capabilities);
  if (capabilities) {
    next.capabilities = capabilities;
  }

  return next;
}
