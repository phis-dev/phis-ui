"use client";

import { Badge, Calendar, DatePicker, Flex, Typography } from "antd";
import type { CalendarProps } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import {
  PHI_GREGORY_CALENDAR_ADAPTER_KEY,
  type PhiCalendarAdapterClient,
  type PhiCalendarAdapterDatePickerProps,
  type PhiCalendarDate,
  type PhiCalendarEvent,
  type PhiCalendarPrecision,
  type PhiTemporalValue,
} from "../../types/calendar";

dayjs.extend(quarterOfYear);
dayjs.extend(utc);
dayjs.extend(timezone);

function toCalendarDate(value: Dayjs): PhiCalendarDate {
  return {
    calendar: "gregory",
    isoDate: value.format("YYYY-MM-DD"),
    calendarFields: {
      year: value.year(),
      month: value.month() + 1,
      day: value.date(),
    },
  };
}

function toTemporalValue(
  value: Dayjs,
  precision: PhiCalendarPrecision,
  timeZone: string,
): PhiTemporalValue {
  if (precision === "datetime") {
    const localDateTime = value.format("YYYY-MM-DDTHH:mm:ss");
    return {
      kind: "datetime",
      value: {
        calendar: "gregory",
        localDateTime,
        timeZone,
        instant: dayjs.tz(localDateTime, timeZone).toISOString(),
        calendarFields: {
          year: value.year(),
          month: value.month() + 1,
          day: value.date(),
          hour: value.hour(),
          minute: value.minute(),
          second: value.second(),
        },
      },
    };
  }
  if (precision === "date") {
    return { kind: "date", value: toCalendarDate(value) };
  }
  const unit = precision === "quarter" ? "quarter" : precision;
  const start = value.startOf(unit);
  const end = precision === "quarter"
    ? start.add(3, "month")
    : precision === "week"
      ? start.add(1, "week")
      : precision === "month"
        ? start.add(1, "month")
        : start.add(1, "year");
  return {
    kind: "period",
    value: {
      calendar: "gregory",
      precision,
      calendarValue: precision === "year" ? value.format("YYYY") : value.format("YYYY-MM-DD"),
      isoStart: start.format("YYYY-MM-DD"),
      isoEndExclusive: end.format("YYYY-MM-DD"),
    },
  };
}

function readDayjsValue(value: PhiTemporalValue | null | undefined) {
  if (!value) return null;
  if (value.kind === "date") return dayjs(value.value.isoDate);
  if (value.kind === "datetime") return dayjs(value.value.localDateTime);
  return dayjs(value.value.isoStart);
}

function isDisabled(value: Dayjs, props: PhiCalendarAdapterDatePickerProps) {
  if (props.min && value.isBefore(props.min.isoDate, "day")) return true;
  if (props.max && value.isAfter(props.max.isoDate, "day")) return true;
  return (props.disabledDateRules ?? []).some((rule) => {
    if (rule.kind === "before") return value.isBefore(rule.date.isoDate, "day");
    if (rule.kind === "after") return value.isAfter(rule.date.isoDate, "day");
    if (rule.kind === "date") return value.isSame(rule.date.isoDate, "day");
    if (rule.kind === "range") {
      return !value.isBefore(rule.start.isoDate, "day") && !value.isAfter(rule.end.isoDate, "day");
    }
    return rule.kind === "weekday" && rule.weekdays.includes(value.day());
  });
}

