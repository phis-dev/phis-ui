"use client";

import { useMemo, useState } from "react";
import type { PhiTimelineEntry } from "@phis/contracts/timeline";

import type { PhiTimelineTimeFormat, PhiTimelineWidgetConfig } from "./config";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { createPhiSignalAddress } from "../../../../../types/signals";
import { isPhiRecord } from "../../../../../helpers/is-record";
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
  /*
   * Params a signal chose, over the stored ones. Kept with the binding they were chosen for, so a
   * Provider changed in the Inspector starts from its own stored params again.
   */
  const storedBinding = config?.entriesProvider ?? null;
  const [chosen, setChosen] = useState<{ providerKey: string; params: Record<string, unknown> } | null>(null);
  const binding = useMemo(() => storedBinding
    ? {
        ...storedBinding,
        params: chosen?.providerKey === storedBinding.providerKey
          ? { ...storedBinding.params, ...chosen.params }
          : storedBinding.params,
      }
    : null, [chosen, storedBinding]);
  const provided = usePhiTimelineProviderEntries(binding);
  usePhiControlSignalController<string>({
    key: config?.key ?? "timeline",
    sender: blockId == null ? null : createPhiSignalAddress("cms", blockId),
    signalRoutes: config?.signalRoutes,
    typeKey: "timeline-reload",
    onReceiveCapability: (capabilityId, signal) => {
      if (capabilityId === "reload") {
        provided.reload();
        return true;
      }
      if (capabilityId === "bindingParamsChange" && storedBinding && isPhiRecord(signal.value)) {
        const params = (signal.value as Record<string, unknown>).params;
        if (!isPhiRecord(params)) return false;
        setChosen((current) => ({
          providerKey: storedBinding.providerKey,
          params: {
            ...(current?.providerKey === storedBinding.providerKey ? current.params : {}),
            ...(params as Record<string, unknown>),
          },
        }));
        return true;
      }
      return false;
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
