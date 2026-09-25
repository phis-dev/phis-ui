import type { CSSProperties, ReactNode } from "react";

import type { PhiBaseLayoutProps } from "./phi-layout-view-model";
import type { PhiRenderableBlockAnchor } from "../../types";
import type { PhiAnchorWidgetPlacement } from "../controls/phi-anchor-control-contract";
import type { PhiResponsiveValue } from "../../types/responsive";

export type PhiGridLayoutSlotPlacement = {
  slotIndex: number;
  span?: PhiResponsiveValue<number>;
  offset?: PhiResponsiveValue<number>;
};

export type PhiGridLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  gap?: CSSProperties["gap"];
  columnGap?: CSSProperties["columnGap"];
  slotPlacements?: PhiGridLayoutSlotPlacement[];
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  anchor?: PhiRenderableBlockAnchor;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  wrap?: boolean | CSSProperties["flexWrap"];
  slotStyle?: CSSProperties;
};

export function resolvePhiGridSlotPlacement(
  slotPlacements: PhiGridLayoutSlotPlacement[] | undefined,
  slotIndex: number,
  profile: "compact" | "medium" | "wide",
  fallbackSpan: number,
) {
  const placement = slotPlacements?.find((candidate) => candidate.slotIndex === slotIndex);
  const span = placement?.span?.[profile] ?? (profile === "wide"
    ? placement?.span?.medium ?? placement?.span?.compact
    : profile === "medium"
      ? placement?.span?.compact
      : undefined) ?? fallbackSpan;
  const offset = placement?.offset?.[profile] ?? (profile === "wide"
    ? placement?.offset?.medium ?? placement?.offset?.compact
    : profile === "medium"
      ? placement?.offset?.compact
      : undefined) ?? 0;
  return { span, offset };
}

export type PhiGridSlotColumns = {
  /** The 1-based column line the slot starts on. */
  start: number;
  span: number;
};

/**
 * Where each slot stands on the 24 tracks, in flow.
 *
 * `offset` counts unused columns before a slot, the way a Grid column's offset does elsewhere, so a
 * slot with none starts where the previous one ended and a row holds as many slots as fit. Written as
 * an absolute line (`offset + 1`) instead, every slot without an offset started on column 1 -- and a
 * definite start on column 1 for every item is a new row for every item, so three cards spanning six
 * tracks each stood under one another. Resolved for all slots at once because a slot's start depends on
 * the ones before it; the grid then places rows for itself, and it agrees with this cursor: an item whose
 * start line is left of the previous item's goes to the next row, exactly where the cursor wrapped.
 */
export function resolvePhiGridSlotColumns(
  slotPlacements: PhiGridLayoutSlotPlacement[] | undefined,
  slotIndices: readonly number[],
  profile: "compact" | "medium" | "wide",
  fallbackSpan: number,
  columns = 24,
): Map<number, PhiGridSlotColumns> {
  const resolved = new Map<number, PhiGridSlotColumns>();
  let cursor = 1;

  for (const slotIndex of slotIndices) {
    const placement = resolvePhiGridSlotPlacement(slotPlacements, slotIndex, profile, fallbackSpan);
    const span = Math.max(1, Math.min(columns, placement.span));
    const offset = Math.max(0, Math.min(columns - span, placement.offset));
    let start = cursor + offset;
    if (start + span - 1 > columns) {
      start = 1 + offset;
    }
    resolved.set(slotIndex, { start, span });
    cursor = start + span;
    if (cursor > columns) {
      cursor = 1;
    }
  }

  return resolved;
}
