"use client";

import type { PhiTimelineWidgetConfig } from "./config";
import { PhiTimelineControl } from "../../../../../components/controls/phi-timeline-control";

export function PhiTimelineWidget({
  config,
}: {
  config?: PhiTimelineWidgetConfig | null;
  blockId?: string | number | null;
}) {
  return (
    <PhiTimelineControl
      items={config?.entries ?? []}
      placement={config?.placement}
    />
  );
}
