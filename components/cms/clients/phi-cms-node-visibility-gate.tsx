"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  collectPhiRuntimeValueConditions,
  evaluatePhiRuntimeConditionExpression,
  readPhiRuntimeConditionStateSignalValue,
  type PhiRuntimeConditionExpression,
  type PhiRuntimeFeatureState,
  type PhiRuntimePageConditionState,
} from "../../../types/runtime-condition";
import { PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignalAddress } from "../../../types/signals";
import { usePhiSignalListener } from "../../runtime/runtime-signal-bus";
import type { PhiSlotChildSizing } from "../../../plugins/runtime/slot-size-policy";

export type PhiCmsNodeVisibilityGateProps = {
  visibleWhen: PhiRuntimeConditionExpression;
  /**
   * How the node inside sizes, carried through and never read here.
   *
   * `display: contents` takes this wrapper out of the Layout so a slot behaves as if the node sat in it
   * directly -- but only for CSS. The slot reads its child's sizing off the React element it holds, and
   * that element is this gate, whose own props say nothing about the node behind it. So the sizing rides
   * along: `resolvePhiSlotChildSizing` looks for exactly this prop first.
   *
   * It has to be handed down rather than worked out here. A slot cannot see through a Client Component
   * to what it will render, and it cannot ask the component either -- across a client boundary the
   * element's type is a reference, not the function. The renderer that builds both the frame and this
   * gate is the one place that knows both.
   *
   * Left out while it did not matter: an unanchored Layout stretches its slots, so a child wrongly read
   * as "does not fill" was stretched anyway. The moment a Layout centred its slots instead, the node had
   * nothing to measure its own `width: 100%` against and collapsed to nothing.
   */
  slotChildSizing?: PhiSlotChildSizing | null;
  /**
   * The address the wrapped node answers at, which the gate answers at while the node is away.
   *
   * A signal addressed to a node that is not mounted is held until it is, so a node waiting to be told
   * whether to appear would wait for a message that is waiting for it. The gate stands in: it is the
   * registered listener for that address whether the node is showing or not.
   */
  receiver?: PhiSignalAddress | null;
  /**
   * What the server already knew, handed down rather than read again.
   *
   * The gate is only ever reached by an expression the server could not finish, and "could not finish"
   * usually means one half of it -- the half about a Widget that has yet to report. The other half is
   * still part of the same expression: without the Site's configuration and the address in hand, a
   * condition like "the password method is on, and no second factor is running" is unanswerable here,
   * and a node guarded by it would never appear at all.
   */
  page: PhiRuntimePageConditionState | null;
  features: PhiRuntimeFeatureState | null;
  children: ReactNode;
};

/**
 * The reported state of every Controller and Widget the expression names.
 *
 * One that has not spoken yet is absent rather than empty, which is the difference between "not in that
 * state" and "no answer yet" -- an expression over an absent sender is `unavailable`, and this gate
 * keeps such a node hidden rather than flashing it for as long as the answer takes.
 */
function usePhiRuntimeConditionReportedStates(
  expression: PhiRuntimeConditionExpression | null,
  receiver: PhiSignalAddress | null,
) {
  const addresses = useMemo(
    () =>
      new Set<string>(
        collectPhiRuntimeValueConditions(expression)
          .flatMap((condition) =>
            condition.source === "controller" && condition.controllerAddress
              ? [condition.controllerAddress]
              : condition.source === "widget" && condition.widgetAddress
                ? [condition.widgetAddress]
                : []),
      ),
    [expression],
  );
  const [states, setStates] = useState<Record<string, Record<string, unknown>>>({});

  usePhiSignalListener(
    (signal) => {
      if (
        !signal.sender ||
        !addresses.has(signal.sender) ||
        signal.valueSchema !== PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState
      ) return;
      const next = readPhiRuntimeConditionStateSignalValue(signal.value);
      if (next) setStates((current) => ({ ...current, [signal.sender!]: next.state }));
    },
    useMemo(
      () => addresses.size === 0
        ? null
        : {
            channels: ["condition"],
            actions: ["change"] as const,
            valueSchemas: [PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState],
            ...(receiver ? { receiver } : {}),
          },
      [addresses, receiver],
    ),
    receiver ?? null,
  );

  return states;
}

/**
 * Renders what it wraps only while the node's condition holds.
 *
 * It is wrapped around a node whose condition the server could not settle, and around no other. A
 * condition the request already answered -- the address the visitor arrived with -- is decided before
 * rendering, so the node is either absent from the page or in it without a client boundary. What is left
 * for the gate is what only the browser knows: what a neighbouring Widget found out, what a Controller
 * holds, what has been typed.
 */
export function PhiCmsNodeVisibilityGate({
  visibleWhen,
  receiver = null,
  page,
  features,
  children,
}: PhiCmsNodeVisibilityGateProps) {
  // `slotChildSizing` is deliberately not destructured: it is read off this element, never in it.
  const reported = usePhiRuntimeConditionReportedStates(visibleWhen, receiver);
  const visible = evaluatePhiRuntimeConditionExpression(visibleWhen, {
    page,
    features,
    controllers: reported,
    widgets: reported,
  }) === "matched";

  /*
   * Hidden rather than absent, because what is here was rendered on the server and is worth keeping.
   *
   * Whether a node exists is the server's decision and was already made; this one is about whether it
   * is on screen now. Returning nothing would throw away a form that had been fully rendered and make
   * the visitor wait for it to be built again in the browser -- for a sign-in, that is the whole of the
   * wait. `display: contents` keeps the wrapper out of the Layout, so a slot behaves as if the node sat
   * in it directly.
   */
  return <div style={{ display: visible ? "contents" : "none" }}>{children}</div>;
}

