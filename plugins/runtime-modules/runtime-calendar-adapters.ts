import { PHI_GREGORY_CALENDAR_ADAPTER_KEY, type PhiCalendarAdapterDescriptor } from "../../types/calendar";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./core/ids";

export const PHI_CORE_CALENDAR_ADAPTER_DESCRIPTORS = [{
  key: PHI_GREGORY_CALENDAR_ADAPTER_KEY,
  ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
  calendarSystem: "gregory",
  title: "Gregorian",
  capabilities: {
    date: true,
    week: true,
    month: true,
    quarter: true,
    year: true,
    time: true,
    range: true,
  },
}] as const satisfies readonly PhiCalendarAdapterDescriptor[];
