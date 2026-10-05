import { isPhiRecord } from "../helpers/is-record";
import type { ReactNode } from "react";

import type { PhiControlSize, PhiControlVariant } from "./control";
import type { PhiRuntimeModuleId } from "./cms-module-descriptors";

export type PhiCalendarSystemId = string;
export type PhiCalendarAdapterKey = `${string}/calendars/${string}`;
export type PhiCalendarPrecision = "date" | "datetime" | "week" | "month" | "quarter" | "year";
export type PhiCalendarSelectionMode = "single" | "range" | "multiple";
export type PhiCalendarView = "month" | "week" | "day" | "agenda" | "year";

export type PhiCalendarFields = {
  era?: string;
  year: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
};

export type PhiCalendarDate = {
  calendar: PhiCalendarSystemId;
  isoDate: string;
  calendarFields?: PhiCalendarFields;
};

export type PhiCalendarInstant = {
  instant: string;
  timeZone?: string;
};

export type PhiCalendarLocalDateTime = {
  calendar: PhiCalendarSystemId;
  localDateTime: string;
  timeZone: string;
  instant: string;
  calendarFields?: PhiCalendarFields;
};

export type PhiCalendarPeriod = {
  calendar: PhiCalendarSystemId;
  precision: Exclude<PhiCalendarPrecision, "date" | "datetime">;
  calendarValue: string;
  isoStart: string;
  isoEndExclusive: string;
};

export type PhiTemporalValue =
  | { kind: "date"; value: PhiCalendarDate }
  | { kind: "datetime"; value: PhiCalendarLocalDateTime }
  | { kind: "period"; value: PhiCalendarPeriod };

export type PhiTemporalSelection =
  | { mode: "single"; value: PhiTemporalValue | null }
  | { mode: "range"; start: PhiTemporalValue | null; end: PhiTemporalValue | null }
  | { mode: "multiple"; values: readonly PhiTemporalValue[] };

export type PhiCalendarDisabledDateRule =
  | { kind: "before" | "after" | "date"; date: PhiCalendarDate }
  | { kind: "range"; start: PhiCalendarDate; end: PhiCalendarDate }
  | { kind: "weekday"; weekdays: readonly number[] };

export type PhiCalendarEvent = {
  id: string;
  title: string;
  description?: string;
  status?: string;
  icon?: string;
  color?: string;
  resourceIds?: readonly string[];
  occurrenceId?: string;
  seriesId?: string;
} & (
  | {
      allDay: true;
      startDate: PhiCalendarDate;
      endDateExclusive: PhiCalendarDate;
    }
  | {
      allDay: false;
      start: PhiCalendarInstant;
      end: PhiCalendarInstant;
    }
);

export type PhiCalendarViewport = {
  view: PhiCalendarView;
  calendar: PhiCalendarSystemId;
  timeZone: string;
  isoStart: string;
  isoEndExclusive: string;
};

export type PhiCalendarEventChange = {
  operation: "move" | "resize";
  eventId: string;
  occurrenceId?: string;
  previousStart: string;
  previousEnd: string;
  requestedStart: string;
  requestedEnd: string;
};

export type PhiCalendarAdapterCapabilities = {
  date: boolean;
  week: boolean;
  month: boolean;
  quarter: boolean;
  year: boolean;
  time: boolean;
  range: boolean;
};

export type PhiCalendarAdapterDescriptor = {
  key: PhiCalendarAdapterKey;
  ownerModuleId: PhiRuntimeModuleId;
  calendarSystem: PhiCalendarSystemId;
  title: string;
  description?: string;
  capabilities: PhiCalendarAdapterCapabilities;
};

