"use client";

import type { ReactNode } from "react";

import { PhiHoverText } from "./phi-hover-text";

/** How large the dot is drawn: small enough to stand beside a line of text without taking its place. */
const PHI_STATUS_DOT_SIZE = 8;

/**
 * A state shown as a small coloured dot, its word in the house tooltip.
 *
 * For a state somebody glances at rather than reads -- saved, a draft, published -- where a tag would
 * take a line's worth of room for one word. The word is still there: pointed at, the tooltip says it,
 * and assistive technology reads it as the dot's label. `children` widens what the pointer may rest on,
 * so a row (a path and its state) can carry one tooltip for both.
 */
export function PhiStatusDotControl({
  color,
  label,
  children,
}: {
  /** A Theme token colour, or nothing for a neutral state. */
  color?: string;
  label: string;
  children?: ReactNode;
}) {
  const dot = (
    <span
      role="img"
      aria-label={label}
      style={{
        display: "inline-block",
        flex: "0 0 auto",
        width: PHI_STATUS_DOT_SIZE,
        height: PHI_STATUS_DOT_SIZE,
        borderRadius: "50%",
        background: color ?? "currentColor",
        opacity: color ? 1 : 0.45,
      }}
    />
  );
  return (
    <PhiHoverText title={label}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {children}
        {dot}
      </span>
    </PhiHoverText>
  );
}
