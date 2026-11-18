import type { CSSProperties } from "react";

import { PHI_LAYOUT_SURFACE_RADIUS } from "../layouts/phi-layout-contract";
import { resolvePhiSurfaceStyle } from "../../helpers/surface-style";
import type { PhiSurface } from "../../types/surface";

/**
 * The Surface of a picture, as the Image and the Gallery Widget draw it on their own box.
 *
 * A picture is a surface on the page: where its Surface states no corner -- or it has none -- it takes
 * the Site's surface step, as a Layout's and a Markdown picture's do (THEME.md "Control shape"). Its
 * ground stays on the box rather than on a layer of its own, because a picture fills the box and covers
 * it; a ground shows only behind a transparent picture or around one that is contained. A tone has
 * nothing to turn on a picture and is not drawn.
 */
export function resolvePhiPictureSurface(surface: PhiSurface | null | undefined): {
  style: CSSProperties;
  corners: CSSProperties;
} {
  const { style } = resolvePhiSurfaceStyle(surface ?? {}, {
    cornerFallback: PHI_LAYOUT_SURFACE_RADIUS,
    groundLayer: false,
  });
  return {
    style,
    corners: {
      borderTopLeftRadius: style.borderTopLeftRadius,
      borderTopRightRadius: style.borderTopRightRadius,
      borderBottomRightRadius: style.borderBottomRightRadius,
      borderBottomLeftRadius: style.borderBottomLeftRadius,
    },
  };
}