export type PhiCalendarAdapterDatePickerProps = {
  selection: PhiTemporalSelection;
  selectionMode: PhiCalendarSelectionMode;
  precision: PhiCalendarPrecision;
  showTime?: boolean;
  timeZone: string;
  format?: string;
  min?: PhiCalendarDate;
  max?: PhiCalendarDate;
  disabledDateRules?: readonly PhiCalendarDisabledDateRule[];
  disabled?: boolean;
  readOnly?: boolean;
  allowClear?: boolean;
  placeholder?: string;
  rangePlaceholders?: readonly [string, string];
  controlSize?: PhiControlSize;
  variant?: PhiControlVariant;
  /**
   * The id of the element that names the picker, for its input's `aria-labelledby`. The label is drawn
   * by the Control around the picker, so the adapter cannot know it otherwise.
   */
  ariaLabelledBy?: string;
  onChange?: (selection: PhiTemporalSelection) => void;
};

export type PhiCalendarAdapterCalendarProps = {
  value: PhiCalendarDate | null;
  view: "month" | "year";
  timeZone: string;
  events: readonly PhiCalendarEvent[];
  disabled?: boolean;
  showWeekNumbers?: boolean;
  onSelect?: (value: PhiCalendarDate) => void;
  onViewportChange?: (viewport: Omit<PhiCalendarViewport, "timeZone">) => void;
  onEventActivate?: (event: PhiCalendarEvent) => void;
};

export type PhiCalendarAdapterClient = {
  key: PhiCalendarAdapterKey;
  calendarSystem: PhiCalendarSystemId;
  renderDatePicker: (props: PhiCalendarAdapterDatePickerProps) => ReactNode;
  renderCalendar: (props: PhiCalendarAdapterCalendarProps) => ReactNode;
};

export type PhiCalendarAdapterClientDefinition = {
  key: PhiCalendarAdapterKey;
  ownerModuleId: PhiRuntimeModuleId;
  load: () => Promise<PhiCalendarAdapterClient>;
};

export function isPhiCalendarAdapterKey(value: unknown): value is PhiCalendarAdapterKey {
  return typeof value === "string" && /^@[^/]+\/[^/]+(?:\/modules\/[^/]+)?\/calendars\/[^/]+$/.test(value);
}

export function isPhiIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isPhiIsoTime(value: unknown): value is string {
  return typeof value === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?$/.test(value);
}

