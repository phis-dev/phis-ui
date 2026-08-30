import { createPhiModuleScopedKey } from "../constants/runtime-module-ownership";
import type { ReactNode } from "react";

import type { PhiControlSize, PhiControlVariant } from "./control";
import type { PhiRuntimeModuleId } from "./cms-module-descriptors";

export type PhiCalendarSystemId = string;
export type PhiCalendarAdapterKey = `${string}/calendars/${string}`;
export const PHI_GREGORY_CALENDAR_ADAPTER_KEY = createPhiModuleScopedKey("calendars", "gregory") satisfies PhiCalendarAdapterKey;
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
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.calendar === "string" && candidate.calendar.length > 0 && isPhiIsoDate(candidate.isoDate);
}

export function isPhiCalendarDisabledDateRule(value: unknown): value is PhiCalendarDisabledDateRule {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
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
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.mode === "single") return candidate.value === null || isPhiTemporalValue(candidate.value);
  if (candidate.mode === "range") {
    return (candidate.start === null || isPhiTemporalValue(candidate.start)) &&
      (candidate.end === null || isPhiTemporalValue(candidate.end));
  }
  return candidate.mode === "multiple" && Array.isArray(candidate.values) && candidate.values.every(isPhiTemporalValue);
}

export function isPhiCalendarViewport(value: unknown): value is PhiCalendarViewport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.calendar === "string" && candidate.calendar.length > 0 &&
    typeof candidate.timeZone === "string" && candidate.timeZone.length > 0 &&
    typeof candidate.view === "string" &&
    ["month", "week", "day", "agenda", "year"].includes(candidate.view) &&
    isPhiIsoDate(candidate.isoStart) && isPhiIsoDate(candidate.isoEndExclusive);
}

export function isPhiCalendarEvent(value: unknown): value is PhiCalendarEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
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
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
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
