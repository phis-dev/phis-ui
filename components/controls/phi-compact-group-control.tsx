"use client";

import type { CSSProperties, ReactNode } from "react";
import { Space } from "antd";

import type { PhiControlSize } from "../../types/control";

/**
 * Controls joined into one shape: the seam between two of them drawn once instead of twice, and only
 * the outer corners rounded.
 *
 * **It has to be a wrapper around the primitive, and cannot be written here.** Ant Design does this
 * through a React context rather than through CSS: `Space.Compact` puts `isFirstItem`, `isLastItem`,
 * the size and the direction around each child, and ten of its components read that context and emit
 * their own border-collapsing class names -- Button, Input, InputNumber, Select, Cascader, DatePicker,
 * ColorPicker, Dropdown, TreeSelect. A wrapper of our own with negative margins would reach eighty per
 * cent and then break on everything that changes a border: the focus ring, an error state, a disabled
 * edge, an open Select. And it would break per Control, separately.
 *
 * **Two things look like this, and only one of them is a field.**
 *
 * A *compound field* is several Controls holding **one** value, joined so they read as one input: a
 * number and its unit, a width and its style, a range with a start and an end. The seam says the parts
 * belong to each other.
 *
 * A *button group* is several **separate** commands drawn as one bar -- a toolbar, a row of actions.
 * The seam says they are peers, not that they are one thing.
 *
 * **It is not a layout.** Two Controls side by side with air between them is `PhiFlexControl`, and
 * arranging Widgets is the Layout contract. Joining is for things that belong together closely enough
 * that a gap would be a lie.
 */
export type PhiCompactGroupControlProps = {
  children: ReactNode;
  /** Fills the width it is given, for a field that is as wide as its row. */
  block?: boolean;
  /** Sizes every part at once, so a group cannot be assembled from mismatched heights. */
  size?: PhiControlSize;
  /** Stacked rather than side by side, where the seam runs horizontally. */
  vertical?: boolean;
  style?: CSSProperties;
};

export function PhiCompactGroupControl({
  children,
  block,
  size,
  vertical,
  style,
}: PhiCompactGroupControlProps) {
  return (
    <Space.Compact block={block} size={size} vertical={vertical} style={style}>
      {children}
    </Space.Compact>
  );
}
