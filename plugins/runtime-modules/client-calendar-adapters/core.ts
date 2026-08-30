"use client";

import { PHI_GREGORY_CALENDAR_ADAPTER_KEY, type PhiCalendarAdapterClientDefinition } from "../../../types/calendar";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../core/ids";

export const PHI_CORE_CALENDAR_ADAPTER_CLIENT_DEFINITIONS = [{
  key: PHI_GREGORY_CALENDAR_ADAPTER_KEY,
  ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
  load: () => import("../../../components/calendar/gregory-calendar-adapter-client")
    .then((module) => module.PHI_GREGORY_CALENDAR_ADAPTER_CLIENT),
}] as const satisfies readonly PhiCalendarAdapterClientDefinition[];
