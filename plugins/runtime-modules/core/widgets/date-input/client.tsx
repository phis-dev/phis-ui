"use client";

import { createPhiEmptyTemporalSelection } from "./selection";
import { useState } from "react";

import { PhiDatePickerControl } from "../../../../../components/controls/phi-date-picker-control";
import { isPhiTemporalSelection, type PhiTemporalSelection } from "../../../../../types/calendar";
import {
  type PhiDateInputWidgetConfig,
} from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";

export function PhiDateInputWidget({
  config,
  signalsEnabled = true,
}: {
  config: PhiDateInputWidgetConfig;
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
    clearValue: createPhiEmptyTemporalSelection(config.selectionMode),
    onSetValue: setSelection,
    onClear: () => setSelection(createPhiEmptyTemporalSelection(config.selectionMode)),
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
