import { isPhiRecord } from "../../../helpers/is-record";
import { readPhiLengthValue, type PhiCssLength } from "../../../types";
import type { PhiRenderableBlockResponsiveSize } from "../../../types/renderable-block";
import type { PhiViewportFlags } from "../../../types/access";
import { normalizePhiViewportFlags } from "../../../types/access";
import { readBoolean, readInteger } from "./parser-primitives";
import { normalizePhiRenderableBlockResponsiveSize } from "../../../helpers/renderable-block-normalizers";

export type PhiCmsGeometryWidgetConfig = {
  sticky?: boolean;
  offsetTop?: PhiCssLength;
  size?: PhiRenderableBlockResponsiveSize;
  minSize?: PhiRenderableBlockResponsiveSize;
  maxSize?: PhiRenderableBlockResponsiveSize;
  zIndex?: number;
  viewportFlags?: PhiViewportFlags;
};

export function normalizePhiGeometryWidgetConfig(config: unknown): PhiCmsGeometryWidgetConfig {
  if (!isPhiRecord(config)) {
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
    size: normalizePhiRenderableBlockResponsiveSize(raw.size) ?? undefined,
    minSize: normalizePhiRenderableBlockResponsiveSize(raw.minSize) ?? undefined,
    maxSize: normalizePhiRenderableBlockResponsiveSize(raw.maxSize) ?? undefined,
    zIndex: readInteger(raw.zIndex) ?? 0,
    viewportFlags: normalizePhiViewportFlags(raw.viewportFlags),
  };
}
