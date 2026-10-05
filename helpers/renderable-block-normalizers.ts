import type {
  PhiRenderableBlockCapabilities,
  PhiRenderableBlockInteractionState,
  PhiRenderableBlockResponsiveSize,
  PhiRenderableBlockRuntime,
  PhiRenderableBlockRuntimeContext,
  PhiRenderableBlockSize,
  PhiResponsiveLength,
} from "../types/renderable-block";
import { readPhiCmsInstanceId } from "../types/cms-instance-id";
import { isPhiRecord } from "./is-record";

/*
 * A Renderable Block's parts are read in one place.
 *
 * The client runtime, the serialisation, the Widget config parsers and the Builder's Region hydration
 * each read a block's size, capabilities, runtime context and interaction state for themselves, and the
 * four copies drifted: one took `blockId` as a raw number where the others read an instance id, two kept
 * a scalar size as a width where a third dropped it. A block could be read one way in the Builder and
 * another when it came back from the store. Every reader takes `unknown`, because that is what a stored
 * record is; a typed caller loses nothing by it.
 */

const PHI_RENDERABLE_BLOCK_CAPABILITY_KEYS = [
  "selectable",
  "draggable",
  "hoverable",
  "activatable",
  "focusable",
  "droppable",
] as const satisfies readonly (keyof PhiRenderableBlockCapabilities)[];

const PHI_RENDERABLE_BLOCK_INTERACTION_KEYS = [
  "selected",
  "hovered",
  "dragging",
  "focused",
  "active",
] as const satisfies readonly (keyof PhiRenderableBlockInteractionState)[];

/** One stored length: a finite number or a non-blank string. */
export function readPhiRenderableBlockLength(value: unknown): number | string | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * One stored length, plain or per profile.
 *
 * A profile value is `{ compact?, medium?, wide? }` and at least one of the three has to be a length,
 * or it is not a profile value and states nothing. Read here rather than accepted as it stands, so a
 * stored object cannot carry anything else into the config.
 */
export function readPhiResponsiveLength(value: unknown): PhiResponsiveLength | undefined {
  const scalar = readPhiRenderableBlockLength(value);
  if (scalar !== undefined) {
    return scalar;
  }
  if (!isPhiRecord(value)) {
    return undefined;
  }
  const compact = readPhiRenderableBlockLength(value.compact);
  const medium = readPhiRenderableBlockLength(value.medium);
  const wide = readPhiRenderableBlockLength(value.wide);
  if (compact === undefined && medium === undefined && wide === undefined) {
    return undefined;
  }
  return {
    ...(compact === undefined ? {} : { compact }),
    ...(medium === undefined ? {} : { medium }),
    ...(wide === undefined ? {} : { wide }),
  };
}

/**
 * A size pair without its empty axes, or nothing where both are empty. Generic over the length, because
 * the same stripping serves a profile pair and a plain one.
 */
export function stripPhiRenderableBlockSize<TLength>(
  value: { width?: TLength | null; height?: TLength | null } | null | undefined,
) {
  if (!value || typeof value !== "object") {
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

/** A stored size pair, each axis plain or per profile; a bare length is a width. */
export function normalizePhiRenderableBlockResponsiveSize(value: unknown): PhiRenderableBlockResponsiveSize | undefined {
  const scalar = readPhiResponsiveLength(value);
  if (scalar !== undefined) {
    return { width: scalar };
  }
  if (!isPhiRecord(value)) {
    return undefined;
  }
  return stripPhiRenderableBlockSize({
    width: readPhiResponsiveLength(value.width),
    height: readPhiResponsiveLength(value.height),
  });
}

/** A stored size pair of plain lengths (a collapsed-size hint, a Region draft); a bare length is a width. */
export function normalizePhiRenderableBlockSize(value: unknown): PhiRenderableBlockSize | undefined {
  const scalar = readPhiRenderableBlockLength(value);
  if (scalar !== undefined) {
    return { width: scalar };
  }
  if (!isPhiRecord(value)) {
    return undefined;
  }
  return stripPhiRenderableBlockSize({
    width: readPhiRenderableBlockLength(value.width),
    height: readPhiRenderableBlockLength(value.height),
  });
}

export function normalizePhiRenderableBlockCapabilities(value: unknown): PhiRenderableBlockCapabilities | undefined {
  if (!isPhiRecord(value)) {
    return undefined;
  }
  const next: PhiRenderableBlockCapabilities = {};
  let hasValue = false;
  for (const key of PHI_RENDERABLE_BLOCK_CAPABILITY_KEYS) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      next[key] = candidate;
      hasValue = true;
    }
  }
  return hasValue ? next : undefined;
}

export function normalizePhiRenderableBlockInteractionState(value: unknown): PhiRenderableBlockInteractionState | undefined {
  if (!isPhiRecord(value)) {
    return undefined;
  }
  const next: PhiRenderableBlockInteractionState = {};
  let hasValue = false;
  for (const key of PHI_RENDERABLE_BLOCK_INTERACTION_KEYS) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      next[key] = candidate;
      hasValue = true;
    }
  }
  return hasValue ? next : undefined;
}

/** The block's place in the Site; `blockId` is an instance id or stated absent, never a bare number. */
export function normalizePhiRenderableBlockRuntimeContext(value: unknown): PhiRenderableBlockRuntimeContext | undefined {
  if (!isPhiRecord(value)) {
    return undefined;
  }
  const next: PhiRenderableBlockRuntimeContext = {};
  let hasValue = false;
  for (const key of ["siteKey", "publicUrl", "defaultLang", "area", "pageKey", "regionKey"] as const) {
    const candidate = value[key];
    if (typeof candidate === "string" || candidate === null) {
      next[key] = candidate;
      hasValue = true;
    }
  }
  const blockId = readPhiCmsInstanceId(value.blockId);
  if (blockId || value.blockId === null) {
    next.blockId = blockId ?? null;
    hasValue = true;
  }
  return hasValue ? next : undefined;
}

export function normalizePhiRenderableBlockRuntime(value: unknown): PhiRenderableBlockRuntime | undefined {
  const context = normalizePhiRenderableBlockRuntimeContext(value);
  const interaction = normalizePhiRenderableBlockInteractionState(value);
  if (!context && !interaction) {
    return undefined;
  }
  return { ...context, ...interaction };
}
