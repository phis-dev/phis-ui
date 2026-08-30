"use client";

import { useState } from "react";

import { PhiRateControl } from "../../../../../components/controls/phi-rate-control";
import {
  normalizePhiRateCount,
  normalizePhiRateValue,
} from "../../../../../components/controls/phi-rate-control-contract";
import type { PhiRateWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";

export type PhiRateWidgetProps = {
  config?: PhiRateWidgetConfig | null;
  blockId?: string | number | null;
  value?: number;
  disabled?: boolean;
  readOnly?: boolean;
  signalsEnabled?: boolean;
  onChange?: (value: number) => void;
};

export function PhiRateWidget({
  config,
  value: controlledValue,
  disabled,
  readOnly,
  signalsEnabled = true,
  onChange,
}: PhiRateWidgetProps) {
  const count = normalizePhiRateCount(config?.count);
  const allowHalf = config?.allowHalf === true;
  const fallbackValue = normalizePhiRateValue(
    controlledValue ?? config?.value,
    count,
    allowHalf,
  );
  const [state, setState] = useState(() => ({ source: fallbackValue, value: fallbackValue }));
  const value = state.source === fallbackValue ? state.value : fallbackValue;
  const resolvedReadOnly = readOnly ?? config?.readOnly === true;
  const controlSignals = usePhiControlSignalController<number>({
    key: config?.key ?? "rate",
    signalRoutes: config?.signalRoutes,
    valueType: "number",
    typeKey: "rate",
    signalsEnabled,
    initialDisabled: disabled ?? config?.disabled === true,
    initialReadOnly: resolvedReadOnly,
    clearValue: 0,
    onSetValue: (nextValue) => setState({
      source: fallbackValue,
      value: normalizePhiRateValue(nextValue, count, allowHalf),
    }),
    coerceValue: (nextValue) =>
      typeof nextValue === "number" && Number.isFinite(nextValue)
        ? normalizePhiRateValue(nextValue, count, allowHalf)
        : null,
  });

  function publish(nextValue: number) {
    if (controlSignals.readOnly) {
      return;
    }

    const normalizedValue = normalizePhiRateValue(nextValue, count, allowHalf);
    setState({ source: fallbackValue, value: normalizedValue });
    onChange?.(normalizedValue);
    controlSignals.emitChange(normalizedValue);
  }

  return (
    <PhiRateControl
      value={value}
      count={count}
      allowHalf={allowHalf}
      allowClear={config?.allowClear}
      icon={config?.icon}
      label={config?.label}
      description={config?.description}
      size={config?.controlSize}
      disabled={disabled || controlSignals.disabled}
      readOnly={controlSignals.readOnly}
      onChange={publish}
    />
  );
}
