"use client";

import type { PhiControllerSignalAddress, PhiSignalScope } from "../../types/signals";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";
import { usePhiSignalDispatcher, usePhiSignalListener } from "./runtime-signal-bus";

export function usePhiRuntimeConditionStateResponder({
  address,
  scope,
  state,
}: {
  address: PhiControllerSignalAddress;
  scope: PhiSignalScope;
  state: Readonly<Record<string, unknown>>;
}) {
  const dispatchSignal = usePhiSignalDispatcher();
  usePhiSignalListener((signal) => {
    if (
      signal.receiver !== address ||
      signal.channel !== "condition" ||
      signal.action !== "reload" ||
      signal.valueType !== "none" ||
      signal.sender == null
    ) {
      return;
    }
    dispatchSignal({
      scope,
      channel: "condition",
      action: "change",
      value: { state: { ...state } },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
      sender: address,
      receiver: signal.sender,
      correlationId: signal.correlationId,
    });
  }, {
    scopes: [scope],
    channels: ["condition"],
    actions: ["reload"],
    receiver: address,
  });
}
