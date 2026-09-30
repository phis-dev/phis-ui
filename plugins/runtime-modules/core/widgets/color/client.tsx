"use client";

import { PhiColorFieldControl } from "../../../../../components/controls/phi-color-field-control";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import type { PhiColorWidgetConfig } from "./config";

export type PhiColorWidgetProps = {
  config: PhiColorWidgetConfig;
  blockId?: string | number | null;
  disabled?: boolean;
};

/** The Color Widget: the colour field Control, driven by its config and wired to its signals. */
export function PhiColorWidget({ config, disabled = config.disabled ?? false }: PhiColorWidgetProps) {
  const defaultValue = config.defaultValue ?? "#1677ff";
  const controlSignals = usePhiControlSignalController<string>({
    key: config.key ?? "color",
    signalRoutes: config.signalRoutes,
    typeKey: "color",
    initialDisabled: disabled,
    initialReadOnly: config.readOnly === true,
    clearValue: defaultValue,
    coerceValue: (nextValue) => (typeof nextValue === "string" ? nextValue : null),
  });

  return (
    <PhiColorFieldControl
      label={config.label}
      value={config.value}
      defaultValue={defaultValue}
      tokenKey={config.key}
      mode={config.mode}
      disabled={controlSignals.disabled || controlSignals.readOnly}
      onChange={(nextValue) => controlSignals.emitChange(nextValue)}
      onClear={() => controlSignals.emitClear()}
    />
  );
}
