"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import type { PhiSurface } from "../../types/surface";
import { resolvePhiSurfaceStyle, type PhiSurfaceGround } from "../../helpers/surface-style";
import { PhiSurfaceGroundLayer } from "../surface/phi-surface-ground";
import { PhiSurfaceTone } from "../surface/phi-surface-tone";
import { resolvePhiSurfaceToneClassName } from "../../types/surface";
import { PHI_LAYOUT_SURFACE_RADIUS } from "./phi-layout-contract";
import { usePhiLayoutSignalSurface } from "./phi-layout-signal-surface";

/*
 * Kept where a Signal replaces the Surface: the Layout states them for its topology as well, and a box
 * that lost its own `position` would let its overlays escape it.
 */
const PHI_LAYOUT_SURFACE_BOX_KEPT_KEYS = new Set<keyof CSSProperties>(["position", "isolation"]);

export type PhiLayoutSurfaceBoxProps = Omit<HTMLAttributes<HTMLDivElement>, "style" | "children"> & {
  [attribute: `data-${string}`]: string | undefined;
  blockId: PhiCmsInstanceId | string | number | null | undefined;
  /** The Surface the Layout was given, already drawn into `style` and `ground`. */
  surface: PhiSurface | null | undefined;
  ground: PhiSurfaceGround | null;
  style: CSSProperties;
  children?: ReactNode;
};

/**
 * A Layout's box style with the Surface it was given swapped for the one Signals left: the given
 * Surface's entries come out, the Layout's own stay, and the signalled Surface goes on top.
 */
export function resolvePhiLayoutSignalledSurfaceStyle(
  style: CSSProperties,
  given: PhiSurface | null | undefined,
  signalled: PhiSurface | null | undefined,
): { style: CSSProperties; ground: PhiSurfaceGround | null } {
  const options = { cornerFallback: PHI_LAYOUT_SURFACE_RADIUS };
  const givenStyle = resolvePhiSurfaceStyle(given, options).style;
  const next = resolvePhiSurfaceStyle(signalled, options);
  const rest = Object.fromEntries(
    Object.entries(style).filter(([key, value]) =>
      PHI_LAYOUT_SURFACE_BOX_KEPT_KEYS.has(key as keyof CSSProperties)
      || givenStyle[key as keyof CSSProperties] !== value),
  ) as CSSProperties;
  return { style: { ...rest, ...next.style }, ground: next.ground };
}

/**
 * The root box of a Layout that renders on the server.
 *
 * Everything is decided where the Layout renders: the style it receives already carries the Surface, and
 * the ground layer is the one the Layout resolved. As long as no Signal has changed the Surface, this box
 * draws exactly that. Once one has (see `usePhiLayoutSignalSurface`), it takes the given Surface's part
 * out of the style and puts the signalled one in its place -- the Layout's own topology stays as the
 * server drew it. It is also where the Surface's `tone` lands: the class on the box and the tone scope
 * around its content.
 */
export function PhiLayoutSurfaceBox({
  blockId,
  surface,
  ground,
  style,
  children,
  ...attributes
}: PhiLayoutSurfaceBoxProps) {
  const signalled = usePhiLayoutSignalSurface(blockId, surface);
  const next = signalled === surface ? { style, ground } : resolvePhiLayoutSignalledSurfaceStyle(style, surface, signalled);
  const toneClassName = resolvePhiSurfaceToneClassName(signalled?.tone);
  return (
    <div
      {...attributes}
      className={[attributes.className, toneClassName].filter(Boolean).join(" ") || undefined}
      style={next.style}
    >
      <PhiSurfaceGroundLayer ground={next.ground} />
      {toneClassName ? <PhiSurfaceTone tone={signalled?.tone}>{children}</PhiSurfaceTone> : children}
    </div>
  );
}