export function isPhiCalendarDate(value: unknown): value is PhiCalendarDate {
  if (!isPhiRecord(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.calendar === "string" && candidate.calendar.length > 0 && isPhiIsoDate(candidate.isoDate);
}

export function isPhiCalendarDisabledDateRule(value: unknown): value is PhiCalendarDisabledDateRule {
  if (!isPhiRecord(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.kind === "before" || candidate.kind === "after" || candidate.kind === "date") {
    return isPhiCalendarDate(candidate.date);
  }
  if (candidate.kind === "range") {
    return isPhiCalendarDate(candidate.start) && isPhiCalendarDate(candidate.end);
  }
  return candidate.kind === "weekday" && Array.isArray(candidate.weekdays) &&
    candidate.weekdays.every((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6);
}

export function isPhiTemporalSelection(value: unknown): value is PhiTemporalSelection {
  if (!isPhiRecord(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.mode === "single") return candidate.value === null || isPhiTemporalValue(candidate.value);
  if (candidate.mode === "range") {
    return (candidate.start === null || isPhiTemporalValue(candidate.start)) &&
      (candidate.end === null || isPhiTemporalValue(candidate.end));
  }
  return candidate.mode === "multiple" && Array.isArray(candidate.values) && candidate.values.every(isPhiTemporalValue);
}

export function isPhiCalendarViewport(value: unknown): value is PhiCalendarViewport {
  if (!isPhiRecord(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.calendar === "string" && candidate.calendar.length > 0 &&
    typeof candidate.timeZone === "string" && candidate.timeZone.length > 0 &&
    typeof candidate.view === "string" &&
    ["month", "week", "day", "agenda", "year"].includes(candidate.view) &&
    isPhiIsoDate(candidate.isoStart) && isPhiIsoDate(candidate.isoEndExclusive);
}

export function isPhiCalendarEvent(value: unknown): value is PhiCalendarEvent {
  if (!isPhiRecord(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || !candidate.id ||
    typeof candidate.title !== "string" || typeof candidate.allDay !== "boolean") {
    return false;
  }
  if (candidate.allDay) {
    return isPhiCalendarDate(candidate.startDate) && isPhiCalendarDate(candidate.endDateExclusive);
  }
  const start = candidate.start as Record<string, unknown> | null;
  const end = candidate.end as Record<string, unknown> | null;
  return !!start && !!end && typeof start.instant === "string" && !Number.isNaN(Date.parse(start.instant)) &&
    typeof end.instant === "string" && !Number.isNaN(Date.parse(end.instant));
}

export function isPhiTemporalValue(value: unknown): value is PhiTemporalValue {
  if (!isPhiRecord(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.kind === "date") return isPhiCalendarDate(candidate.value);
  if (candidate.kind === "datetime") {
    const dateTime = candidate.value as Record<string, unknown> | null;
    return !!dateTime && typeof dateTime.calendar === "string" &&
      typeof dateTime.localDateTime === "string" && typeof dateTime.timeZone === "string" &&
      typeof dateTime.instant === "string";
  }
  if (candidate.kind === "period") {
    const period = candidate.value as Record<string, unknown> | null;
    return !!period && typeof period.calendar === "string" && typeof period.calendarValue === "string" &&
      typeof period.isoStart === "string" && typeof period.isoEndExclusive === "string";
  }
  return false;
}

/*
 * Which calendar days an event covers, as ISO dates in the calendar's time zone.
 *
 * A calendar cell is a date, not an instant, and comparing an event's instant against a cell's local
 * midnight mixed two zones: the calendar's, and the browser's the cell was created in. An event at 23:30
 * in Zurich landed on the next day for a visitor in New York. Dates compared as dates, both read in the
 * calendar's zone, cannot drift. A timed event covers every day from the one it starts on to the one it
 * ends on -- one that ends exactly at midnight does not reach into the next day.
 */
const phiCalendarZoneDateFormatters = new Map<string, Intl.DateTimeFormat>();

function readPhiCalendarZoneDate(instant: string, timeZone: string) {
  let formatter = phiCalendarZoneDateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    phiCalendarZoneDateFormatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
  );
  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    atMidnight: parts.hour === "00" && parts.minute === "00" && parts.second === "00",
  };
}

function addPhiIsoDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolvePhiCalendarEventDays(
  event: PhiCalendarEvent,
  timeZone: string,
): { isoStart: string; isoEndExclusive: string } {
  if (event.allDay) {
    return { isoStart: event.startDate.isoDate, isoEndExclusive: event.endDateExclusive.isoDate };
  }
  const start = readPhiCalendarZoneDate(event.start.instant, timeZone);
  const end = readPhiCalendarZoneDate(event.end.instant, timeZone);
  const lastDay = end.atMidnight && end.isoDate > start.isoDate ? addPhiIsoDays(end.isoDate, -1) : end.isoDate;
  return {
    isoStart: start.isoDate,
    isoEndExclusive: addPhiIsoDays(lastDay > start.isoDate ? lastDay : start.isoDate, 1),
  };
}

/** Whether an event is shown on the calendar day `isoDate`, both read in `timeZone`. */
export function phiCalendarEventFallsOnDate(event: PhiCalendarEvent, isoDate: string, timeZone: string) {
  const days = resolvePhiCalendarEventDays(event, timeZone);
  return isoDate >= days.isoStart && isoDate < days.isoEndExclusive;
}

/**
 * The days a month panel shows: whole weeks from the one the month starts in, six of them, because the
 * panel always draws six rows. Asking for the month alone left the leading and trailing days of the
 * neighbouring months empty although they are on screen. `weekStart` is the panel's first weekday
 * (0 = Sunday), `isoMonthStart` the first of the month.
 */
export function resolvePhiCalendarMonthPanelDays(isoMonthStart: string, weekStart: number) {
  const weekday = new Date(`${isoMonthStart}T00:00:00Z`).getUTCDay();
  const isoStart = addPhiIsoDays(isoMonthStart, -((weekday - weekStart + 7) % 7));
  return { isoStart, isoEndExclusive: addPhiIsoDays(isoStart, 42) };
}
