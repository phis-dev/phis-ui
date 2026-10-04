import type { PhiResolvedResponsiveValue, PhiResponsiveValue } from "../../types/responsive";
import {
  PHI_GRID_LAYOUT_PROFILES,
  PHI_GRID_RESPONSIVE_MIN_WIDTH,
  isPhiGridColumnCount,
  type PhiGridColumnCount,
  type PhiGridLayoutProfile,
} from "./phi-grid-contract";

/**
 * How many columns a Masonry has when it was never told: one where there is no room to share, two in
 * the middle, three where it is at least as wide as the content column.
 *
 * One number for every width stood here before, so three columns stood in a sider as in the content
 * column, only narrower. The other way to answer the room was a minimum column width, and the renderer
 * then dropped the column count altogether: two fields of which only one ever worked.
 */
export const PHI_MASONRY_LAYOUT_DEFAULT_COLUMNS: PhiResolvedResponsiveValue<PhiGridColumnCount> = {
  compact: 1,
  medium: 2,
  wide: 3,
};

/**
 * Where a Masonry changes its columns, measured on its own box: the Grid's thresholds, so a Masonry and
 * a Grid of the same room answer the same width. `@container phi-masonry` in `styles/layout.css`
 * compares against these; `validate-container-breakpoint-contracts.ts` holds the two together.
 */
export const PHI_MASONRY_RESPONSIVE_MIN_WIDTH = PHI_GRID_RESPONSIVE_MIN_WIDTH;

/** The Masonry's columns at every width: what was stated where it is a column count, the default elsewhere. */
export function resolvePhiMasonryColumns(
  columns: PhiResponsiveValue<number> | undefined,
): PhiResolvedResponsiveValue<PhiGridColumnCount> {
  const read = (profile: PhiGridLayoutProfile) => {
    const stated = columns?.[profile];
    return isPhiGridColumnCount(stated) ? stated : PHI_MASONRY_LAYOUT_DEFAULT_COLUMNS[profile];
  };
  return { compact: read("compact"), medium: read("medium"), wide: read("wide") };
}

/**
 * The custom properties the Masonry's column box reads: its column count at every width and the gap.
 * `styles/layout.css` (`.phi-masonry-layout__columns`) picks the count by the container queries.
 */
export function resolvePhiMasonryColumnProperties(
  columns: PhiResolvedResponsiveValue<PhiGridColumnCount>,
  gap: string,
): Record<`--phi-masonry-${string}`, string> {
  const properties: Record<`--phi-masonry-${string}`, string> = { "--phi-masonry-gap": gap };
  for (const profile of PHI_GRID_LAYOUT_PROFILES) {
    properties[`--phi-masonry-columns-${profile}`] = String(columns[profile]);
  }
  return properties;
}
