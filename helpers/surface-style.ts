import type { CSSProperties } from "react";

import {
  normalizePhiBackgroundWidgetConfig,
  phiBackgroundWidgetConfigPaintsGround,
  resolvePhiBackgroundGroundFilter,
  resolvePhiBackgroundMotion,
  resolvePhiBackgroundMotionHostStyle,
  resolvePhiBackgroundWidgetStyle,
  type PhiCmsBackgroundWidgetConfig,
} from "../components/widgets/config/background";
import { resolvePhiCmsBorderSource } from "../types/cms-border-source";
import { resolvePhiSurfaceToneClassName, type PhiSurface } from "../types/surface";
import { resolvePhiSourcedBorderStyle } from "./border-widget-style";
import { combinePhiBoxShadows, resolvePhiShadow } from "./layout-style";

/**
 * The paint of a Surface when it lives on a layer of its own rather than on the box.
 *
 * Two things need that layer. A softened paint (`blur`) must not soften the content in front of it, and
 * a filter on the box would. A moving picture (`motion`) travels inside the box while the box stands
 * still. Either way the box keeps its edge, its depth and any glass pane, and the layer carries the paint.
 */
export type PhiSurfaceGround = {
  /** The paint, already free of the pane: what the layer draws. */
  paint: CSSProperties;
  /** The softening, applied to the layer and never to the box. */
  filter: string | null;
  /** The Background to move, when it moves; the motion layer draws it from the original picture. */
  motion: PhiCmsBackgroundWidgetConfig | null;
};

export type PhiResolvedSurface = {
  /** What goes on the box: paint (unless a layer carries it), edge, corner, depth, pane. */
  style: CSSProperties;
  /** The layer the paint lives on, or `null` when the box carries its own paint. */
  ground: PhiSurfaceGround | null;
  /** Whether the Surface paints a ground at all -- a pane over nothing does not. */
  paintsGround: boolean;
  /**
   * The class the box carries for its `tone`, or nothing for `inherit`. The box carries it and renders
   * `PhiSurfaceTone` around its content; the class alone draws nothing.
   */
  className?: string;
};

export type PhiSurfaceStyleOptions = {
  /**
   * The corner a Surface takes where it states none.
   *
   * A Layout or a card is a surface on the page and answers silence with the Site's step
   * (`--phi-surface-radius`); a Region spans its part of the frame and has no corner of its own. Applied
   * as four longhands, never as the shorthand: a configured corner arrives as longhands, and React
   * refuses a shorthand standing beside them.
   */
  cornerFallback?: string | number | null;
  /**
   * Put the paint on a layer even when nothing in the Surface asks for one -- a card that zooms its
   * ground under the pointer needs the paint apart from the box to move it.
   */
  forceGroundLayer?: boolean;
  /**
   * Whether the caller can render a ground layer at all. A box drawn by a primitive it does not own -- an
   * Overlay's Drawer or Modal -- cannot, so its paint stays on the box: unsoftened and unmoving, but there.
   */
  groundLayer?: boolean;
};

const PHI_SURFACE_EMPTY: PhiResolvedSurface = { style: {}, ground: null, paintsGround: false };

function resolvePhiSurfaceCorners(
  fallback: string | number | null | undefined,
  configured: CSSProperties,
): CSSProperties {
  const corner = (value: CSSProperties["borderTopLeftRadius"]) => value ?? fallback ?? undefined;
  const corners: CSSProperties = {
    borderTopLeftRadius: corner(configured.borderTopLeftRadius),
    borderTopRightRadius: corner(configured.borderTopRightRadius),
    borderBottomRightRadius: corner(configured.borderBottomRightRadius),
    borderBottomLeftRadius: corner(configured.borderBottomLeftRadius),
  };
  return Object.fromEntries(Object.entries(corners).filter(([, value]) => value != null));
}

/**
 * A Surface as CSS, in one place for every box that has one.
 *
 * The edge follows `borderSource`: `custom` draws the configured line and corners, `theme` the Site's own
 * line, `none` states no line -- explicitly, because a Surface may be laid over a style that carries one.
 * A Surface that states nothing about its edge has the source `none`. Depth is the Background's own shadow
 * (a pane's) combined with the configured one.
 */
export function resolvePhiSurfaceStyle(
  surface: PhiSurface | null | undefined,
  options: PhiSurfaceStyleOptions = {},
): PhiResolvedSurface {
  if (!surface) {
    return PHI_SURFACE_EMPTY;
  }

  const background = surface.background ? normalizePhiBackgroundWidgetConfig(surface.background) : null;
  const paintsGround = phiBackgroundWidgetConfigPaintsGround(background);
  const groundFilter = background ? resolvePhiBackgroundGroundFilter(background) : null;
  const motion = background ? resolvePhiBackgroundMotion(background) : null;
  const needsGroundLayer = options.groundLayer !== false
    && paintsGround
    && (groundFilter != null || motion != null || options.forceGroundLayer === true);

  const paint = background ? resolvePhiBackgroundWidgetStyle(background) : {};
  const hostPaint: CSSProperties = needsGroundLayer
    ? (background ? resolvePhiBackgroundMotionHostStyle(background) : {})
    : paint;
  const ground: PhiSurfaceGround | null = needsGroundLayer && background
    ? {
      paint: resolvePhiBackgroundWidgetStyle({ ...background, filter: null, motion: null }),
      filter: groundFilter,
      motion: motion ? background : null,
    }
    : null;

  const borderSource = resolvePhiCmsBorderSource(surface.borderSource, surface.border);
  const edge = resolvePhiSourcedBorderStyle(borderSource, surface.border);
  const { border: line, ...configuredCorners } = edge;
  const boxShadow = combinePhiBoxShadows(paint.boxShadow, resolvePhiShadow(surface.shadow));

  return {
    style: {
      ...hostPaint,
      ...(line == null ? {} : { border: line }),
      ...resolvePhiSurfaceCorners(options.cornerFallback, configuredCorners),
      ...(boxShadow == null ? {} : { boxShadow }),
      // The layer sits behind the content at `z-index: -1`; the box has to be the stacking context that
      // keeps it there rather than behind the page.
      ...(ground ? { position: "relative", isolation: "isolate" } : {}),
    },
    ground,
    paintsGround,
    ...(surface.tone ? { className: resolvePhiSurfaceToneClassName(surface.tone) } : {}),
  };
}

/** Whether a Surface draws anything a reader could see: a ground, a line, or depth. */
export function phiSurfaceDrawsChrome(surface: PhiSurface | null | undefined): boolean {
  if (!surface) {
    return false;
  }
  return phiBackgroundWidgetConfigPaintsGround(surface.background ?? null)
    || resolvePhiCmsBorderSource(surface.borderSource, surface.border) !== "none"
    || (surface.shadow != null && surface.shadow !== "none");
}
