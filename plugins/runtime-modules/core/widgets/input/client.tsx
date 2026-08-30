"use client";

import { useEffect, useRef, useState } from "react";
import type { InputRef } from "antd/es/input";

import type { PhiBlockRuntime, PhiCmsInstanceId } from "../../../../../types";
import type { PhiCmsInputWidgetConfig } from "./config";
import { usePhiRenderableWidgetRuntime } from "../../../../../components/runtime/renderable-block-runtime";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { usePhiInputSignalController } from "../../../../../components/widgets/client/shared/phi-input-signals";

export type PhiInputWidgetProps = {
  blockId: PhiCmsInstanceId;
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area">;
  config?: PhiCmsInputWidgetConfig | null;
  signalsEnabled?: boolean;
};

export function PhiInputWidget({ blockId, runtime, config, signalsEnabled = true }: PhiInputWidgetProps) {
  const inputRef = useRef<InputRef | null>(null);
  const changeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockRuntime = usePhiRenderableWidgetRuntime({
    blockId,
    runtime,
    config,
  });
  const [draft, setDraft] = useState(() => config?.text ?? "");

  useEffect(() => {
    // Config changes are external widget state and must reset the local draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(config?.text ?? "");
  }, [config?.text]);

  useEffect(() => () => {
    if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
  }, []);

  const inputSignals = usePhiInputSignalController({
    key: config?.key,
    signalRoutes: config?.signalRoutes,
    typeKey: "input",
    signalsEnabled,
    initialDisabled: blockRuntime.state.enabled === false || config?.disabled === true,
    initialReadOnly: config?.readOnly === true,
    onSetValue: setDraft,
    onClear: () => setDraft(""),
    onFocusRequest: () => inputRef.current?.focus(),
    onBlurRequest: () => inputRef.current?.blur(),
  });
  const emitConfiguredChange = (value: string) => {
    const emitted = config?.trimEmittedValue ? value.trim() : value;
    const minLength = config?.minValueLength ?? 0;
    if (emitted.length > 0 && emitted.length < minLength) return;
    if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
    const debounceMs = config?.debounceMs ?? 0;
    if (debounceMs > 0) {
      changeTimerRef.current = setTimeout(() => inputSignals.emitChange(emitted), debounceMs);
    } else {
      inputSignals.emitChange(emitted);
    }
  };

  return (
    <PhiTextControl
      inputRef={inputRef}
      label={config?.label}
      description={config?.description}
      ariaLabel={config?.placeholder}
      allowClear={config?.allowClear ?? true}
      inputType={config?.inputType}
      disabled={inputSignals.disabled}
      readOnly={inputSignals.readOnly}
      size={config?.controlSize}
      placeholder={config?.placeholder}
      value={draft}
      onChange={(nextText) => {
        if (inputSignals.readOnly) {
          return;
        }
        const resolvedText = nextText ?? "";
        setDraft(resolvedText);
        emitConfiguredChange(resolvedText);
      }}
      onClear={() => {
        if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
        inputSignals.emitClear();
      }}
      onPressEnter={() => {
        if (config?.submitOnEnter !== false) inputSignals.emitSubmit();
      }}
      onFocus={() => inputSignals.emitFocus()}
      onBlur={() => inputSignals.emitBlur()}
    />
  );
}
