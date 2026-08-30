"use client";

import { useState } from "react";

import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import {
  normalizePhiCascaderValue,
  PhiCascaderControl,
} from "../../../../../components/controls/phi-cascader-control";
import type { PhiCascaderWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiControlOptionsProvider } from "../../../../../components/controls/phi-options-provider";

export function PhiCascaderWidget({
  config,
  signalsEnabled = true,
}: {
  config?: PhiCascaderWidgetConfig | null;
  blockId?: string | number | null;
  signalsEnabled?: boolean;
}) {
  const { token } = usePhiConfig();
  const minWidth = token.controlHeight * 6;
  const resolvedOptions = usePhiControlOptionsProvider({
    options: config?.options,
    optionsProvider: config?.optionsProvider,
  });
  const fallbackValue = normalizePhiCascaderValue(config?.value ?? resolvedOptions.value);
  const separator = config?.separator ?? "/";
  const rootValue = config?.rootValue ?? "/";
  const normalize = config?.normalize ?? "raw";
  const normalizedFallbackValue = normalizePhiCascaderValue(fallbackValue, { separator, rootValue, normalize });
  const [state, setState] = useState(() => ({
    source: normalizedFallbackValue,
    value: normalizedFallbackValue,
  }));
  const value = state.source === normalizedFallbackValue ? state.value : normalizedFallbackValue;
  const controlSignals = usePhiControlSignalController<string>({
    key: config?.key ?? "cascader",
    signalRoutes: config?.signalRoutes,
    valueType: "path",
    typeKey: "cascader",
    signalsEnabled,
    initialDisabled: config?.disabled === true,
    initialReadOnly: config?.readOnly === true,
    clearValue: config?.allowRoot === false ? normalizedFallbackValue : rootValue,
    onSetValue: (nextValue) =>
      setState({
        source: normalizedFallbackValue,
        value: normalizePhiCascaderValue(nextValue, { separator, rootValue, normalize }),
      }),
    coerceValue: (nextValue) =>
      typeof nextValue === "string" ? normalizePhiCascaderValue(nextValue, { separator, rootValue, normalize }) : null,
  });

  function publish(nextValue: string) {
    if (controlSignals.readOnly) {
      return;
    }

    const normalizedNextValue = normalizePhiCascaderValue(nextValue, { separator, rootValue, normalize });
    setState({
      source: normalizedFallbackValue,
      value: normalizedNextValue,
    });
    controlSignals.emitChange(normalizedNextValue);
  }

  return (
    <div style={{ minWidth, width: "100%" }}>
      <PhiCascaderControl
          label={config?.label}
          allowRoot={config?.allowRoot ?? true}
          separator={separator}
          rootValue={rootValue}
          normalize={normalize}
          disabled={controlSignals.disabled}
          readOnly={controlSignals.readOnly}
          size={config?.controlSize}
          options={resolvedOptions.options}
          placeholder={config?.placeholder}
          value={value}
          onChange={publish}
          onFocus={controlSignals.emitFocus}
          onBlur={controlSignals.emitBlur}
      />
    </div>
  );
}