function renderDatePicker(props: PhiCalendarAdapterDatePickerProps) {
  const picker = props.precision === "datetime" ? "date" : props.precision;
  const common = {
    picker,
    disabled: props.disabled,
    inputReadOnly: props.readOnly,
    allowClear: props.allowClear,
    format: props.format,
    size: props.controlSize,
    variant: props.variant,
    minDate: props.min ? dayjs(props.min.isoDate) : undefined,
    maxDate: props.max ? dayjs(props.max.isoDate) : undefined,
    disabledDate: (value: Dayjs) => isDisabled(value, props),
    style: { width: "100%" },
  } as const;
  if (props.selectionMode === "range") {
    const selection = props.selection.mode === "range"
      ? props.selection
      : { mode: "range" as const, start: null, end: null };
    return (
      <DatePicker.RangePicker
        {...common}
        value={[readDayjsValue(selection.start), readDayjsValue(selection.end)]}
        placeholder={props.rangePlaceholders as [string, string] | undefined}
        showTime={props.precision === "datetime" ? (props.showTime ?? true) : false}
        onChange={(values) => props.onChange?.({
          mode: "range",
          start: values?.[0] ? toTemporalValue(values[0], props.precision, props.timeZone) : null,
          end: values?.[1] ? toTemporalValue(values[1], props.precision, props.timeZone) : null,
        })}
      />
    );
  }
  const multiple = props.selectionMode === "multiple";
  const selectionValues = props.selection.mode === "multiple"
    ? props.selection.values.map(readDayjsValue).filter(Boolean) as Dayjs[]
    : [];
  return (
    <DatePicker
      {...common}
      multiple={multiple}
      value={multiple
        ? selectionValues
        : props.selection.mode === "single"
          ? readDayjsValue(props.selection.value)
          : null}
      placeholder={props.placeholder}
      showTime={props.precision === "datetime" ? (props.showTime ?? true) : false}
      onChange={(value) => {
        const values = Array.isArray(value) ? value : value ? [value] : [];
        props.onChange?.(multiple
          ? {
              mode: "multiple",
              values: values.map((entry) => toTemporalValue(entry, props.precision, props.timeZone)),
            }
          : {
              mode: "single",
              value: values[0] ? toTemporalValue(values[0], props.precision, props.timeZone) : null,
            });
      }}
    />
  );
}

function eventFallsOnDate(event: PhiCalendarEvent, value: Dayjs, timeZone: string) {
  if (event.allDay) {
    return !value.isBefore(event.startDate.isoDate, "day") &&
      value.isBefore(event.endDateExclusive.isoDate, "day");
  }
  return dayjs(event.start.instant).tz(timeZone).isSame(value, "day");
}

function renderCalendar(props: Parameters<PhiCalendarAdapterClient["renderCalendar"]>[0]) {
  const calendarValue = props.value ? dayjs(props.value.isoDate) : undefined;
  const cellRender: CalendarProps<Dayjs>["cellRender"] = (value, info) => {
    if (info.type !== "date") return info.originNode;
    const events = props.events.filter((event) => eventFallsOnDate(event, value, props.timeZone));
    return (
      <Flex vertical gap={2}>
        {events.map((event) => (
          <Typography.Link
            key={`${event.id}:${event.occurrenceId ?? "single"}`}
            onClick={(mouseEvent) => {
              mouseEvent.stopPropagation();
              props.onEventActivate?.(event);
            }}
          >
            <Badge color={event.color} status={event.color ? undefined : "default"} text={event.title} />
          </Typography.Link>
        ))}
      </Flex>
    );
  };
  return (
    <Calendar
      value={calendarValue}
      mode={props.view}
      showWeek={props.showWeekNumbers}
      disabledDate={props.disabled ? () => true : undefined}
      cellRender={cellRender}
      onSelect={(value) => props.onSelect?.(toCalendarDate(value))}
      onPanelChange={(value, mode) => {
        const start = value.startOf(mode);
        props.onViewportChange?.({
          view: mode,
          calendar: "gregory",
          isoStart: start.format("YYYY-MM-DD"),
          isoEndExclusive: start.add(1, mode).format("YYYY-MM-DD"),
        });
      }}
    />
  );
}

export const PHI_GREGORY_CALENDAR_ADAPTER_CLIENT: PhiCalendarAdapterClient = {
  key: PHI_GREGORY_CALENDAR_ADAPTER_KEY,
  calendarSystem: "gregory",
  renderDatePicker,
  renderCalendar,
};
