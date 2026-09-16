"use client";

import { useRef, useState } from "react";

import type { PhiBlockRuntime, PhiCmsInstanceId } from "../../../../../types";
import type { PhiCmsOtpWidgetConfig } from "./config";
import { usePhiRenderableWidgetRuntime } from "../../../../../components/runtime/renderable-block-runtime";
import {
  PhiOtpControl,
  type PhiOtpControlHandle,
} from "../../../../../components/controls/phi-otp-control";
import { usePhiInputSignalController } from "../../../../../components/widgets/client/shared/phi-input-signals";

export type PhiOtpWidgetProps = {
  blockId: PhiCmsInstanceId;
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area">;
  config?: PhiCmsOtpWidgetConfig | null;
  signalsEnabled?: boolean;
};

/**
 * The one-time code as an authored node.
 *
 * It speaks the text Control's signals, because what it holds is a string: `change` for every edit, so
 * a listener can tell a half-typed code from none, and `submit` once every cell is filled -- the moment
 * a verification step would otherwise need a separate button for.
 */
export function PhiOtpWidget({ blockId, runtime, config, signalsEnabled = true }: PhiOtpWidgetProps) {
  const handleRef = useRef<PhiOtpControlHandle | null>(null);
  const blockRuntime = usePhiRenderableWidgetRuntime({
    blockId,
    runtime,
    config,
  });
  const [draft, setDraft] = useState("");

  const inputSignals = usePhiInputSignalController({
    key: config?.key,
    signalRoutes: config?.signalRoutes,
    typeKey: "otp",
    signalsEnabled,
    initialDisabled: blockRuntime.state.enabled === false || config?.disabled === true,
    initialReadOnly: config?.readOnly === true,
    onSetValue: setDraft,
    onClear: () => setDraft(""),
    onFocusRequest: () => handleRef.current?.focus(),
    onBlurRequest: () => handleRef.current?.blur(),
  });

  return (
    <PhiOtpControl
      handleRef={handleRef}
      label={config?.label}
      description={config?.description}
      ariaLabel={config?.label ?? "One-time code"}
      length={config?.length}
      characters={config?.characters}
      mask={config?.mask}
      disabled={inputSignals.disabled}
      readOnly={inputSignals.readOnly}
      size={config?.controlSize}
      value={draft}
      onChange={(next) => {
        setDraft(next);
        inputSignals.emitChange(next);
      }}
      onComplete={() => inputSignals.emitSubmit()}
      onFocus={() => inputSignals.emitFocus()}
      onBlur={() => inputSignals.emitBlur()}
    />
  );
}
