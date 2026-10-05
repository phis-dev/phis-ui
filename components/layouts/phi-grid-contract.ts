import type { CSSProperties, ReactNode } from "react";

import type { PhiBaseLayoutProps } from "./phi-layout-view-model";
import type { PhiRenderableBlockAnchor } from "../../types";
import type { PhiAnchorWidgetPlacement } from "../controls/phi-anchor-control-contract";
import type { PhiResolvedResponsiveValue, PhiResponsiveValue } from "../../types/responsive";
import {
  PHI_CONTAINER_BREAKPOINT_COL3,
  PHI_CONTAINER_BREAKPOINT_CONTENT,
} from "../../theme/phi-container-breakpoints";

// The counts live in the contract layer (`constants/grid-columns.ts`), where the config parser reads
// them without pulling a Layout module into `@phis/ui/types`; the Layout keeps offering them here.
import { isPhiGridColumnCount, PHI_GRID_COLUMN_COUNTS, type PhiGridColumnCount } from "../../constants/grid-columns";

export { isPhiGridColumnCount, PHI_GRID_COLUMN_COUNTS, type PhiGridColumnCount };

/**
 * How many slots a row holds when the Grid was never told.
 *
 * The whole row where there is no room to share, two abreast in the middle, four where the Grid is at
 * least as wide as the content column. One constant for all three widths stood here before -- four per
 * row -- and a Grid nobody told never reflowed: four abreast at 320px and at 1600px alike, only
 * narrower.
 */
export const PHI_GRID_LAYOUT_DEFAULT_COLUMNS: PhiResolvedResponsiveValue<PhiGridColumnCount> = {
  compact: 1,
  medium: 2,
  wide: 4,
};

/**
 * A slot that is not one column wide, or does not start where the previous one ended.
 *
 * Both counted in the Grid's columns at that width -- "two columns", "indented by one" -- not in the
 * 24 tracks underneath, which an author had to divide by hand before: three abreast was a span of 8.
 * A width the placement says nothing about is the plain slot there, one column and no indent; it does
 * not inherit from a narrower width, because a column means something else at every width.
 */
export type PhiGridLayoutSlotPlacement = {
  slotIndex: number;
  span?: PhiResponsiveValue<number>;
  offset?: PhiResponsiveValue<number>;
};

export type PhiGridLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  /** The distance between slots, across and down. */
  gap?: CSSProperties["gap"];
  columns?: PhiResponsiveValue<number>;
  slotPlacements?: PhiGridLayoutSlotPlacement[];
  anchor?: PhiRenderableBlockAnchor;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
};

/** The Grid's columns at every width: what was stated where it is a column count, the default elsewhere. */
export function resolvePhiGridColumns(
  columns: PhiResponsiveValue<number> | undefined,
): PhiResolvedResponsiveValue<PhiGridColumnCount> {
  const read = (profile: PhiGridLayoutProfile) => {
    const stated = columns?.[profile];
    return isPhiGridColumnCount(stated) ? stated : PHI_GRID_LAYOUT_DEFAULT_COLUMNS[profile];
  };
  return { compact: read("compact"), medium: read("medium"), wide: read("wide") };
}

/**
 * What a slot spans and skips at one width, in the 24 tracks.
 *
 * Clamped to the row: a slot wider than the row is the row, and an indent that leaves no room is
 * dropped -- a Grid whose columns were reduced keeps its slots rather than losing them.
 */
export function resolvePhiGridSlotPlacement(
  slotPlacements: PhiGridLayoutSlotPlacement[] | undefined,
  slotIndex: number,
  profile: PhiGridLayoutProfile,
  columns: PhiGridColumnCount,
) {
  const placement = slotPlacements?.find((candidate) => candidate.slotIndex === slotIndex);
  const span = Math.max(1, Math.min(columns, placement?.span?.[profile] ?? 1));
  const offset = Math.max(0, Math.min(columns - span, placement?.offset?.[profile] ?? 0));
  const tracks = 24 / columns;
  return { span: span * tracks, offset: offset * tracks };
}

export type PhiGridSlotColumns = {
  /** The 1-based column line the slot starts on. */
  start: number;
  span: number;
};

