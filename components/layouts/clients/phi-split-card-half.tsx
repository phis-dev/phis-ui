"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { resolvePhiSurfaceToneClassName, type PhiSurface } from "../../../types/surface";
import { resolvePhiSurfaceStyle } from "../../../helpers/surface-style";
import { PhiSurfaceGroundLayer } from "../../surface/phi-surface-ground";
import { resolvePhiSplitCardGroundFrame } from "../split-card-geometry";
import { PhiSurfaceTone } from "../../surface/phi-surface-tone";
import { PHI_LAYOUT_SURFACE_RADIUS } from "../phi-layout-contract";
import { usePhiLayoutSignalSurface } from "../phi-layout-signal-surface";

export type PhiSplitCardHalfProps = Omit<HTMLAttributes<HTMLDivElement>, "style" | "children"> & {
  [attribute: `data-${string}`]: string | undefined;
  blockId: PhiCmsInstanceId | string | number | null | undefined;
  /** The Split Card's Surface, which both cards wear. */
  surface: PhiSurface | null | undefined;
  side: "left" | "right";
  /** The gap between the cards, as a CSS length; the right card's part of the Background follows it. */
  gap: string;
  /** Whether the left card is the larger one; the right card's part of the Background follows it. */
  swapped?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * One of the Split Card's two cards.
 *
 * It wears the Split Card's Surface -- edge, corner, depth, pane and mode, each card its own -- and shows
 * its part of the Background the two share (`resolvePhiSplitCardGroundFrame`), so a picture or a gradient
 * runs on behind the right card instead of starting again. Outside the cards nothing is painted.
 *
 * A Client Component for the one thing a Server Component cannot do: read the Surface a Signal has set
 * for the Split Card (`usePhiLayoutSignalSurface`). A moving Background does not move here: each card
 * would move its own copy, and two copies of one picture moving are not one picture.
 */
export function PhiSplitCardHalf({
  blockId,
  surface,
  side,
  gap,
  swapped,
  style,
  className,
  children,
  ...attributes
}: PhiSplitCardHalfProps) {
  const signalled = usePhiLayoutSignalSurface(blockId, surface);
  const still = signalled?.background?.motion
    ? { ...signalled, background: { ...signalled.background, motion: null } }
    : signalled;
  const card = resolvePhiSurfaceStyle(still, {
    cornerFallback: PHI_LAYOUT_SURFACE_RADIUS,
    // The paint always lives on a layer: the layer is what can be wider than the card and moved.
    forceGroundLayer: true,
  });
  const toneClassName = resolvePhiSurfaceToneClassName(still?.tone);

  return (
    <div
      {...attributes}
      className={[className, toneClassName].filter(Boolean).join(" ") || undefined}
      style={{ ...card.style, ...style }}
    >
      <PhiSurfaceGroundLayer ground={card.ground} frame={resolvePhiSplitCardGroundFrame(side, gap, swapped)} />
      {toneClassName ? <PhiSurfaceTone tone={still?.tone}>{children}</PhiSurfaceTone> : children}
    </div>
  );
}
