"use client";

import { Divider } from "antd";
import type { DividerProps } from "antd";

/**
 * A rule between two things inside one Widget or Layout.
 *
 * A pass-through. Across the tree it is asked for `style`, `dashed`, `size` and occasionally a label
 * through `plain` with children -- nothing that wants a platform vocabulary.
 *
 * **Not the separator between Regions.** A Region draws its own edge through `border`, and a Region
 * without one configured renders none ([LAYOUTING.md](../../LAYOUTING.md)). A Divider drawn inside a
 * Widget to stand in for that is a line the Site cannot turn off, which is why the one in the footer
 * Widget goes away with it rather than being carried over.
 */
export type PhiDividerControlProps = DividerProps;

export function PhiDividerControl(props: PhiDividerControlProps) {
  return <Divider {...props} />;
}
