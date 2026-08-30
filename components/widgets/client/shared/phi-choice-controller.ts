"use client";

import { useEffect, useMemo, useState } from "react";

import type { PhiSignalAddress } from "../../../../types";
import { findPhiSignalRoutesByCapabilityId } from "../../../../types/signals";
import type { PhiControlOption } from "../../../controls/phi-control-options";
import type { PhiChoiceControlConfig, PhiStackChoiceControlConfig } from "../../config/choice-shared";
import {
  isPhiStackSignalMessage,
  PHI_STACK_META_SIGNAL_CHANNEL,
  resolvePhiStackSignalMessage,
} from "../../../layouts/stack-signals";
import { usePhiSignalListener } from "../../../runtime/runtime-signal-bus";
import { usePhiControlSignalController } from "./phi-control-signals";
import { usePhiControlOptionsProvider } from "../../../controls/phi-options-provider";

export type PhiChoiceControlTypeKey = "select-box" | "segmented" | "tab-bar";

export type PhiChoiceControllerOptions<TConfig extends PhiChoiceControlConfig> = {
  config?: TConfig | null;
  signalsEnabled?: boolean;
  typeKey: PhiChoiceControlTypeKey;
  defaultKey: string;
  sender?: PhiSignalAddress | null;
};

export type PhiChoiceControllerResult = {
  options: PhiControlOption[];
  value: string;
  readOnly: boolean;
  disabled: boolean;
  fallbackValue: string;
  emitFocus: () => void;
  emitBlur: () => void;
  publish: (nextValue: string) => void;
};

export function usePhiChoiceController<TConfig extends PhiChoiceControlConfig>({
  config,
  signalsEnabled = true,
  typeKey,
  defaultKey,
  sender,
}: PhiChoiceControllerOptions<TConfig>): PhiChoiceControllerResult {
  const resolvedOptions = usePhiControlOptionsProvider({
    options: config?.options,
    optionsProvider: config?.optionsProvider,
  });
  const fallbackValue = config?.value ?? resolvedOptions.value ?? resolvedOptions.options.at(0)?.value ?? "";
  const readOnly = config?.readOnly === true;
  const [state, setState] = useState(() => ({
    source: fallbackValue,
    value: fallbackValue,
  }));
  const value = state.source === fallbackValue ? state.value : fallbackValue;
  const controlSignals = usePhiControlSignalController<string>({
    key: config?.key ?? defaultKey,
    sender,
    signalRoutes: config?.signalRoutes,
    valueType: "string",
    typeKey,
    signalsEnabled,
    initialDisabled: config?.disabled === true,
    initialReadOnly: readOnly,
    clearValue: fallbackValue,
    onSetValue: (nextValue) => setState({ source: fallbackValue, value: nextValue }),
    coerceValue: (nextValue) => (typeof nextValue === "string" ? nextValue : nextValue == null ? "" : String(nextValue)),
  });

  function publish(nextValue: string) {
    if (readOnly) {
      return;
    }
    setState({
      source: fallbackValue,
      value: nextValue,
    });
    controlSignals.emitChange(nextValue);
  }

  return {
    options: resolvedOptions.options,
    value,
    readOnly,
    disabled: controlSignals.disabled,
    fallbackValue,
    emitFocus: controlSignals.emitFocus,
    emitBlur: controlSignals.emitBlur,
    publish,
  };
}

export type PhiStackChoiceControllerOptions<TConfig extends PhiStackChoiceControlConfig> =
  PhiChoiceControllerOptions<TConfig>;

export type PhiStackChoiceControllerResult = Omit<PhiChoiceControllerResult, "publish" | "options"> & {
  options: PhiControlOption[];
  stackMode: boolean;
  publish: (nextValue: string) => void;
};

function mapPhiStackSlotsToChoiceOptions(message: unknown): PhiControlOption[] | null {
  if (!isPhiStackSignalMessage(message)) {
    return null;
  }

  return message.value.slots
    .filter((slot) => slot.hasContent)
    .map((slot) => ({
      value: String(slot.index),
      label: slot.label,
    }));
}

