"use client";

/*
 * Ant Design's Timeline, behind `PhiTimelineControl`, which loads this file where a Timeline is drawn.
 */

import { Timeline } from "antd";

import type { PhiTimelineTone } from "@phis/contracts/timeline";

import { PHI_COLOR } from "../../theme/antd-css-var-contract";
import { PhiIcon } from "../shell/phi-icon";
import type { PhiTimelineControlProps } from "./phi-timeline-control";

/*
 * Ant Design colours four marks by name and takes anything else as a CSS colour. The Theme's own tokens
 * go in as that colour, so a tone follows the Theme the way a text tone does.
 */
const PHI_TIMELINE_TONE_COLOR = {
  secondary: PHI_COLOR.textTertiary,
  success: PHI_COLOR.success,
  warning: PHI_COLOR.warning,
  danger: PHI_COLOR.error,
} satisfies Record<PhiTimelineTone, string>;

export function PhiTimelineControlAdapter({
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
