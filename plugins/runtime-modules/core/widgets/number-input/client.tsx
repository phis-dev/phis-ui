"use client";

import { useState } from "react";

import { PhiNumberControl } from "../../../../../components/controls/phi-number-control";
import type { PhiNumberInputWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import type { PhiWidgetControlMode } from "../../../../../types/widget-ui";

export function PhiNumberInputWidget({
  config,
  value: controlledValue,
  disabled,
  readOnly,
  signalsEnabled = true,
  mode = "preview",
  onChange,
}: {
  config?: PhiNumberInputWidgetConfig | null;
  blockId?: string | number | null;
  value?: number | null;
  disabled?: boolean;
  readOnly?: boolean;
  signalsEnabled?: boolean;
  mode?: PhiWidgetControlMode;
  onChange?: (value: number | null) => void;
}) {
  const fallbackValue = controlledValue ?? config?.value ?? null;
  const [state, setState] = useState(() => ({ source: fallbackValue, value: fallbackValue }));
  const value = state.source === fallbackValue ? state.value : fallbackValue;
  const resolvedReadOnly = readOnly ?? config?.readOnly === true;
  const controlSignals = usePhiControlSignalController<number>({
    key: config?.key ?? "number-input",
    signalRoutes: config?.signalRoutes,
    valueType: "number",
    typeKey: "number-input",
    signalsEnabled,
    initialDisabled: disabled ?? config?.disabled === true,
    initialReadOnly: resolvedReadOnly,
    onSetValue: (nextValue) => setState({ source: fallbackValue, value: nextValue }),
    onClear: () => setState({ source: fallbackValue, value: null }),
    coerceValue: (nextValue) =>
      typeof nextValue === "number" && Number.isFinite(nextValue) ? nextValue : null,
  });
  const fill = mode === "control" || mode === "config";

  function publish(nextValue: number | null) {
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
    <PhiNumberControl
      label={config?.label}
      value={value}
      placeholder={config?.placeholder}
      min={config?.min}
      max={config?.max}
      step={config?.step}
      precision={config?.precision}
      disabled={controlSignals.disabled}
      readOnly={controlSignals.readOnly}
      size={config?.controlSize}
      style={{ minWidth: fill ? 0 : 96, width: fill ? "100%" : undefined }}
      onChange={publish}
    />
  );
}
