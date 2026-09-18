"use client";

import { Statistic } from "antd";
import type { StatisticProps } from "antd";

/**
 * A labelled number.
 *
 * A pass-through. Its three uses today are neighbouring lines in the Theme inspector, all `title` plus
 * `value`.
 *
 * It has a second caller coming: a Widget of its own, so a Site can put a figure on a page. That is why
 * the Control is worth having rather than dissolving these three into a heading and a line of text --
 * the Widget would have had to decide the same things, and deciding them here means it inherits them
 * instead of inventing them a second time.
 */
export type PhiStatisticControlProps = StatisticProps;

export function PhiStatisticControl(props: PhiStatisticControlProps) {
  return <Statistic {...props} />;
}
