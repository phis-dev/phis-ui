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
  const separator = config?.separator ?? "/";
  const rootValue = config?.rootValue ?? "/";
  const normalize = config?.normalize ?? "raw";
  const normalizeFallback = (raw: string | null | undefined) =>
    normalizePhiCascaderValue(normalizePhiCascaderValue(raw), { separator, rootValue, normalize });
  // A pick, held against the fallback it replaced; declared first so the provider hears what is held.
  // Without a configured value the fallback is the provider's own answer, so only a pick is told.
  const [picked, setPicked] = useState<{ source: string; value: string } | null>(null);
  const configuredValue = config?.value == null ? null : normalizeFallback(config.value);
  const resolvedOptions = usePhiControlOptionsProvider({
    options: config?.options,
    optionsProvider: config?.optionsProvider,
    selectedValues: configuredValue == null || picked?.source === configuredValue ? picked?.value : configuredValue,
  });
  const normalizedFallbackValue = normalizeFallback(config?.value ?? resolvedOptions.value);
  const value = picked?.source === normalizedFallbackValue ? picked.value : normalizedFallbackValue;
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
      setPicked({
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
    setPicked({
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
          expandTrigger={config?.expandTrigger ?? "click"}
          select={config?.select ?? "any"}
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
