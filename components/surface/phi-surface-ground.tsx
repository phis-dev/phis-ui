import type { CSSProperties } from "react";

import { PHI_BACKGROUND_BLUR_RADIUS_PX } from "../widgets/config/background";
import { PhiBackgroundMotionLayer } from "../cms/clients/phi-background-motion-layer-lazy";
import type { PhiSurfaceGround } from "../../helpers/surface-style";

/**
 * The layer a Surface's paint lives on when the box cannot carry it (see `PhiSurfaceGround`).
 *
 * Rendered as the box's first child, behind the content at `z-index: -1`, clipped to the box and its
 * corners. A still paint is rendered on the server like any other markup -- a softened picture must not
 * arrive sharp and blur after hydration -- and only a moving one hands over to the motion layer, which
 * carries the same softening.
 *
 * No hooks and no Client boundary of its own, so a Server Component and a Client Component render it
 * alike.
 */
const PHI_SURFACE_GROUND_HOST: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  borderRadius: "inherit",
  pointerEvents: "none",
  zIndex: -1,
};

/*
 * A blurred paint fades towards its own edges, so the layer reaches past the box by twice the radius and
 * the box clips it: what shows is softened all the way to the corner instead of thinning at the rim.
 */
const PHI_SURFACE_GROUND_BLEED = `${-2 * PHI_BACKGROUND_BLUR_RADIUS_PX}px`;

/**
 * Where the paint lies when it is larger than the box: one picture across several boxes, each showing
 * its own part of it. `left` and `width` in CSS lengths relative to the box; the box clips the rest.
 */
export type PhiSurfaceGroundFrame = {
  left: string;
  width: string;
};

export function PhiSurfaceGroundLayer({
  ground,
  className,
  frame,
}: {
  ground: PhiSurfaceGround | null | undefined;
  /** For a caller that moves the paint itself, a hover zoom for one. */
  className?: string;
  /** The paint's own extent, where it reaches past the box (the Split Card's two cards). */
  frame?: PhiSurfaceGroundFrame;
}) {
  if (!ground) {
    return null;
  }

  if (ground.motion) {
    return <PhiBackgroundMotionLayer config={ground.motion} />;
  }

  return (
    <div aria-hidden="true" data-phi-surface-ground="true" style={PHI_SURFACE_GROUND_HOST}>
      <div
        className={className}
        data-phi-surface-ground-paint="true"
        style={{
          ...ground.paint,
          position: "absolute",
          inset: ground.filter ? PHI_SURFACE_GROUND_BLEED : 0,
          ...(frame
            ? ground.filter
              ? { left: `calc(${frame.left} + ${PHI_SURFACE_GROUND_BLEED})`, width: `calc(${frame.width} - 2 * ${PHI_SURFACE_GROUND_BLEED})`, right: "auto" }
              : { left: frame.left, width: frame.width, right: "auto" }
            : {}),
          ...(ground.filter ? { filter: ground.filter } : {}),
        }}
      />
    </div>
  );
}
