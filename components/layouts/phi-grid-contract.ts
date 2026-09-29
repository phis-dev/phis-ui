import type { CSSProperties, ReactNode } from "react";

import type { PhiBaseLayoutProps } from "./phi-layout-view-model";
import type { PhiRenderableBlockAnchor } from "../../types";
import type { PhiAnchorWidgetPlacement } from "../controls/phi-anchor-control-contract";
import {
  resolvePhiResponsiveValue,
  type PhiResolvedResponsiveValue,
  type PhiResponsiveValue,
} from "../../types/responsive";

/**
 * What a slot spans when its Grid was never told.
 *
 * One constant for all three profiles stood here before -- six tracks, four per row -- and a Grid whose
 * slots carry no authored span therefore never reflowed: four abreast at 320px and at 1600px alike,
 * only narrower, because the 24 tracks are `minmax(0, 1fr)` and shrink. The wrapping that did happen was
 * the cursor running past column 24, not an answer to the room.
 *
 * So the default is a profile value like every other placement: the whole row where there is no room to
 * share, two abreast in the middle, four where the Grid is at least as wide as the content column. An
 * author who names a span still names it and nothing here applies.
 *
 * At `compact` the row is full, so an offset has nothing left to push into and is clamped away. That is
 * the answer rather than an accident: a slot cannot be indented in a room that holds one slot.
 */
export const PHI_GRID_LAYOUT_DEFAULT_SPAN: PhiResolvedResponsiveValue<number> = {
  compact: 24,
  medium: 12,
  wide: 6,
};

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
  const span = resolvePhiResponsiveValue(placement?.span, {
    compact: fallbackSpan,
    medium: fallbackSpan,
    wide: fallbackSpan,
  })[profile];
  const offset = resolvePhiResponsiveValue(placement?.offset, {
    compact: 0,
    medium: 0,
    wide: 0,
  })[profile];
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
