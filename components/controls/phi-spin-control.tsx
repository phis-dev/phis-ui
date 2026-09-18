"use client";

import { Spin } from "antd";
import type { SpinProps } from "antd";

/**
 * Something is happening and there is nothing yet to show.
 *
 * A pass-through, and both sites use it with no props at all: a logout in flight and a Media Space
 * still being read.
 *
 * **It stays beside `Skeleton` rather than being folded into it.** They are not two spellings of "wait":
 * a Skeleton draws the shape of what is coming, so it is only usable where that shape is known and
 * roughly fixed -- a list of rows, a card, a paragraph. Where it is not, a Skeleton has to guess, and a
 * guess that turns out wrong is worse than no preview at all, because the page rearranges itself under
 * somebody who had already started reading it. A spinner claims nothing, and that is the whole of what
 * recommends it.
 *
 * So the question a caller answers is not which one is nicer, it is whether the shape is known.
 */
export type PhiSpinControlProps = SpinProps;

export function PhiSpinControl(props: PhiSpinControlProps) {
  return <Spin {...props} />;
}
