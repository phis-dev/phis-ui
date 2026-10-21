"use client";

import { lazy, Suspense } from "react";

import type { PhiTimelineTone } from "@phis/contracts/timeline";

export type PhiTimelineControlItem = {
  key: string;
  title?: string;
  content: string;
  /**
   * When it happened, already in words. The Control does not format a date: the Widget or the Module
   * reading the record knows the locale and how precise the moment has to be.
   */
  time?: string;
  /** A Phi icon name, drawn in place of the dot. */
  icon?: string;
  /** What the entry's mark says about it; the Theme decides the colour. Absent is the primary mark. */
  tone?: PhiTimelineTone;
  /** Still under way: the mark spins. Ant Design's `pending` is this, on an entry of its own. */
  pending?: boolean;
};

export type PhiTimelineControlProps = {
  items: readonly PhiTimelineControlItem[];
  /** Which side the entries stand on; `alternate` takes turns. */
  placement?: "start" | "end" | "alternate";
  ariaLabel?: string;
};

const PhiTimelineControlAdapter = lazy(() =>
  import("./phi-timeline-control-adapter")
    .then((module) => ({ default: module.PhiTimelineControlAdapter })));

/**
 * What happened, in order: a ticket's history, the revisions of a Page, the stages of an order.
 *
 * A Control of its own rather than a pass-through: Ant Design's entries take nodes and free colours, and
 * a Timeline here is a record a Widget stores or a Module reads, so its entries are words and tones.
 * The time stands in Ant Design's title column when the entry has no title of its own, and in front of
 * the title otherwise -- one column, so that `alternate` still has a side to put it on.
 *
 * Until the primitive has loaded, the entries stand there as a plain list, in the same words.
 */
export function PhiTimelineControl(props: PhiTimelineControlProps) {
  const fallback = (
    <ol aria-label={props.ariaLabel} style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {props.items.map((item) => (
        <li key={item.key}>
          {[item.time, item.title, item.content].filter(Boolean).join(" · ")}
        </li>
      ))}
    </ol>
  );
  return (
    <Suspense fallback={fallback}>
      <PhiTimelineControlAdapter {...props} />
    </Suspense>
  );
}
