"use client";

import { useState } from "react";

import { PhiDatePickerControl } from "../../../../../components/controls/phi-date-picker-control";
import { isPhiTemporalSelection, type PhiTemporalSelection } from "../../../../../types/calendar";
import type { PhiDatePickerWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";

function createEmptySelection(mode: PhiDatePickerWidgetConfig["selectionMode"]): PhiTemporalSelection {
  if (mode === "range") return { mode: "range", start: null, end: null };
  if (mode === "multiple") return { mode: "multiple", values: [] };
  return { mode: "single", value: null };
}

export function PhiDatePickerWidget({
  config,
  signalsEnabled = true,
}: {
  config: PhiDatePickerWidgetConfig;
  blockId?: string | number | null;
  signalsEnabled?: boolean;
}) {
  const [selection, setSelection] = useState(config.selection);
  const signals = usePhiControlSignalController<PhiTemporalSelection>({
    key: config.key,
    valueType: "json",
    signalRoutes: config.signalRoutes,
    signalsEnabled,
    initialDisabled: config.disabled,
    initialReadOnly: config.readOnly,
    clearValue: createEmptySelection(config.selectionMode),
    onSetValue: setSelection,
    onClear: () => setSelection(createEmptySelection(config.selectionMode)),
    coerceValue: (value) => isPhiTemporalSelection(value) ? value : null,
  });
  return (
    <PhiDatePickerControl
      adapterKey={config.calendarAdapterKey}
      label={config.label}
      selection={selection}
      selectionMode={config.selectionMode}
      precision={config.precision}
      showTime={config.showTime}
      timeZone={config.timeZone}
      format={config.format}
      min={config.min}
      max={config.max}
      disabledDateRules={config.disabledDateRules}
      disabled={signals.disabled}
      readOnly={signals.readOnly}
      allowClear={config.allowClear}
      placeholder={config.placeholder}
      rangePlaceholders={config.rangePlaceholders}
      controlSize={config.controlSize}
      variant={config.variant}
      onChange={(next) => {
        if (signals.readOnly) return;
        setSelection(next);
        signals.emitCapability("change", next);
      }}
    />
  );
}
