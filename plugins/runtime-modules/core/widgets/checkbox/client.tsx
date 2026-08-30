"use client";

import { useState } from "react";

import { PhiCheckboxControl } from "../../../../../components/controls/phi-checkbox-control";
import type { PhiCheckboxWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";

export function PhiCheckboxWidget({
  config,
  checked: controlledChecked,
  disabled,
  readOnly,
  signalsEnabled = true,
  onChange,
}: {
  config?: PhiCheckboxWidgetConfig | null;
  blockId?: string | number | null;
  checked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  signalsEnabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const fallbackChecked = controlledChecked ?? config?.checked === true;
  const [state, setState] = useState(() => ({ source: fallbackChecked, checked: fallbackChecked }));
  const checked = state.source === fallbackChecked ? state.checked : fallbackChecked;
  const controlSignals = usePhiControlSignalController<boolean>({
    key: config?.key ?? "checkbox",
    signalRoutes: config?.signalRoutes,
    valueType: "boolean",
    typeKey: "checkbox",
    signalsEnabled,
    initialDisabled: disabled ?? config?.disabled === true,
    initialReadOnly: readOnly ?? config?.readOnly === true,
    clearValue: false,
    onSetValue: (nextChecked) => setState({ source: fallbackChecked, checked: nextChecked }),
    onToggleRequest: () => publish(!checked),
    coerceValue: (nextValue) => typeof nextValue === "boolean" ? nextValue : null,
  });

  function publish(nextChecked: boolean) {
    if (controlSignals.readOnly) {
      return;
    }
    setState({ source: fallbackChecked, checked: nextChecked });
    onChange?.(nextChecked);
    controlSignals.emitChange(nextChecked);
  }

  return (
    <PhiCheckboxControl
      checked={checked}
      label={config?.label}
      indeterminate={config?.indeterminate}
      disabled={controlSignals.disabled}
      readOnly={controlSignals.readOnly}
      onFocus={controlSignals.emitFocus}
      onBlur={controlSignals.emitBlur}
      onChange={publish}
    />
  );
}