/**
 * Where each slot stands on the 24 tracks, in flow.
 *
 * `offset` counts unused tracks before a slot, the way a Grid column's offset does elsewhere, so a
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
  profile: PhiGridLayoutProfile,
  columns: PhiGridColumnCount,
): Map<number, PhiGridSlotColumns> {
  const resolved = new Map<number, PhiGridSlotColumns>();
  let cursor = 1;

  for (const slotIndex of slotIndices) {
    const { span, offset } = resolvePhiGridSlotPlacement(slotPlacements, slotIndex, profile, columns);
    let start = cursor + offset;
    if (start + span - 1 > 24) {
      start = 1 + offset;
    }
    resolved.set(slotIndex, { start, span });
    cursor = start + span;
    if (cursor > 24) {
      cursor = 1;
    }
  }

  return resolved;
}

export type PhiGridLayoutProfile = keyof PhiResolvedResponsiveValue<number>;

export const PHI_GRID_LAYOUT_PROFILES: readonly PhiGridLayoutProfile[] = ["compact", "medium", "wide"];

/**
 * Where a Grid stops being `compact` and where it becomes `wide`, measured on its own box.
 *
 * The house pair a Form switches at (LAYOUTING.md, "Grid slot placement"): three columns fit from
 * 377, and from 610 the Grid is as wide as the content column ever gets. It read Ant Design's device
 * numbers before, 576 and 992, and for one afternoon 610 and 987 -- both put `medium` out of reach of
 * the content column, whose Grid measures the column minus its padding.
 *
 * The comparison is made by the `@container phi-grid` queries in `styles/layout.css`, and these are the
 * same numbers; `validate-container-breakpoint-contracts.ts` holds the two together.
 */
export const PHI_GRID_RESPONSIVE_MIN_WIDTH = {
  medium: PHI_CONTAINER_BREAKPOINT_COL3,
  wide: PHI_CONTAINER_BREAKPOINT_CONTENT,
} as const;

/**
 * Where each slot stands at every width, answered at once.
 *
 * The profile was measured in JavaScript before, which the server cannot do: every Grid was delivered
 * at `compact` -- each slot a whole row -- and rebuilt after hydration, a shift on every page that held
 * one. All three answers are known without measuring anything, so all three go into the markup and a
 * container query picks one (`styles/layout.css`), the way the Form grid does.
 */
export function resolvePhiGridSlotProfileColumns(
  slotPlacements: PhiGridLayoutSlotPlacement[] | undefined,
  slotIndices: readonly number[],
  columns: PhiResolvedResponsiveValue<PhiGridColumnCount> = PHI_GRID_LAYOUT_DEFAULT_COLUMNS,
): Map<number, PhiResolvedResponsiveValue<PhiGridSlotColumns>> {
  const [compact, medium, wide] = PHI_GRID_LAYOUT_PROFILES.map((profile) => resolvePhiGridSlotColumns(
    slotPlacements,
    slotIndices,
    profile,
    columns[profile],
  ));
  const resolved = new Map<number, PhiResolvedResponsiveValue<PhiGridSlotColumns>>();
  for (const slotIndex of slotIndices) {
    const byProfile = {
      compact: compact?.get(slotIndex),
      medium: medium?.get(slotIndex),
      wide: wide?.get(slotIndex),
    };
    if (byProfile.compact && byProfile.medium && byProfile.wide) {
      resolved.set(slotIndex, byProfile as PhiResolvedResponsiveValue<PhiGridSlotColumns>);
    }
  }
  return resolved;
}

/**
 * How much of the column gap falls before and after a slot, in 24ths of it.
 *
 * The gap is not a `column-gap`. A `column-gap` falls between all 24 tracks, whether or not a slot
 * boundary stands there, so a Grid with a 16px gap could not be narrower than 23 x 16 = 368px and ran
 * over its box below that -- in a sider, a dialog, the Inspector. The tracks are flush instead, and each
 * slot insets its content by its share of the gaps: a slot starting on line `s` and spanning `n` tracks
 * gives up `s - 1` 24ths of a gap before it and `25 - s - n` after. That is exactly where a `column-gap`
 * put the slot's edges -- `(s - 1)(W + g) / 24` to `(s - 1 + n)(W + g) / 24 - g` for a box `W` wide --
 * so a Grid with room looks as it did, and one without room narrows its slots rather than overflowing.
 * Between two slots in a row the two shares add up to one whole gap.
 */
export function resolvePhiGridSlotGapShares(columns: PhiGridSlotColumns, trackCount = 24) {
  return {
    lead: columns.start - 1,
    trail: Math.max(0, trackCount + 1 - columns.start - columns.span),
  };
}

/**
 * The custom properties a slot carries: its columns and gap shares at every width.
 *
 * `styles/layout.css` (`.phi-grid-layout__slot`) reads the `compact` set by default and the other two
 * under the Grid's container queries.
 */
export function resolvePhiGridSlotColumnProperties(
  columns: PhiResolvedResponsiveValue<PhiGridSlotColumns> | undefined,
): Record<`--phi-grid-slot-${string}`, string> {
  if (columns == null) return {};
  const properties: Record<`--phi-grid-slot-${string}`, string> = {};
  for (const profile of PHI_GRID_LAYOUT_PROFILES) {
    const placement = columns[profile];
    const shares = resolvePhiGridSlotGapShares(placement);
    properties[`--phi-grid-slot-columns-${profile}`] = `${placement.start} / span ${placement.span}`;
    properties[`--phi-grid-slot-lead-${profile}`] = String(shares.lead);
    properties[`--phi-grid-slot-trail-${profile}`] = String(shares.trail);
  }
  return properties;
}
