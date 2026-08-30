"use client";

import { useState } from "react";

import { readPhiDimensionValue, type PhiRenderableBlockSize } from "../../../../../types";
import { PhiDimensionControl } from "../../../../../components/controls/phi-dimension-control";
import type { PhiDimensionWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import type { PhiDimensionWidgetLabels } from "../../../../../components/widgets/label-types/dimension";

export type PhiDimensionWidgetProps = {
  config?: PhiDimensionWidgetConfig | null;
  value?: PhiRenderableBlockSize | null;
  labels?: PhiDimensionWidgetLabels;
  disabled?: boolean;
  readOnly?: boolean;
  signalsEnabled?: boolean;
  onChange?: (value: PhiRenderableBlockSize | null) => void;
};

export function PhiDimensionWidget({
  config,
  value: controlledValue,
  labels,
  disabled,
  readOnly,
  signalsEnabled = true,
  onChange,
}: PhiDimensionWidgetProps) {
  const fallbackValue = controlledValue ?? config?.value ?? null;
  const [state, setState] = useState(() => ({ source: fallbackValue, value: fallbackValue }));
  const value = state.source === fallbackValue ? state.value : fallbackValue;
  const controlSignals = usePhiControlSignalController<PhiRenderableBlockSize | null>({
    key: config?.key ?? "dimension",
    signalRoutes: config?.signalRoutes,
    valueType: "size",
    typeKey: "dimension",
    signalsEnabled,
    initialDisabled: disabled ?? config?.disabled === true,
    initialReadOnly: readOnly ?? config?.readOnly === true,
    clearValue: null,
    onSetValue: (nextValue) => setState({ source: fallbackValue, value: nextValue }),
    onClear: () => setState({ source: fallbackValue, value: null }),
    coerceValue: readPhiDimensionValue,
  });

  function publish(nextValue: PhiRenderableBlockSize | null) {
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
    <PhiDimensionControl
      value={value}
      disabled={controlSignals.disabled}
      readOnly={controlSignals.readOnly}
      size={config?.controlSize}
      widthPlaceholder={labels?.widthPlaceholder}
      heightPlaceholder={labels?.heightPlaceholder}
      onChange={publish}
    />
  );
}
