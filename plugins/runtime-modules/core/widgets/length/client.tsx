"use client";

import { useState } from "react";

import { readPhiLengthValue, type PhiCssLength } from "../../../../../types";
import { PhiLengthControl } from "../../../../../components/controls/phi-length-control";
import type { PhiLengthWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import type { PhiLengthWidgetLabels } from "../../../../../components/widgets/label-types/length";

export type PhiLengthWidgetProps = {
  config?: PhiLengthWidgetConfig | null;
  value?: PhiCssLength | null;
  labels?: PhiLengthWidgetLabels;
  disabled?: boolean;
  readOnly?: boolean;
  signalsEnabled?: boolean;
  onChange?: (value: PhiCssLength | null) => void;
};

export function PhiLengthWidget({
  config,
  value: controlledValue,
  labels,
  disabled,
  readOnly,
  signalsEnabled = true,
  onChange,
}: PhiLengthWidgetProps) {
  const fallbackValue = controlledValue ?? config?.value ?? null;
  const [state, setState] = useState(() => ({ source: fallbackValue, value: fallbackValue }));
  const value = state.source === fallbackValue ? state.value : fallbackValue;
  const controlSignals = usePhiControlSignalController<PhiCssLength | null>({
    key: config?.key ?? "length",
    signalRoutes: config?.signalRoutes,
    valueType: "length",
    typeKey: "length",
    signalsEnabled,
    initialDisabled: disabled ?? config?.disabled === true,
    initialReadOnly: readOnly ?? config?.readOnly === true,
    clearValue: null,
    onSetValue: (nextValue) => setState({ source: fallbackValue, value: nextValue }),
    onClear: () => setState({ source: fallbackValue, value: null }),
    coerceValue: readPhiLengthValue,
  });

  function publish(nextValue: PhiCssLength | null) {
    if (controlSignals.readOnly) {
      return;
    }
    setState({ source: fallbackValue, value: nextValue });
    onChange?.(nextValue);
    if (nextValue == null) {
      controlSignals.emitClear();
    } else {
      controlSignals.emitChange(nextValue);
    }
  }

  return (
    <PhiLengthControl
      label={config?.label}
      value={value}
      placeholder={config?.placeholder ?? labels?.placeholder}
      min={config?.min}
      max={config?.max}
      step={config?.step}
      precision={config?.precision}
      disabled={controlSignals.disabled}
      readOnly={controlSignals.readOnly}
      size={config?.controlSize}
      onChange={publish}
    />
  );
}
