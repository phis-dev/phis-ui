"use client";

import { Timeline } from "antd";

import { PHI_COLOR } from "../../theme/antd-css-var-contract";
import { PhiIcon } from "../shell/phi-icon";

/**
 * What a Timeline entry's mark says about it, in the words a text tone uses: a word about meaning, so
 * the Theme decides the colour. Absent is the primary mark.
 */
export type PhiTimelineControlTone = "secondary" | "success" | "warning" | "danger";

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
  tone?: PhiTimelineControlTone;
  /** Still under way: the mark spins. Ant Design's `pending` is this, on an entry of its own. */
  pending?: boolean;
};

export type PhiTimelineControlProps = {
  items: readonly PhiTimelineControlItem[];
  /** Which side the entries stand on; `alternate` takes turns. */
  placement?: "start" | "end" | "alternate";
  ariaLabel?: string;
};

/*
 * Ant Design colours four marks by name and takes anything else as a CSS colour. The Theme's own tokens
 * go in as that colour, so a tone follows the Theme the way a text tone does.
 */
const PHI_TIMELINE_TONE_COLOR = {
  secondary: PHI_COLOR.textTertiary,
  success: PHI_COLOR.success,
  warning: PHI_COLOR.warning,
  danger: PHI_COLOR.error,
} satisfies Record<PhiTimelineControlTone, string>;

/**
 * What happened, in order: a ticket's history, the revisions of a Page, the stages of an order.
 *
 * A Control of its own rather than a pass-through: Ant Design's entries take nodes and free colours, and
 * a Timeline here is a record a Widget stores or a Module reads, so its entries are words and tones.
 * The time stands in Ant Design's title column when the entry has no title of its own, and in front of
 * the title otherwise -- one column, so that `alternate` still has a side to put it on.
 */
export function PhiTimelineControl({
  items,
  placement = "start",
  ariaLabel,
}: PhiTimelineControlProps) {
  return (
    <Timeline
      aria-label={ariaLabel}
      mode={placement}
      items={items.map((item) => ({
        key: item.key,
        title: item.title && item.time ? `${item.time} · ${item.title}` : item.title ?? item.time,
        content: item.content,
        icon: item.icon ? <PhiIcon name={item.icon} size="inherit" /> : undefined,
        color: item.tone ? PHI_TIMELINE_TONE_COLOR[item.tone] : undefined,
        loading: item.pending,
      }))}
    />
  );
}
