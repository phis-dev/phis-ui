"use client";

import { Spin } from "antd";
import type { SpinProps } from "antd";

/**
 * Something is happening and there is nothing yet to show.
 *
 * A pass-through, and both sites use it with no props at all: a logout in flight and a Media Space
 * still being read.
 *
 * It is the thinner half of a pair. `Skeleton` answers the same question where the shape of what is
 * coming is already known, and nine sites pick its `rows` count by hand -- so when that becomes a
 * Control it may well absorb this one into a single loading contract. Naming it now is what keeps a
 * third spinner from appearing in the meantime.
 */
export type PhiSpinControlProps = SpinProps;

export function PhiSpinControl(props: PhiSpinControlProps) {
  return <Spin {...props} />;
}
