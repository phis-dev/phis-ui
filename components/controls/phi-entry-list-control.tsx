"use client";

import type { ReactNode } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { PhiEmptyControl } from "./phi-empty-control";
import { PhiFlexControl } from "./phi-flex-control";
import { PhiTypographyControl } from "./phi-typography-control";

/**
 * Things you have, one per line: each with a name, a line about it, what state it is in, and the one
 * thing you can do to it.
 *
 * **It stands where antd `List` stood, and it is not a list component.** `List` was a kit -- a
 * responsive card grid built on `Row` and `Col`, pagination, a spinner, an empty state, borders, and two
 * fixed row templates in `Item` and `Item.Meta`. Its replacement `Listy` keeps none of that: it is
 * `items`, `rowKey`, `itemRender`, grouping and virtualisation, which is what a list of ten thousand
 * rows needs and what `List` could never do, because a grid of variable heights cannot say where row
 * four hundred is without drawing the first three hundred and ninety-nine.
 *
 * The four surfaces this replaced wanted neither. They are a handful of rows apiece -- authenticators,
 * linked providers, sessions, uploaded files -- with no scrolling, no paging and nothing to virtualise.
 * What they used from `List` was the row template, which is exactly the part `Listy` drops. So the
 * deprecation is the occasion rather than the instruction: they were never lists, and this Control is
 * the shape they actually share.
 *
 * Provider-backed data pages by contract (`query: { pagination: "offset" }` on the resource), so nothing
 * here scrolls into the thousands. The day a surface genuinely does -- a message history read upwards
 * rather than a page at a time -- that surface makes the case with its own numbers, and it is not this
 * Control.
 *
 * **One action, not a row of them.** `List.Item` took an array; every site passed nothing or one thing.
 * A row with three things you can do to it is a row that should have been a table.
 *
 * **Empty is said, not left blank.** One of the four passed no `emptyText` at all and fell back to Ant
 * Design's hard-coded English -- the same trap `PhiEmptyControl` exists to close, one level up.
 */
export type PhiEntryListEntry = {
  key: string;
  /** What this one is. */
  title: ReactNode;
  /** One line about it: when it was last used, where it came from, what it weighs. */
  description?: ReactNode;
  /** What state it is in, usually a tag. */
  status?: ReactNode;
  /** The one thing you can do to it. */
  action?: ReactNode;
};

export type PhiEntryListControlProps = {
  entries: readonly PhiEntryListEntry[];
  /** What is missing when there are none. */
  emptyDescription?: ReactNode;
};

export function PhiEntryListControl({ entries, emptyDescription }: PhiEntryListControlProps) {
  const { token } = usePhiConfig();

  if (entries.length === 0) {
    return <PhiEmptyControl description={emptyDescription} />;
  }

  return (
    <PhiFlexControl vertical style={{ width: "100%", minWidth: 0 }}>
      {entries.map((entry, index) => (
        <PhiFlexControl
          key={entry.key}
          align="center"
          gap={token.paddingSM}
          style={{
            paddingBlock: token.paddingSM,
            // The rule belongs between two rows, so the first one has nothing above it.
            borderTop: index === 0 ? undefined : `1px solid ${token.colorSplit}`,
          }}
        >
          <PhiFlexControl vertical gap={token.paddingXXS} style={{ flex: 1, minWidth: 0 }}>
            <PhiTypographyControl>{entry.title}</PhiTypographyControl>
            {entry.description ? (
              <PhiTypographyControl type="secondary">{entry.description}</PhiTypographyControl>
            ) : null}
          </PhiFlexControl>
          {entry.status}
          {entry.action}
        </PhiFlexControl>
      ))}
    </PhiFlexControl>
  );
}
