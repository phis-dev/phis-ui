"use client";

import type { PhiFormFieldProviderProps } from "./form-provider-registry";
import { PhiDatePickerControl } from "../controls/phi-date-picker-control";
import {
  PHI_GREGORY_CALENDAR_ADAPTER_KEY,
  isPhiTemporalSelection,
  type PhiTemporalSelection,
} from "../../types/calendar";

const EMPTY_DATE_TIME_SELECTION: PhiTemporalSelection = { mode: "single", value: null };

function buildSelection(value: unknown, timeZone: string): PhiTemporalSelection {
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) {
    return EMPTY_DATE_TIME_SELECTION;
  }
  const instant = new Date(value).toISOString();
  return {
    mode: "single",
    value: {
      kind: "datetime",
      value: {
        calendar: "gregory",
        localDateTime: instant.slice(0, 19),
        timeZone,
        instant,
      },
    },
  };
}

function readInstant(selection: PhiTemporalSelection): string | null {
  if (selection.mode !== "single" || selection.value?.kind !== "datetime") {
    return null;
  }
  return selection.value.value.instant;
}

/**
 * The shared datetime field provider Control. Its Form value is a normalized ISO-8601 instant
 * string (or null), so descriptor Forms submit plain JSON to flat section endpoints without any
 * client-side payload transformation.
 */
export function PhiDateTimeFormControl({
  field,
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
}: PhiFormFieldProviderProps) {
  const timeZone = typeof field.config?.timeZone === "string" && field.config.timeZone.trim()
    ? field.config.timeZone.trim()
    : "UTC";

  return (
    <PhiDatePickerControl
      adapterKey={PHI_GREGORY_CALENDAR_ADAPTER_KEY}
      selection={buildSelection(value, timeZone)}
      selectionMode="single"
      precision="datetime"
      showTime
      timeZone={timeZone}
      allowClear
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(selection) => {
        if (!isPhiTemporalSelection(selection)) {
          onChange?.(null);
          return;
        }
        onChange?.(readInstant(selection));
      }}
    />
  );
}
