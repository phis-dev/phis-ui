import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type {
  PhiCalendarAdapterKey,
  PhiCalendarDate,
  PhiCalendarDisabledDateRule,
  PhiCalendarPrecision,
  PhiCalendarSelectionMode,
  PhiCmsWidgetPlugin,
  PhiTemporalSelection,
} from "../../../../../types";
import {
  PHI_GREGORY_CALENDAR_ADAPTER_KEY,
  isPhiCalendarAdapterKey,
  isPhiCalendarDate,
  isPhiCalendarDisabledDateRule,
  isPhiTemporalSelection,
} from "../../../../../types/calendar";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import { readBoolean, readString } from "../../../../../components/widgets/config/parser-primitives";

export type PhiDatePickerWidgetConfig = PhiControlConfig & {
  label?: string;
  calendarAdapterKey: PhiCalendarAdapterKey;
  selectionMode: PhiCalendarSelectionMode;
  precision: PhiCalendarPrecision;
  selection: PhiTemporalSelection;
  showTime?: boolean;
  timeZone: string;
  format?: string;
  min?: PhiCalendarDate;
  max?: PhiCalendarDate;
  disabledDateRules: PhiCalendarDisabledDateRule[];
  allowClear?: boolean;
  placeholder?: string;
  rangePlaceholders?: readonly [string, string];
  variant?: "outlined" | "filled" | "borderless" | "underlined";
};

const EMPTY_SELECTION: PhiTemporalSelection = { mode: "single", value: null };

function createEmptySelection(mode: PhiCalendarSelectionMode): PhiTemporalSelection {
  if (mode === "range") return { mode: "range", start: null, end: null };
  if (mode === "multiple") return { mode: "multiple", values: [] };
  return EMPTY_SELECTION;
}

function readTimeZone(value: unknown) {
  const timeZone = readString(value);
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function parsePhiDatePickerWidgetConfig(config: Record<string, unknown>): PhiDatePickerWidgetConfig {
  const selectionMode = config.selectionMode === "range" || config.selectionMode === "multiple"
    ? config.selectionMode
    : "single";
  const precision = ["datetime", "week", "month", "quarter", "year"].includes(String(config.precision))
    ? config.precision as PhiCalendarPrecision
    : "date";
  const rangePlaceholders = Array.isArray(config.rangePlaceholders) &&
    config.rangePlaceholders.length === 2 &&
    config.rangePlaceholders.every((value) => typeof value === "string")
    ? config.rangePlaceholders as [string, string]
    : undefined;
  return {
    ...parsePhiControlConfig(config, { key: "date-picker" }),
    label: readString(config.label),
    calendarAdapterKey: isPhiCalendarAdapterKey(config.calendarAdapterKey)
      ? config.calendarAdapterKey
      : PHI_GREGORY_CALENDAR_ADAPTER_KEY,
    selectionMode,
    precision,
    selection: isPhiTemporalSelection(config.selection) && config.selection.mode === selectionMode
      ? config.selection
      : createEmptySelection(selectionMode),
    showTime: readBoolean(config.showTime),
    timeZone: readTimeZone(config.timeZone),
    format: readString(config.format),
    min: isPhiCalendarDate(config.min) ? config.min : undefined,
    max: isPhiCalendarDate(config.max) ? config.max : undefined,
    disabledDateRules: Array.isArray(config.disabledDateRules)
      ? config.disabledDateRules.filter(isPhiCalendarDisabledDateRule)
      : [],
    allowClear: readBoolean(config.allowClear),
    placeholder: readString(config.placeholder),
    rangePlaceholders,
    variant: config.variant === "filled" || config.variant === "borderless" || config.variant === "underlined"
      ? config.variant
      : "outlined",
  };
}

export const PHI_DATE_PICKER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("date-picker"),
  typeKey: "date-picker",
  title: "Date Picker",
  description: "Reusable date, period, date-time, and range input.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  runtimeSignals: {
    emits: [{
      id: "change",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.temporalSelection,
    }],
    listens: [
      {
        id: "value",
        channel: "selection",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.temporalSelection,
      },
      { id: "clear", channel: "selection", action: "clear", valueType: "none" },
    ],
  },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "calendarAdapterKey", type: "calendar-adapter", label: "Calendar" },
    { key: "selectionMode", type: "choice", label: "Selection", options: [
      { value: "single", label: "Single" },
      { value: "range", label: "Range" },
      { value: "multiple", label: "Multiple" },
    ] },
    { key: "precision", type: "choice", label: "Precision", options: [
      { value: "date", label: "Date" },
      { value: "datetime", label: "Date and time" },
      { value: "week", label: "Week" },
      { value: "month", label: "Month" },
      { value: "quarter", label: "Quarter" },
      { value: "year", label: "Year" },
    ] },
    { key: "showTime", type: "boolean", label: "Show time", visibleWhen: { field: "precision", equals: "datetime" } },
    { key: "timeZone", type: "string", label: "IANA time zone" },
    { key: "format", type: "string", label: "Format" },
    { key: "allowClear", type: "boolean", label: "Allow clear" },
    { key: "placeholder", type: "string", label: "Placeholder" },
    { key: "variant", type: "choice", label: "Variant", options: [
      { value: "outlined", label: "Outlined" },
      { value: "filled", label: "Filled" },
      { value: "borderless", label: "Borderless" },
      { value: "underlined", label: "Underlined" },
    ] },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "date-picker",
    calendarAdapterKey: PHI_GREGORY_CALENDAR_ADAPTER_KEY,
    selectionMode: "single",
    precision: "date",
    selection: EMPTY_SELECTION,
    timeZone: "UTC",
    allowClear: true,
  },
  parseConfig: parsePhiDatePickerWidgetConfig,
} satisfies Omit<PhiCmsWidgetPlugin<PhiDatePickerWidgetConfig>, "render" | "renderPreview">;

export const PHI_DATE_PICKER_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.DatePicker;
