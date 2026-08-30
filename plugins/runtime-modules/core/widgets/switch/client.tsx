"use client";

import { useState } from "react";

import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiSwitchWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { PhiSwitchControl } from "../../../../../components/controls/phi-switch-control";

export function PhiSwitchWidget({
  config,
  disabled,
  readOnly,
  checked: controlledChecked,
  signalsEnabled = true,
  onChange,
}: {
  config?: PhiSwitchWidgetConfig | null;
  blockId?: string | number | null;
  disabled?: boolean;
  readOnly?: boolean;
  checked?: boolean;
  signalsEnabled?: boolean;
  runtime?: PhiBlockRuntime;
  onChange?: (checked: boolean) => void;
}) {
  const fallbackChecked = controlledChecked ?? config?.defaultChecked === true;
  const [state, setState] = useState(() => ({ source: fallbackChecked, checked: fallbackChecked }));
  const checked = state.source === fallbackChecked ? state.checked : fallbackChecked;
  const resolvedReadOnly = readOnly ?? config?.readOnly === true;
  const controlSignals = usePhiControlSignalController<boolean>({
    key: config?.key ?? "switch",
    signalRoutes: config?.signalRoutes,
    valueType: "boolean",
    typeKey: "switch",
    signalsEnabled,
    initialDisabled: disabled ?? config?.disabled === true,
    initialReadOnly: resolvedReadOnly,
    clearValue: false,
    onSetValue: (nextChecked) => setState({ source: fallbackChecked, checked: nextChecked }),
    onToggleRequest: () => publish(!checked),
    coerceValue: (nextValue) => {
      if (typeof nextValue === "boolean") {
        return nextValue;
      }
      return null;
    },
  });
  const resolvedDisabled = disabled || controlSignals.disabled;

  function publish(nextChecked: boolean) {
    if (controlSignals.readOnly) {
      return;
    }

    setState({ source: fallbackChecked, checked: nextChecked });
    onChange?.(nextChecked);
    controlSignals.emitChange(nextChecked);
  }

  return (
    <PhiSwitchControl
      checked={checked}
      disabled={resolvedDisabled}
      readOnly={controlSignals.readOnly}
      size={config?.controlSize}
      label={config?.label}
      checkedChildren={config?.checkedChildren}
      unCheckedChildren={config?.unCheckedChildren}
      onChange={publish}
    />
  );
}
