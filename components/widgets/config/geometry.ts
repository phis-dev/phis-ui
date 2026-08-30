import { readPhiLengthValue, type PhiCssLength } from "../../../types";
import type { PhiRenderableBlockSize } from "../../../types/renderable-block";
import type { PhiViewportFlags } from "../../../types/access";
import { normalizePhiViewportFlags } from "../../../types/access";
import { readBoolean, readInteger, readRenderableBlockSize } from "./parser-primitives";

export type PhiCmsGeometryWidgetConfig = {
  sticky?: boolean;
  offsetTop?: PhiCssLength;
  size?: PhiRenderableBlockSize;
  minSize?: PhiRenderableBlockSize;
  maxSize?: PhiRenderableBlockSize;
  zIndex?: number;
  viewportFlags?: PhiViewportFlags;
};

export function normalizePhiGeometryWidgetConfig(config: unknown): PhiCmsGeometryWidgetConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
      return {
        sticky: false,
        offsetTop: 0,
        size: undefined,
        minSize: undefined,
        maxSize: undefined,
        zIndex: 0,
        viewportFlags: 0,
      };
  }

  const raw = config as Record<string, unknown>;
  return {
    sticky: readBoolean(raw.sticky) ?? false,
    offsetTop: readPhiLengthValue(raw.offsetTop) ?? 0,
    size: readRenderableBlockSize(raw.size) ?? undefined,
    minSize: readRenderableBlockSize(raw.minSize) ?? undefined,
    maxSize: readRenderableBlockSize(raw.maxSize) ?? undefined,
    zIndex: readInteger(raw.zIndex) ?? 0,
    viewportFlags: normalizePhiViewportFlags(raw.viewportFlags),
  };
}
