"use client";

import { useMemo, useState } from "react";

import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiSignalValueType } from "../../../../../types";
import type { PhiMultiSelectWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiControlOptionsProvider } from "../../../../../components/controls/phi-options-provider";
import type { PhiWidgetControlMode } from "../../../../../types/widget-ui";
import { PhiMultiSelectControl } from "../../../../../components/controls/phi-multi-select-control";

type PhiMultiSelectValue = string[] | number[];

function normalizeMultiSelectValue(value: unknown, valueType: PhiSignalValueType): PhiMultiSelectValue {
  if (!Array.isArray(value)) {
    return [];
  }

  if (valueType !== "number[]") {
    return value
      .map((entry) => (typeof entry === "string" ? entry : entry == null ? "" : String(entry)))
      .filter(Boolean);
  }

  return value
    .map((entry) => (typeof entry === "number" ? entry : Number(entry)))
    .filter((entry) => Number.isFinite(entry) && Number.isInteger(entry));
}

function valuesToSelectValues(value: PhiMultiSelectValue): string[] {
  return value.map((entry) => String(entry));
}

function selectValuesToControlValue(value: string[], valueType: PhiSignalValueType): PhiMultiSelectValue {
  if (valueType !== "number[]") {
    return value;
  }

  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && Number.isInteger(entry));
}

function areMultiSelectValuesEqual(left: PhiMultiSelectValue, right: PhiMultiSelectValue) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) => entry === right[index]);
}

export function PhiMultiSelectWidget({
  config,
  signalsEnabled = true,
  value: controlledValue,
  disabled,
  readOnly,
  mode = "preview",
  onChange,
}: {
  config?: PhiMultiSelectWidgetConfig | null;
  blockId?: string | number | null;
  signalsEnabled?: boolean;
  value?: PhiMultiSelectValue;
  disabled?: boolean;
  readOnly?: boolean;
  mode?: PhiWidgetControlMode;
  onChange?: (value: PhiMultiSelectValue) => void;
}) {
  const { token } = usePhiConfig();
  const minWidth = token.controlHeight * 5;
  const valueType = config?.valueType ?? "enum[]";
  const resolvedOptions = usePhiControlOptionsProvider({
    options: config?.options,
    optionsProvider: config?.optionsProvider,
  });
  const fallbackValue = useMemo(
    () => normalizeMultiSelectValue(controlledValue ?? config?.value ?? [], valueType),
    [config?.value, controlledValue, valueType],
  );
  const fallbackValueKey = `${valueType}:${fallbackValue.join("\u001f")}`;
  const [state, setState] = useState(() => ({
    sourceKey: fallbackValueKey,
    value: fallbackValue,
  }));
  const value = state.sourceKey === fallbackValueKey ? state.value : fallbackValue;
  const maxTagCount =
    config?.maxTagCount === "responsive" && value.length <= 1
      ? undefined
      : config?.maxTagCount;
  const resolvedReadOnly = readOnly ?? config?.readOnly === true;
  const fill = mode === "control" || mode === "config";
  const controlSignals = usePhiControlSignalController<PhiMultiSelectValue>({
    key: config?.key ?? "multi-select",
    signalRoutes: config?.signalRoutes,
    valueType,
    typeKey: "multi-select",
    signalsEnabled,
    initialDisabled: disabled ?? config?.disabled === true,
    initialReadOnly: resolvedReadOnly,
    clearValue: [],
    onSetValue: (nextValue) => {
      const normalizedValue = normalizeMultiSelectValue(nextValue, valueType);
      setState((current) =>
        current.sourceKey === fallbackValueKey && areMultiSelectValuesEqual(current.value, normalizedValue)
          ? current
          : { sourceKey: fallbackValueKey, value: normalizedValue },
      );
    },
    coerceValue: (nextValue) => normalizeMultiSelectValue(nextValue, valueType),
  });

  function publish(nextValue: string[]) {
    if (resolvedReadOnly) {
      return;
    }

    const controlValue = selectValuesToControlValue(nextValue, valueType);
    if (areMultiSelectValuesEqual(value, controlValue)) {
      return;
    }

    setState({
      sourceKey: fallbackValueKey,
      value: controlValue,
    });
    onChange?.(controlValue);
    controlSignals.emitCapability(
      valueType === "number[]" ? "changeNumber" : valueType === "string[]" ? "changeString" : "change",
      controlValue,
    );
  }

  return (
    <PhiMultiSelectControl
      label={config?.label}
      description={config?.description}
      value={valuesToSelectValues(value)}
      placeholder={config?.placeholder}
      disabled={controlSignals.disabled}
      readOnly={resolvedReadOnly}
      size={config?.controlSize}
      allowCustom={config?.allowCustom}
      options={resolvedOptions.options}
      maxTagCount={maxTagCount}
      popupMatchSelectWidth={false}
      onFocus={controlSignals.emitFocus}
      onBlur={controlSignals.emitBlur}
      onChange={publish}
      style={{ minWidth: fill ? 0 : minWidth, width: fill ? "100%" : undefined }}
    />
  );
}
