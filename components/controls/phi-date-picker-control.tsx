"use client";

import { usePhiCalendarAdapterClient } from "../runtime/runtime-module-calendar-adapter-client-manifest";
import type { PhiCalendarAdapterDatePickerProps, PhiCalendarAdapterKey } from "../../types/calendar";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiDatePickerControlProps = PhiCalendarAdapterDatePickerProps & {
  adapterKey: PhiCalendarAdapterKey;
  label?: string;
};

export function PhiDatePickerControl({ adapterKey, label, ...props }: PhiDatePickerControlProps) {
  const adapter = usePhiCalendarAdapterClient(adapterKey);
  return (
    <PhiLabeledControl label={label} fill>
      {adapter.renderDatePicker(props)}
    </PhiLabeledControl>
  );
}
