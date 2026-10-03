import type { CSSProperties } from "react";

import type { PhiCmsContainerChromeConfig } from "../types/cms-container";
import { normalizePhiBackgroundWidgetConfig } from "../components/widgets/config/background";
import { resolvePhiSurfaceStyle, type PhiResolvedSurface } from "./surface-style";

/**
 * An Overlay container's Surface, as the container draws it.
 *
 * The Surface resolver answers it like any other box's, with one difference that belongs to Overlays
 * (OVERLAYS.md, "Chrome"): an omitted Background keeps the Overlay's own elevated ground, while a
 * Background whose Base is `none` is a deliberate transparency and has to say so, or the ground beneath
 * would show through as the default after all.
 */
export function resolvePhiCmsContainerSurface(
  config: PhiCmsContainerChromeConfig,
): PhiResolvedSurface {
  const resolved = resolvePhiSurfaceStyle(config.surface, { groundLayer: false });
  const background = config.surface?.background
    ? normalizePhiBackgroundWidgetConfig(config.surface.background)
    : null;
  if (!background || background.base.kind !== "none" || background.overlay != null) {
    return resolved;
  }
  const style: CSSProperties = resolved.style.backgroundColor == null
    ? { ...resolved.style, backgroundColor: "transparent" }
    : resolved.style;
  return { ...resolved, style };
}
