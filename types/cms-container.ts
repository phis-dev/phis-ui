import type { CSSProperties } from "react";

import type { PhiSurface } from "./surface";

/**
 * What a Region or an Overlay container looks like: its inset, and its Surface.
 *
 * The Surface is the same shape a Layout and a Widget carry (`types/surface.ts`); padding stays beside it
 * because it is geometry, not appearance.
 */
export type PhiCmsContainerChromeConfig = {
  padding?: CSSProperties["padding"];
  paddingTop?: CSSProperties["paddingTop"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingBottom?: CSSProperties["paddingBottom"];
  paddingLeft?: CSSProperties["paddingLeft"];
  surface?: PhiSurface | null;
};
