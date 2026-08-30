"use client";

import { usePhiCalendarAdapterClient } from "../runtime/runtime-module-calendar-adapter-client-manifest";
import type { PhiCalendarAdapterCalendarProps, PhiCalendarAdapterKey } from "../../types/calendar";

export type PhiCalendarControlProps = PhiCalendarAdapterCalendarProps & {
  adapterKey: PhiCalendarAdapterKey;
};

export function PhiCalendarControl({ adapterKey, ...props }: PhiCalendarControlProps) {
  const adapter = usePhiCalendarAdapterClient(adapterKey);
  return adapter.renderCalendar(props);
}
