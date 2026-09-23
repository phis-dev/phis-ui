"use client";

import { useCallback, useMemo, useState } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import {
  findPhiSignalRoutesByCapabilityId,
  type PhiSignalValue,
} from "../../../../types/signals";
import { readPhiTableActionSignalValue, readPhiTableSelectionSignalValue } from "../../../../types/table-widget";
import { readPhiOverlayCloseRequest } from "../../../../types/cms-overlay";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiRuntimeConditionStateResponder } from "../../../../components/runtime/runtime-condition-state-responder";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import {
  PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION,
  type PhiThreadsControllerConfig,
} from "./definition";

type ControllerRenderArgs = Parameters<NonNullable<
  PhiRuntimeControllerPlugin<PhiThreadsControllerConfig>["renderController"]
>>[0];

/**
 * A row key is a conversation id, and this is the only code allowed to know it.
 *
 * Nothing selected reads as no conversation rather than as no signal: the conversation and the composer
 * both have something to say about that, and saying nothing would leave whatever was chosen before on
 * screen.
 */
function readSelectedThreadId(value: unknown) {
  const identity = readPhiTableSelectionSignalValue(value)?.selectedRowIdentities?.[0];
  if (identity == null) return null;
  const threadId = Number.parseInt(String(identity), 10);
  return Number.isSafeInteger(threadId) && threadId > 0 ? threadId : null;
}

/**
 * The conversation that was just opened, read out of what the route answered.
 *
 * A Form reports an HTTP result and nothing more: it relays to a path it was given and has no idea
 * what came back. Reading `{ thread: { thread: { id } } }` out of it is a statement about the Core
 * route's answer, which is exactly the kind of knowledge that belongs in the Module and nowhere else.
 */
function readCreatedThreadId(value: unknown) {
  const payload = (value as { payload?: unknown } | null)?.payload as
    { thread?: { thread?: { id?: unknown } } } | null | undefined;
  const threadId = payload?.thread?.thread?.id;
  return typeof threadId === "number" && Number.isInteger(threadId) && threadId > 0 ? threadId : null;
}

function PhiThreadsControllerView({
  address,
  config,
}: Pick<ControllerRenderArgs, "address" | "config">) {
  const dispatchSignal = usePhiSignalDispatcher();
  const [submitting, setSubmitting] = useState(false);
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);

  /*
   * One declared output, delivered through every route that names it.
   *
   * The channel, the action and the value schema are the route's, not this code's -- which is what
   * lets the same `threadChange` reach the conversation and the composer without this Controller
   * holding a list of the two, and lets a Site point either of them somewhere else.
   *
   * A route with no receiver, or a JSON route with no schema, is skipped rather than sent: SIGNALS.md
   * makes the schema part of matching, and a payload nobody can check is worse than none.
   */
  const emitCapability = useCallback((
    capabilityId: string,
    value: PhiSignalValue,
    correlationId: string,
  ) => {
    for (const route of findPhiSignalRoutesByCapabilityId(emitRoutes, capabilityId)) {
      if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) {
        continue;
      }
      dispatchSignal({
        scope: route.scope,
        sender: address,
        receiver: route.receiver,
        channel: route.channel,
        action: route.action,
        value: route.valueType === "none" ? null : value,
        valueType: route.valueType,
        valueSchema: route.valueSchema ?? null,
        correlationId,
        timestamp: Date.now(),
      });
    }
  }, [address, dispatchSignal, emitRoutes]);

  const sendThread = useCallback((threadId: number | null, correlationId: string) =>
    emitCapability("threadChange", { threadId }, correlationId), [emitCapability]);

  const reloadInbox = useCallback((correlationId: string) =>
    emitCapability("reload", null, correlationId), [emitCapability]);

  const closeDialog = useCallback((correlationId: string) =>
    emitCapability("dialogClose", null, correlationId), [emitCapability]);

  const resetForm = useCallback((correlationId: string) =>
    emitCapability("formReset", null, correlationId), [emitCapability]);

  /* This Controller gates nothing, so the answer never varies -- but a Widget still has to hear it. */
  usePhiRuntimeConditionStateResponder({ address, scope: "page", state: { ready: true } });

  usePhiSignalListener(useCallback((signal) => {
    if (signal.receiver !== address) return;

    // The toolbar's `+`. A Table says which action was run and on which row; what that means is here.
    if (signal.channel === "action" && signal.action === "activate") {
      if (readPhiTableActionSignalValue(signal.value)?.actionKey !== "newConversation") return;
      setSubmitting(false);
      emitCapability("dialogOpen", null, signal.correlationId);
      return;
    }

    /*
     * The dialog's own buttons stand outside the Form, in the footer, so the command reaches the Form
     * through here. A Form that submitted itself would need a button inside it, and then the dialog
     * would have two footers.
     */
    if (signal.channel === "command" && signal.action === "activate") {
      if (signal.value === "cancel") {
        resetForm(signal.correlationId);
        closeDialog(signal.correlationId);
        return;
      }
      if (signal.value === "save" && !submitting) {
        emitCapability("formSubmit", null, signal.correlationId);
      }
      return;
    }

    // Closing while a submit is under way would leave a conversation half opened with nobody watching.
    if (signal.channel === "dialog" && signal.action === "close") {
      if (!readPhiOverlayCloseRequest(signal.value) || submitting) return;
      resetForm(signal.correlationId);
      closeDialog(signal.correlationId);
      return;
    }

    if (signal.channel === "state" && signal.action === "change") {
      if (signal.value === false) setSubmitting(false);
      return;
    }

    // The button shows it is working; the Form is the only one who knows that it is.
    if (signal.channel === "submitting" && signal.action === "change" && typeof signal.value === "boolean") {
      setSubmitting(signal.value);
      emitCapability("submitting", signal.value, signal.correlationId);
      return;
    }

    /*
     * Opening one and reading it are the same gesture, finished in two places: the listing cannot say
     * which of its rows is new, so the answer to the submit says it instead.
     */
    if (signal.channel === "submit" && signal.action === "activate") {
      setSubmitting(false);
      resetForm(signal.correlationId);
      closeDialog(signal.correlationId);
      reloadInbox(signal.correlationId);
      const createdThreadId = readCreatedThreadId(signal.value);
      if (createdThreadId != null) sendThread(createdThreadId, signal.correlationId);
      return;
    }

    /*
     * A message was written, so the listing is out of date: its order is by last activity and the row
     * it belongs to is no longer where it was. Which conversation it was does not matter here -- the
     * Table is asked again and answers with all of them.
     */
    if (signal.channel === "thread") {
      reloadInbox(signal.correlationId);
      return;
    }

    if (signal.channel === "selection") {
      sendThread(readSelectedThreadId(signal.value), signal.correlationId);
    }
  }, [address, closeDialog, emitCapability, reloadInbox, resetForm, sendThread, submitting]), {
    scopes: ["page"],
    receiver: address,
  });

  return null;
}

export const PHI_THREADS_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address, config }) =>
    <PhiThreadsControllerView key={key} address={address} config={config} />,
} satisfies PhiRuntimeControllerPlugin<PhiThreadsControllerConfig>;

export const PhiThreadsRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_THREADS_RUNTIME_CONTROLLER_PLUGIN,
);
