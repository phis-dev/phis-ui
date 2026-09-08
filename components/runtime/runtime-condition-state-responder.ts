"use client";

import type { PhiSignalAddress, PhiSignalScope } from "../../types/signals";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";
import { usePhiSignalDispatcher, usePhiSignalListener } from "./runtime-signal-bus";

/**
 * The one place a `condition/reload` is answered, and the reason it exists rather than being retyped.
 *
 * A Widget that declares a condition asks the Controller whether it may act, and waits until an answer
 * arrives. The answer is a reply, so it goes back to the asker and carries the correlation id it was
 * asked with -- the rule in AGENTS.md, and the part that was got wrong every time this was written out
 * by hand: one copy invented a constant id, another guarded a required field with `??`.
 *
 * `address` is whatever the answering side is addressed as. It was typed as a Controller address until
 * the first caller arrived, which does not narrow it that far.
 *
 * `state` may be a getter, for the answer that is not held in React state. A Controller that tracks the
 * selected row in a ref would otherwise answer with whatever the last render saw.
 */
type PhiRuntimeConditionState = Readonly<Record<string, unknown>>;

export function usePhiRuntimeConditionStateResponder({
  address,
  scope,
  state,
}: {
  address: PhiSignalAddress;
  scope: PhiSignalScope;
  state: PhiRuntimeConditionState | (() => PhiRuntimeConditionState);
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
      value: { state: { ...(typeof state === "function" ? state() : state) } },
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
