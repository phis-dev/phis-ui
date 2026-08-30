"use client";

import { useState } from "react";

import { PhiSliderControl } from "../../../../../components/controls/phi-slider-control";
import type { PhiSliderWidgetConfig } from "./config";
import { clampPhiSliderValue } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";

export type PhiSliderWidgetProps = {
  config?: PhiSliderWidgetConfig | null;
  blockId?: string | number | null;
  value?: number;
  disabled?: boolean;
  readOnly?: boolean;
  signalsEnabled?: boolean;
  onChange?: (value: number) => void;
  onChangeComplete?: (value: number) => void;
};

export function PhiSliderWidget({
  config,
  value: controlledValue,
  disabled,
  readOnly,
  signalsEnabled = true,
  onChange,
  onChangeComplete,
}: PhiSliderWidgetProps) {
  const min = config?.min ?? 0;
  const max = config?.max ?? 100;
  const fallbackValue = clampPhiSliderValue(controlledValue ?? config?.value ?? min, min, max);
  const [state, setState] = useState(() => ({ source: fallbackValue, value: fallbackValue }));
  const value = clampPhiSliderValue(
    state.source === fallbackValue ? state.value : fallbackValue,
    min,
    max,
  );
  const resolvedReadOnly = readOnly ?? config?.readOnly === true;
  const controlSignals = usePhiControlSignalController<number>({
    key: config?.key ?? "slider",
    signalRoutes: config?.signalRoutes,
    valueType: "number",
    typeKey: "slider",
    signalsEnabled,
    initialDisabled: disabled ?? config?.disabled === true,
    initialReadOnly: resolvedReadOnly,
    clearValue: min,
    onSetValue: (nextValue) => setState({
      source: fallbackValue,
      value: clampPhiSliderValue(nextValue, min, max),
    }),
    coerceValue: (nextValue) =>
      typeof nextValue === "number" && Number.isFinite(nextValue)
        ? clampPhiSliderValue(nextValue, min, max)
        : null,
  });

  function publish(nextValue: number) {
    if (controlSignals.readOnly) {
      return;
    }

    const normalizedValue = clampPhiSliderValue(nextValue, min, max);
    setState({ source: fallbackValue, value: normalizedValue });
    onChange?.(normalizedValue);
    controlSignals.emitChange(normalizedValue);
  }

  return (
    <PhiSliderControl
      label={config?.label}
      value={value}
      min={min}
      max={max}
      step={config?.step}
      dots={config?.dots}
      included={config?.included}
      reverse={config?.reverse}
      tooltipMode={config?.tooltipMode}
      tooltipSuffix={config?.tooltipSuffix}
      disabled={disabled || controlSignals.disabled}
      readOnly={controlSignals.readOnly}
      style={{ minWidth: 0, width: "100%" }}
      onChange={publish}
      onChangeComplete={onChangeComplete}
    />
  );
}
