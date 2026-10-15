"use client";

import type { PhiTimelineEntry } from "@phis/contracts/timeline";

import type { PhiTimelineTimeFormat, PhiTimelineWidgetConfig } from "./config";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { createPhiSignalAddress } from "../../../../../types/signals";
import { formatPhiDate, formatPhiDateTime, formatPhiRelativeTime } from "../../../../../helpers/format-date-time";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiTimelineControl, type PhiTimelineControlItem } from "../../../../../components/controls/phi-timeline-control";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiTimelineProviderEntries } from "../../../../../components/widgets/client/shared/phi-timeline-provider";

function formatEntryTime(entry: PhiTimelineEntry, format: PhiTimelineTimeFormat, locale: string) {
  /* Words the entry states are shown as written; a date is formatted for the reader. */
  if (entry.time) return entry.time;
  if (!entry.at) return undefined;
  if (format === "relative") return formatPhiRelativeTime(entry.at, locale);
  return format === "datetime" ? formatPhiDateTime(entry.at, locale) : formatPhiDate(entry.at, locale);
}

export function PhiTimelineWidget({
  config,
  blockId,
  locale = "en",
  showProviderErrors = false,
}: {
  config?: PhiTimelineWidgetConfig | null;
  blockId?: PhiCmsInstanceId | null;
  /** The page's locale, which a date is formatted in; never the browser's. */
  locale?: string;
  /** In the Builder an author sees why a Provider answers nothing; a reader sees an empty Timeline. */
  showProviderErrors?: boolean;
}) {
  const provided = usePhiTimelineProviderEntries(config?.entriesProvider ?? null);
  usePhiControlSignalController<string>({
    key: "timelineReload",
    sender: blockId == null ? null : createPhiSignalAddress("cms", blockId),
    signalRoutes: config?.signalRoutes,
    typeKey: "timeline-reload",
    onReceiveCapability: (capabilityId) => {
      if (capabilityId !== "reload") return false;
      provided.reload();
      return true;
    },
  });
  const entries = config?.entriesProvider ? provided.entries : config?.entries ?? [];
  const format = config?.timeFormat ?? "date";
  const items = entries.map((entry): PhiTimelineControlItem => ({
    key: entry.key,
    title: entry.title,
    content: entry.content,
    time: formatEntryTime(entry, format, locale),
    icon: entry.icon,
    tone: entry.tone,
    pending: entry.pending,
  }));

  return (
    <>
      {showProviderErrors && provided.error ? <PhiAlertControl level="warning" showIcon title={provided.error} /> : null}
      <PhiTimelineControl items={items} placement={config?.placement} />
    </>
  );
}
