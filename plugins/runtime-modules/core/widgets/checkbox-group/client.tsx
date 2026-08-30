"use client";

import { useMemo, useState } from "react";

import { PhiCheckboxGroupControl } from "../../../../../components/controls/phi-checkbox-group-control";
import { PhiLabeledControl } from "../../../../../components/controls/phi-labeled-control";
import { usePhiControlOptionsProvider } from "../../../../../components/controls/phi-options-provider";
import type { PhiCheckboxGroupWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";

function equalValues(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function PhiCheckboxGroupWidget({
  config,
  value: controlledValue,
  disabled,
  readOnly,
  signalsEnabled = true,
  onChange,
}: {
  config?: PhiCheckboxGroupWidgetConfig | null;
  blockId?: string | number | null;
  value?: string[];
  disabled?: boolean;
  readOnly?: boolean;
  signalsEnabled?: boolean;
  onChange?: (value: string[]) => void;
}) {
  const resolvedOptions = usePhiControlOptionsProvider({
    options: config?.options,
    optionsProvider: config?.optionsProvider,
  });
  const fallbackValue = useMemo(
    () => controlledValue ?? config?.value ?? [],
    [config?.value, controlledValue],
  );
  const fallbackKey = fallbackValue.join("\u001f");
  const [state, setState] = useState(() => ({ sourceKey: fallbackKey, value: fallbackValue }));
  const value = state.sourceKey === fallbackKey ? state.value : fallbackValue;
  const controlSignals = usePhiControlSignalController<string[]>({
    key: config?.key ?? "checkbox-group",
    signalRoutes: config?.signalRoutes,
    valueType: "enum[]",
    typeKey: "checkbox-group",
    signalsEnabled,
    initialDisabled: disabled ?? config?.disabled === true,
    initialReadOnly: readOnly ?? config?.readOnly === true,
    clearValue: [],
    onSetValue: (nextValue) => setState({ sourceKey: fallbackKey, value: nextValue }),
    coerceValue: (nextValue) => Array.isArray(nextValue) ? nextValue.map(String) : null,
  });

  function publish(nextValue: string[]) {
    if (controlSignals.readOnly || equalValues(value, nextValue)) {
      return;
    }
    setState({ sourceKey: fallbackKey, value: nextValue });
    onChange?.(nextValue);
    controlSignals.emitChange(nextValue);
  }

  return (
    <PhiLabeledControl label={config?.label} fill>
      <PhiCheckboxGroupControl
        value={value}
        options={resolvedOptions.options}
        vertical={config?.vertical}
        disabled={controlSignals.disabled}
        readOnly={controlSignals.readOnly}
        onChange={publish}
      />
    </PhiLabeledControl>
  );
}