export function usePhiStackChoiceController<TConfig extends PhiStackChoiceControlConfig>({
  config,
  signalsEnabled = true,
  typeKey,
  defaultKey,
  sender,
}: PhiStackChoiceControllerOptions<TConfig>): PhiStackChoiceControllerResult {
  const resolvedOptions = usePhiControlOptionsProvider({
    options: config?.options,
    optionsProvider: config?.optionsProvider,
  });
  const stackMode = config?.valueMode === "stack-slot-index";
  const fallbackValue = config?.value ?? resolvedOptions.value ?? resolvedOptions.options.at(0)?.value ?? "";
  const readOnly = config?.readOnly === true;
  const [state, setState] = useState(() => ({
    source: fallbackValue,
    value: fallbackValue,
  }));
  const [stackOptions, setStackOptions] = useState<PhiControlOption[]>([]);
  const value = state.source === fallbackValue ? state.value : fallbackValue;
  const stackMetaListenRoute = findPhiSignalRoutesByCapabilityId(config?.signalRoutes?.listens, "stackMeta")[0] ?? null;
  const controlSignals = usePhiControlSignalController<string>({
    key: config?.key ?? defaultKey,
    sender,
    signalRoutes: config?.signalRoutes,
    valueType: "string",
    typeKey,
    signalsEnabled,
    initialDisabled: config?.disabled === true,
    initialReadOnly: readOnly,
    clearValue: fallbackValue,
    onSetValue: (nextValue) => setState({ source: fallbackValue, value: nextValue }),
    coerceValue: (nextValue) => (typeof nextValue === "string" ? nextValue : nextValue == null ? "" : String(nextValue)),
  });
  const emitControlCapability = controlSignals.emitCapability;

  useEffect(() => {
    if (!signalsEnabled || !stackMode) {
      return;
    }

    emitControlCapability("stackMeta", null);
  }, [emitControlCapability, signalsEnabled, stackMode]);

  usePhiSignalListener(
    (signal) => {
      if (!signalsEnabled || !stackMode || !stackMetaListenRoute) {
        return;
      }
      if (
        signal.scope !== stackMetaListenRoute.scope ||
        signal.channel !== stackMetaListenRoute.channel ||
        signal.action !== stackMetaListenRoute.action ||
        signal.valueType !== stackMetaListenRoute.valueType
      ) {
        return;
      }

      const message = resolvePhiStackSignalMessage(signal);
      if (!isPhiStackSignalMessage(message) || signal.receiver !== "broadcast") {
        return;
      }

      setStackOptions(mapPhiStackSlotsToChoiceOptions(message) ?? []);
      const nextValue = String(message.value.activeSlotIndex);
      setState((current) =>
        current.source === fallbackValue && current.value === nextValue
          ? current
          : { source: fallbackValue, value: nextValue },
      );
    },
    useMemo(
      () => ({
        scopes: stackMetaListenRoute ? [stackMetaListenRoute.scope] : [],
        channels: [PHI_STACK_META_SIGNAL_CHANNEL],
      }),
      [stackMetaListenRoute],
    ),
  );

  function publish(nextValue: string) {
    if (readOnly) {
      return;
    }
    setState({
      source: fallbackValue,
      value: nextValue,
    });

    if (!stackMode) {
      controlSignals.emitChange(nextValue);
      return;
    }

    const activeSlotIndex = Number(nextValue);
    if (
      !Number.isInteger(activeSlotIndex) ||
      !signalsEnabled
    ) {
      return;
    }

    emitControlCapability("activeSlotIndex", activeSlotIndex);
  }

  return {
    options: stackMode ? stackOptions : resolvedOptions.options,
    value,
    readOnly,
    disabled: controlSignals.disabled,
    fallbackValue,
    stackMode,
    emitFocus: controlSignals.emitFocus,
    emitBlur: controlSignals.emitBlur,
    publish,
  };
}
