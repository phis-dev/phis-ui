import { createPhiModuleScopedKey } from "../constants/runtime-module-ownership";
import type { PhiCalendarAdapterKey } from "./calendar";

/**
 * The Core calendar system's adapter key, apart from the calendar contract.
 *
 * The shared Client manifest names the Gregorian adapter on every page, and while the key lived in
 * `calendar.ts` it brought the calendar validators and tag readers into pages that show no calendar.
 */
export const PHI_GREGORY_CALENDAR_ADAPTER_KEY =
  createPhiModuleScopedKey("calendars", "gregory") satisfies PhiCalendarAdapterKey;
