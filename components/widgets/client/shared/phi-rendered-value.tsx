"use client";

import type { ReactNode } from "react";

import { formatPhiDate, formatPhiDateTime } from "../../../../helpers/format-date-time";
import type {
  PhiTableTagColor,
  PhiTableTagVariant,
  PhiTableValueRenderer,
} from "../../../../types/table-widget";
import { PhiCheckboxControl } from "../../../controls/phi-checkbox-control";
import { PhiFlexControl } from "../../../controls/phi-flex-control";
import { PhiSwitchControl } from "../../../controls/phi-switch-control";
import { PhiTagControl } from "../../../controls/phi-tag-control";
import { PhiTypographyControl } from "../../../controls/phi-typography-control";
import { PhiLink } from "../../../navigation/phi-link";
import { PhiIcon } from "../../../shell/phi-icon";

/**
 * How one value out of a Provider is drawn: a date as a date, an address as a link, a set of words as
 * tags, a flag as a switch.
 *
 * **It is the table's vocabulary, and it was the table's alone.** A record of the same rows -- the same
 * Provider, the same fields, one row instead of many -- would have had to write every one of these out
 * again, which is how `observability/widgets/log-detail` came to format its own timestamp, pick its own
 * tag colour and stringify its own JSON for nine values the table beside it already knew how to draw.
 * Two implementations of `datetime` are two answers to when something happened.
 */
export type PhiRenderedValueDefinition = {
  renderer?: PhiTableValueRenderer;
  /** What a stored value is called when it is shown -- a status code as a word. */
  valueMap?: Readonly<Record<string, string>>;
  tagColorMap?: Readonly<Record<string, PhiTableTagColor>>;
  tagVariant?: PhiTableTagVariant;
};

/**
 * Where the value stands, which only `json` cares about.
 *
 * A `cell` shares its line with a dozen others and gets one line, so an object is stringified flat. A
 * `block` has the width of a record to itself, so the same object is indented and wrapped -- which is
 * what the log detail wrote by hand as `JSON.stringify(meta, null, 2)` inside a `<pre>`, and the reason
 * it could not have simply called the table's renderer.
 */
export type PhiRenderedValuePresentation = "cell" | "block";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizePhiRenderedText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(normalizePhiRenderedText).filter(Boolean).join(", ");
  return isRecord(value) ? JSON.stringify(value) : "";
}

function resolveTagColor(color: PhiTableTagColor | undefined) {
  return typeof color === "object" ? color.value : color;
}

export function renderPhiValueContent(
  value: unknown,
  definition: PhiRenderedValueDefinition,
  presentation: PhiRenderedValuePresentation = "cell",
): ReactNode {
  if (value == null || value === "") return null;
  const normalizedValue = normalizePhiRenderedText(value);
  const displayValue = definition.valueMap?.[normalizedValue] ?? normalizedValue;
  if (definition.renderer === "email" || definition.renderer === "link") {
    const href = String(value);
    return <PhiLink href={definition.renderer === "email" ? `mailto:${href}` : href}>{displayValue}</PhiLink>;
  }
  if (definition.renderer === "tags") {
    const values = Array.isArray(value) ? value : [value];
    return (
      <PhiFlexControl align="center" gap={4} wrap style={{ display: "inline-flex" }}>
        {values.map((entry, index) => {
          const normalizedEntry = normalizePhiRenderedText(entry);
          return (
            <PhiTagControl
              color={resolveTagColor(definition.tagColorMap?.[normalizedEntry])}
              key={`${normalizedEntry}:${index}`}
              variant={definition.tagVariant ?? "outlined"}
            >
              {definition.valueMap?.[normalizedEntry] ?? normalizedEntry}
            </PhiTagControl>
          );
        })}
      </PhiFlexControl>
    );
  }
  if (definition.renderer === "date" || definition.renderer === "datetime") {
    return definition.renderer === "date" ? formatPhiDate(normalizedValue) : formatPhiDateTime(normalizedValue);
  }
  if (definition.renderer === "json" && presentation === "block") {
    return (
      <PhiTypographyControl code style={{ display: "block", whiteSpace: "pre-wrap" }}>
        {JSON.stringify(value, null, 2)}
      </PhiTypographyControl>
    );
  }
  if (definition.renderer === "json" || definition.renderer === "code") {
    return <PhiTypographyControl code>{displayValue}</PhiTypographyControl>;
  }
  if (definition.renderer === "badge") {
    return (
      <PhiTagControl
        color={resolveTagColor(definition.tagColorMap?.[normalizedValue])}
        variant={definition.tagVariant ?? "outlined"}
      >
        {displayValue}
      </PhiTagControl>
    );
  }
  if (definition.renderer === "switch") return <PhiSwitchControl checked={value === true} readOnly />;
  if (definition.renderer === "checkbox") return <PhiCheckboxControl checked={value === true} readOnly />;
  if (definition.renderer === "icon") return typeof value === "string" && value.trim() ? <PhiIcon name={value} /> : null;
  return displayValue;
}
