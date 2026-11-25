"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import { useEffect, useMemo, useState } from "react";

import type { PhiSignalAddress } from "../../../../types";
import { findPhiSignalRoutesByCapabilityId } from "../../../../types/signals";
import { readPhiControlOptions, type PhiControlOption } from "../../../controls/phi-control-options";
import type { PhiChoiceControlConfig, PhiStackChoiceControlConfig } from "../../config/choice-shared";
import {
  isPhiStackSignalMessage,
  PHI_STACK_META_SIGNAL_CHANNEL,
  readPhiStackSignalAddressKey,
  resolvePhiStackSignalMessage,
} from "../../../layouts/stack-signals";
import { usePhiSignalListener } from "../../../runtime/runtime-signal-bus";
import { usePhiControlSignalController } from "./phi-control-signals";
import { usePhiControlOptionsProvider } from "../../../controls/phi-options-provider";

export type PhiChoiceControlTypeKey = "select-box" | "segmented" | "steps" | "tab-bar";

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
  /**
   * What is typed into the select, for an Options Provider that searches on the server (`loadMode:
   * "server"`, `search`); absent where the source declares no search, so the select narrows what it holds.
   */
  onSearch?: (search: string) => void;
  /** `false` where the provider's answer is already the result of the search. */
  filterOptionsLocally: boolean;
};

type PhiChoicePick = { source: string; value: string };

/**
 * What a choice holds, as far as known before its options resolve: a configured value is the fallback a
 * pick holds against. Without one the fallback is the provider's own answer, so only a pick is told.
 */
function readPhiChoiceHeldValue(picked: PhiChoicePick | null, configuredValue: string | undefined) {
  if (configuredValue == null) return picked?.value;
  return picked?.source === configuredValue ? picked.value : configuredValue;
}

export function usePhiChoiceController<TConfig extends PhiChoiceControlConfig>({
  config,
  signalsEnabled = true,
  typeKey,
  defaultKey,
  sender,
}: PhiChoiceControllerOptions<TConfig>): PhiChoiceControllerResult {
  // A pick, held against the fallback it replaced; declared first so the provider hears it.
  const [picked, setPicked] = useState<PhiChoicePick | null>(null);
  /*
   * What is typed, handed to the provider as a Form field and a Table filter hand it: the hook debounces it
   * and holds it to the declared minimum, so a provider answering one page of a longer list -- the Site's
   * members -- is searched by its route rather than inside the page it answered.
   */
  const [searchDraft, setSearchDraft] = useState("");
  const resolvedOptions = usePhiControlOptionsProvider({
    options: config?.options,
    optionsProvider: config?.optionsProvider,
    searchDraft,
    selectedValues: readPhiChoiceHeldValue(picked, config?.value),
  });
  /*
   * Without a value of its own a choice holds its first option -- except a select that may be emptied
   * (`allowClear`), which starts as it ends when cleared: with nothing chosen. A member picker that held
   * the first member of the list showed a choice nobody made, and picking that member then changed nothing.
   */
  const fallbackValue = config?.value ?? resolvedOptions.value ??
    (config?.allowClear === true ? "" : resolvedOptions.options.at(0)?.value) ?? "";
  const readOnly = config?.readOnly === true;
  const value = picked?.source === fallbackValue ? picked.value : fallbackValue;
  /*
   * Options a sender replaced, held against the configured list they replaced. When the configuration
   * brings a different list, that one is what the Control was given last, so the sent one steps aside.
   */
  const configuredOptions = config?.options;
  const [sentOptions, setSentOptions] = useState<{
    source: typeof configuredOptions;
    options: PhiControlOption[];
  } | null>(null);
  const options = sentOptions && sentOptions.source === configuredOptions
    ? sentOptions.options
    : resolvedOptions.options;
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
    onSetValue: (nextValue) => setPicked({ source: fallbackValue, value: nextValue }),
    onReceiveCapability: (capabilityId, signal) => {
      if (capabilityId !== "options") {
        return false;
      }
      const value = isPhiRecord(signal.value)
        ? (signal.value as { options?: unknown }).options
        : undefined;
      setSentOptions({ source: configuredOptions, options: readPhiControlOptions(value) });
      return true;
    },
    coerceValue: (nextValue) => (typeof nextValue === "string" ? nextValue : nextValue == null ? "" : String(nextValue)),
  });

  function publish(nextValue: string) {
    if (readOnly) {
      return;
    }
    setPicked({
      source: fallbackValue,
      value: nextValue,
    });
    controlSignals.emitChange(nextValue);
  }

  return {
    options,
    value,
    readOnly,
    disabled: controlSignals.disabled,
    fallbackValue,
    emitFocus: controlSignals.emitFocus,
    emitBlur: controlSignals.emitBlur,
    publish,
    onSearch: resolvedOptions.search.enabled ? setSearchDraft : undefined,
    filterOptionsLocally: resolvedOptions.search.filterLocally,
  };
}

export type PhiStackChoiceControllerOptions<TConfig extends PhiStackChoiceControlConfig> =
  PhiChoiceControllerOptions<TConfig>;

export type PhiStackChoiceControllerResult = Omit<PhiChoiceControllerResult, "publish" | "options" | "onSearch" | "filterOptionsLocally"> & {
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
  // A pick, held against the fallback it replaced; declared first so the provider hears it.
  const [picked, setPicked] = useState<PhiChoicePick | null>(null);
  const resolvedOptions = usePhiControlOptionsProvider({
    options: config?.options,
    optionsProvider: config?.optionsProvider,
    selectedValues: readPhiChoiceHeldValue(picked, config?.value),
  });
  const stackMode = config?.valueMode === "stack-slot-index";
  const fallbackValue = config?.value ?? resolvedOptions.value ?? resolvedOptions.options.at(0)?.value ?? "";
  const readOnly = config?.readOnly === true;
  const [stackOptions, setStackOptions] = useState<PhiControlOption[]>([]);
  const value = picked?.source === fallbackValue ? picked.value : fallbackValue;
  const stackMetaListenRoute = findPhiSignalRoutesByCapabilityId(config?.signalRoutes?.listens, "stackMeta")[0] ?? null;
  /*
   * The Stack this Choice follows: the one its `stackMeta` request is addressed to. Every Stack answers
   * on the same broadcast, so without it two Stacks on one page would each overwrite the other's options
   * and index here. A Choice whose request names no Stack follows none.
   */
  const followedStackKey = readPhiStackSignalAddressKey(
    findPhiSignalRoutesByCapabilityId(config?.signalRoutes?.emits, "stackMeta")[0]?.receiver,
  );
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
    onSetValue: (nextValue) => setPicked({ source: fallbackValue, value: nextValue }),
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
      if (!signalsEnabled || !stackMode || !stackMetaListenRoute || !followedStackKey) {
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
      if (!isPhiStackSignalMessage(message) || signal.receiver !== "broadcast" || message.key !== followedStackKey) {
        return;
      }

      setStackOptions(mapPhiStackSlotsToChoiceOptions(message) ?? []);
      const nextValue = String(message.value.activeSlotIndex);
      setPicked((current) =>
        current?.source === fallbackValue && current.value === nextValue
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
    setPicked({
      source: fallbackValue,
      value: nextValue,
    });

    if (!stackMode) {
      controlSignals.emitChange(nextValue);
      return;
    }

    // `Number("")` is 0, so a cleared choice would otherwise activate the first slot.
    const activeSlotIndex = nextValue.trim() === "" ? Number.NaN : Number(nextValue);
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
