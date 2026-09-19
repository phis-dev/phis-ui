"use client";

import type { ReactNode } from "react";
import { Descriptions } from "antd";

import { usePhiConfig } from "../root/phi-config-provider";

/**
 * The width a label reserves in a single column, so the values line up under each other.
 *
 * Only a list needs it. A grid already lays its labels out in cells of their own, and a fixed width
 * there would fight the layout rather than help it.
 */
const PHI_DESCRIPTION_LABEL_WIDTH = "7.5rem";

/**
 * What is known about one thing, as named values.
 *
 * **A missing value is a dash, everywhere.** Ant Design draws an empty cell, which reads as a field
 * nobody thought about rather than one with nothing in it. One of the two surfaces this replaced had
 * written that dash itself -- and applied it to four of its nine entries, so in the same grid `path`
 * with nothing in it said "--" while `message` with nothing in it said nothing at all, and `message` is
 * the widest thing on the view. The rule is not per entry and never was.
 *
 * **The label is legible.** The primitive draws it in the tertiary colour at normal weight, which is
 * faint for the thing you have to read in order to know what the value beside it means. One surface had
 * already moved it to secondary at 500 and the other had not. That is a platform decision about reading
 * a record, not a per-surface one.
 *
 * **One column on a phone.** `columns` is what stands side by side from `md` up; below that it is always
 * one, because two columns of short facts on a narrow screen is two columns of wrapped fragments. The
 * primitive takes a fixed number and would have kept the two.
 *
 * That is why a long entry says `full` rather than how many columns it takes. A number would have to
 * agree with a count this Control decides and changes by viewport -- `span={2}` against a single column
 * is a contradiction the primitive reports at runtime and no type can catch. `full` is the sentence the
 * caller actually means: give this one the rest of the line, however many that is.
 *
 * `presentation` is the one axis left to the caller, and the only one this could not settle from the
 * code: a `grid` is a record read closely, with cells and rules -- a log line in an inspector -- and a
 * `list` is a summary read once, under a title, where the ruling would be noise.
 */
export type PhiDescriptionListItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  /** The rest of the line, for a value too long to share it -- a message, a note. */
  full?: boolean;
};

export type PhiDescriptionListControlProps = {
  items: readonly PhiDescriptionListItem[];
  title?: ReactNode;
  /** How many entries stand side by side from `md` up. */
  columns?: number;
  presentation?: "grid" | "list";
};

export function PhiDescriptionListControl({
  items,
  title,
  columns = 1,
  presentation = "list",
}: PhiDescriptionListControlProps) {
  const { token } = usePhiConfig();
  const grid = presentation === "grid";
  return (
    <Descriptions
      title={title}
      bordered={grid}
      size="small"
      column={{ xs: 1, sm: 1, md: columns }}
      styles={{
        label: {
          color: token.colorTextSecondary,
          fontWeight: 500,
          ...(grid ? null : { width: PHI_DESCRIPTION_LABEL_WIDTH }),
        },
        content: { color: token.colorText },
      }}
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        span: item.full ? "filled" : undefined,
        children: item.value == null || item.value === "" ? "—" : item.value,
      }))}
    />
  );
}
