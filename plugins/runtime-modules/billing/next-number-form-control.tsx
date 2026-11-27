"use client";

import type { PhiFormFieldProviderProps } from "../../../components/forms/form-provider-registry";
import { PhiTypographyControl } from "../../../components/controls/phi-typography-control";

/**
 * The next number of a series, read-only (`forms.ts`): the one option the `nextNumber` Provider answered
 * for the template and reset the Form holds -- the number, or, disabled, the rule the template breaks --
 * or, on a Form without that Provider, the number the series' record holds. Nothing yet: a dash.
 */
export function PhiBillingNextNumberFormControl({ field, options, value }: PhiFormFieldProviderProps) {
  const answer = field.optionsProvider ? options?.[0] : undefined;
  const shown = answer ? answer.label : typeof value === "string" && value ? value : null;
  const refused = answer?.disabled === true;
  return (
    <PhiTypographyControl
      code={shown != null && !refused}
      type={refused ? "danger" : shown == null ? "secondary" : undefined}
      // As tall as the label beside it, which the Form makes as tall as a control, so the two read as one line.
      style={{ display: "inline-flex", alignItems: "center", minHeight: "var(--phi-form-label-min-height)", margin: 0 }}
    >
      {shown ?? "—"}
    </PhiTypographyControl>
  );
}
