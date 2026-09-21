"use client";

import { useCallback, useState } from "react";

import type { PhiRuntimeControllerPlugin, PhiSignal, PhiSignalAddress } from "../../../../types";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
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
import {
  PHI_APP_THREADS_PAGE_OVERLAY_IDS,
  PHI_APP_THREADS_PAGE_WIDGET_IDS,
} from "../addresses";

type ControllerRenderArgs = Parameters<NonNullable<
  PhiRuntimeControllerPlugin<PhiThreadsControllerConfig>["renderController"]
>>[0];

const INBOX_ADDRESS = createPhiSignalAddress("cms", PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetInbox);
const READER_ADDRESSES = [
  createPhiSignalAddress("cms", PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetConversation),
  createPhiSignalAddress("cms", PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetComposer),
];
const FORM_ADDRESS = createPhiSignalAddress("cms", PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetNewForm);
const OVERLAY_ADDRESS = createPhiSignalAddress("cms", PHI_APP_THREADS_PAGE_OVERLAY_IDS.overlayNew);
const SAVE_BUTTON_ADDRESS = createPhiSignalSubcontrolAddress(
  "cms",
  PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetNewCommands,
  "save",
);

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

function PhiThreadsControllerView({ address }: Pick<ControllerRenderArgs, "address">) {
  const dispatchSignal = usePhiSignalDispatcher();
  const [submitting, setSubmitting] = useState(false);

  const send = useCallback((input: {
    receiver: PhiSignalAddress;
    channel: string;
    action: PhiSignal["action"];
    value: PhiSignal["value"];
    valueType: PhiSignal["valueType"];
    valueSchema?: PhiSignal["valueSchema"];
    correlationId: string;
  }) => dispatchSignal({
    scope: "page",
    sender: address,
    receiver: input.receiver,
    channel: input.channel,
    action: input.action,
    value: input.value,
    valueType: input.valueType,
    valueSchema: input.valueSchema ?? null,
    correlationId: input.correlationId,
    timestamp: Date.now(),
  }), [address, dispatchSignal]);

  const sendThread = useCallback((threadId: number | null, correlationId: string) => {
    for (const receiver of READER_ADDRESSES) {
      send({
        receiver,
        channel: "thread",
        action: "change",
        value: { threadId },
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
        correlationId,
      });
    }
  }, [send]);

  const reloadInbox = useCallback((correlationId: string) => send({
    receiver: INBOX_ADDRESS,
    channel: "reload",
    action: "activate",
    value: null,
    valueType: "none",
    correlationId,
  }), [send]);

  const closeDialog = useCallback((correlationId: string) => send({
    receiver: OVERLAY_ADDRESS,
    channel: "dialog",
    action: "close",
    value: null,
    valueType: "none",
    correlationId,
  }), [send]);

  const resetForm = useCallback((correlationId: string) => send({
    receiver: FORM_ADDRESS,
    channel: "reset",
    action: "activate",
    value: null,
    valueType: "none",
    correlationId,
  }), [send]);

  /* This Controller gates nothing, so the answer never varies -- but a Widget still has to hear it. */
  usePhiRuntimeConditionStateResponder({ address, scope: "page", state: { ready: true } });

  usePhiSignalListener(useCallback((signal) => {
    if (signal.receiver !== address) return;

    // The toolbar's `+`. A Table says which action was run and on which row; what that means is here.
    if (signal.channel === "action" && signal.action === "activate") {
      if (readPhiTableActionSignalValue(signal.value)?.actionKey !== "newConversation") return;
      setSubmitting(false);
      send({
        receiver: OVERLAY_ADDRESS,
        channel: "dialog",
        action: "activate",
        value: null,
        valueType: "none",
        correlationId: signal.correlationId,
      });
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
        send({
          receiver: FORM_ADDRESS,
          channel: "submit",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
        });
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
      send({
        receiver: SAVE_BUTTON_ADDRESS,
        channel: "submitting",
        action: "change",
        value: signal.value,
        valueType: "boolean",
        correlationId: signal.correlationId,
      });
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
  }, [address, closeDialog, reloadInbox, resetForm, send, sendThread, submitting]), {
    scopes: ["page"],
    receiver: address,
  });

  return null;
}

export const PHI_THREADS_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address }) => <PhiThreadsControllerView key={key} address={address} />,
} satisfies PhiRuntimeControllerPlugin<PhiThreadsControllerConfig>;

export const PhiThreadsRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_THREADS_RUNTIME_CONTROLLER_PLUGIN,
);
