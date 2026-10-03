"use client";

import { usePhiCalendarAdapterClient } from "../runtime/runtime-module-calendar-adapter-client-manifest";
import type { PhiCalendarAdapterDatePickerProps, PhiCalendarAdapterKey } from "../../types/calendar";
import { PhiLabeledControl, usePhiControlLabel } from "./phi-labeled-control";

export type PhiDatePickerControlProps = PhiCalendarAdapterDatePickerProps & {
  adapterKey: PhiCalendarAdapterKey;
  label?: string;
};

export function PhiDatePickerControl({ adapterKey, label, ...props }: PhiDatePickerControlProps) {
  const adapter = usePhiCalendarAdapterClient(adapterKey);
  const { labelId, labelledBy } = usePhiControlLabel(label);
  return (
    <PhiLabeledControl label={label} labelId={labelId} fill>
      {adapter.renderDatePicker({ ...props, ariaLabelledBy: labelledBy })}
    </PhiLabeledControl>
  );
}
