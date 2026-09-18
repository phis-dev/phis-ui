"use client";

import { Statistic } from "antd";
import type { StatisticProps } from "antd";

/**
 * A labelled number.
 *
 * The thinnest of the four, and the one with the weakest case: three neighbouring uses in the Theme
 * inspector, all `title` plus `value`. It is here because the alternative was leaving one primitive
 * permitted by omission for the sake of three lines -- and a rule with an exception nobody can name is
 * the thing this whole effort is undoing.
 *
 * If the Theme inspector is ever reworked, dissolving these into a heading and a line of text would be
 * a fair outcome and this file can go with them.
 */
export type PhiStatisticControlProps = StatisticProps;

export function PhiStatisticControl(props: PhiStatisticControlProps) {
  return <Statistic {...props} />;
}
