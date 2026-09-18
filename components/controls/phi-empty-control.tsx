"use client";

import type { ReactNode } from "react";
import { Empty } from "antd";

/**
 * Nothing to show, said on purpose.
 *
 * Not a failure and not a wait: the request arrived, the answer was none. A failure is
 * `PhiAlertControl`, which says something went wrong and can be retried, and a wait is
 * `PhiSkeletonControl` or `PhiSpinControl`. Reaching for this one to report an error turns a broken
 * call into an ordinary state, which is exactly the reading a person should not be given.
 *
 * **One picture, not a choice.** Ant Design ships two, and the eight sites this replaced split five to
 * three between them with no rule behind the split -- two sibling collection bindings drew different
 * ones into the same slot. The quiet line wins everywhere: an empty list is the most ordinary thing a
 * page can report, and the large illustration spends the vertical space and the attention of an event,
 * which this is not. Absence is stated, not announced. That makes it a platform decision rather than a
 * per-surface one, so there is no prop for it.
 *
 * **`description` omitted means no text, not Ant Design's default.** The primitive falls back to a
 * hard-coded English "No Data" when the prop is missing, and distinguishes that from `description={false}`,
 * which draws the picture alone. Two spellings of absence, one of which is an untranslated string in a
 * product where every other label comes from a label set -- so the Control keeps one: say what is
 * missing, or say nothing. No site ever wanted "No Data", and now no site can arrive at it by leaving a
 * prop out.
 */
export type PhiEmptyControlProps = {
  /** What is missing. Omitted draws the picture alone. */
  description?: ReactNode;
};

export function PhiEmptyControl({ description }: PhiEmptyControlProps) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description ?? false} />;
}
