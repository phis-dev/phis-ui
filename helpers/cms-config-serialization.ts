import type { CSSProperties } from "react";

import type {
  PhiRenderableBlockBase,
} from "../types";
import {
  deserializeRenderableBlock,
  mergeRenderableBlockDefaults,
  serializeRenderableBlock,
  stripRenderableBlockDefaults,
} from "./renderable-block-serialization";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function copyIfPresent(target: JsonRecord, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  target[key] = value;
}

export function serializePhiCmsRenderableBlockConfig(
  value: Partial<PhiRenderableBlockBase> | null | undefined,
) {
  return serializeRenderableBlock(value);
}

export function deserializePhiCmsRenderableBlockConfig(value: unknown) {
  return deserializeRenderableBlock(value);
}

export function stripPhiCmsRenderableBlockConfigDefaults(
  value: Partial<PhiRenderableBlockBase> | null | undefined,
) {
  return stripRenderableBlockDefaults(value);
}

export function mergePhiCmsRenderableBlockConfigDefaults(
  value: Partial<PhiRenderableBlockBase> | null | undefined,
) {
  return mergeRenderableBlockDefaults(value);
}

export function serializePhiCmsLayerConfig(value: unknown) {
  const normalized = isRecord(value) ? value : {};
  const next = serializeRenderableBlock(normalized);

  copyIfPresent(next, "padding", normalized.padding);
  copyIfPresent(next, "background", normalized.background);
  copyIfPresent(next, "border", normalized.border);
  copyIfPresent(next, "borderRadius", normalized.borderRadius);

  return next;
}

export function deserializePhiCmsLayerConfig(value: unknown) {
  const normalized = isRecord(value) ? value : {};
  return {
    ...deserializeRenderableBlock(normalized),
    padding: normalized.padding as number | string | undefined,
    background: normalized.background as CSSProperties["background"] | undefined,
    border: normalized.border as CSSProperties["border"] | undefined,
    borderRadius: normalized.borderRadius as number | string | undefined,
  };
}

export function serializePhiCmsDirectionalLayoutConfig(value: unknown) {
  const normalized = isRecord(value) ? value : {};
  const next = serializePhiCmsLayerConfig(normalized);

  copyIfPresent(next, "gap", normalized.gap);
  copyIfPresent(next, "align", normalized.align);
  copyIfPresent(next, "justify", normalized.justify);
  copyIfPresent(next, "wrap", normalized.wrap);

  return next;
}

export function deserializePhiCmsDirectionalLayoutConfig(value: unknown) {
  const normalized = isRecord(value) ? value : {};
  return {
    ...deserializePhiCmsLayerConfig(normalized),
    gap: normalized.gap as number | string | undefined,
    align: normalized.align as CSSProperties["alignItems"] | undefined,
    justify: normalized.justify as CSSProperties["justifyContent"] | undefined,
    wrap: normalized.wrap as boolean | CSSProperties["flexWrap"] | undefined,
  };
}

export function serializePhiCmsWidgetConfig(value: unknown) {
  return serializeRenderableBlock(value as Partial<PhiRenderableBlockBase> | null | undefined);
}
