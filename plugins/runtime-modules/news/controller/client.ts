"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";

import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import type { PhiRuntimeControllerPlugin, PhiSignal, PhiSignalAddress } from "../../../../types";
import { readPhiOverlayCloseRequest } from "../../../../types/cms-overlay";
import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress, createPhiSignalSubcontrolAddress } from "../../../../types/signals";
import { readPhiTableActionSignalValue } from "../../../../types/table-widget";
import {
  PHI_EDITOR_NEWS_ENTRY_COMMANDS_WIDGET_ID,
  PHI_EDITOR_NEWS_ENTRY_FORM_WIDGET_ID,
  PHI_EDITOR_NEWS_ENTRY_OVERLAY_ID,
  PHI_EDITOR_NEWS_PUBLICATION_COMMANDS_WIDGET_ID,
  PHI_EDITOR_NEWS_PUBLICATION_FORM_WIDGET_ID,
  PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_ID,
  PHI_EDITOR_NEWS_WIDGET_ID,
} from "../ids";
import { PHI_NEWS_RUNTIME_CONTROLLER_DEFINITION, type PhiNewsControllerConfig } from "./definition";

/** Which of the two dialogs an action, a command or a form belongs to. */
type NewsDialogKey = "entry" | "publication";

type PendingRecord = {
  dialog: NewsDialogKey;
  value: NonNullable<ReturnType<typeof readPhiTableActionSignalValue>>;
  correlationId: string;
};

/*
 * The addresses, outside the component: they are derived from constant node ids and depend on nothing a
 * render can change. Built inside, they were a new object every render, which is exactly what the callbacks
 * below memoise against.
 */
const TABLE_ADDRESS = createPhiSignalAddress("cms", PHI_EDITOR_NEWS_WIDGET_ID);

const DIALOGS = {
  entry: {
    overlay: createPhiSignalAddress("cms", PHI_EDITOR_NEWS_ENTRY_OVERLAY_ID),
    form: createPhiSignalAddress("cms", PHI_EDITOR_NEWS_ENTRY_FORM_WIDGET_ID),
    save: createPhiSignalSubcontrolAddress("cms", PHI_EDITOR_NEWS_ENTRY_COMMANDS_WIDGET_ID, "save"),
    commands: createPhiSignalAddress("cms", PHI_EDITOR_NEWS_ENTRY_COMMANDS_WIDGET_ID),
  },
  publication: {
    overlay: createPhiSignalAddress("cms", PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_ID),
    form: createPhiSignalAddress("cms", PHI_EDITOR_NEWS_PUBLICATION_FORM_WIDGET_ID),
    save: createPhiSignalSubcontrolAddress("cms", PHI_EDITOR_NEWS_PUBLICATION_COMMANDS_WIDGET_ID, "save"),
    commands: createPhiSignalAddress("cms", PHI_EDITOR_NEWS_PUBLICATION_COMMANDS_WIDGET_ID),
  },
} as const;

/** Which dialog a signal came from, by its sender: an address cannot drift out of step with itself. */
function readNewsDialogBySender(sender: PhiSignal["sender"]): NewsDialogKey | null {
  for (const key of ["entry", "publication"] as const) {
    const dialog = DIALOGS[key];
    if (sender === dialog.form || sender === dialog.overlay || sender === dialog.commands) {
      return key;
    }
  }
  return null;
}

function PhiNewsControllerMount({ address }: { address: PhiSignalAddress }) {
  const dispatchSignal = usePhiSignalDispatcher();
  const [pending, setPending] = useState<PendingRecord | null>(null);
  const submittingRef = useRef(false);
  const deliveredRef = useRef<string | null>(null);

  const send = useCallback((input: {
    receiver: PhiSignalAddress;
    channel: string;
    action: "activate" | "change" | "close";
    value: null | string | boolean | Record<string, unknown>;
    valueType: "none" | "string" | "boolean" | "json";
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

  const close = useCallback((dialog: NewsDialogKey, correlationId: string) => {
    send({
      receiver: DIALOGS[dialog].overlay,
      channel: "dialog",
      action: "close",
      value: null,
      valueType: "none",
      correlationId,
    });
  }, [send]);

  usePhiSignalListener(useCallback((signal) => {
    /*
     * A row action, or the toolbar's "new entry".
     *
     * `edit` and `publish` carry a row; `new` carries none, and that is the difference between opening a
     * dialog on an entry and opening it on nothing. A Form only takes a record when one is delivered, so a
     * new entry is a reset Form rather than a second Form of its own.
     */
    if (signal.channel === "action" && signal.action === "activate") {
      const action = readPhiTableActionSignalValue(signal.value);
      if (!action) return;
      if (action.actionKey === "new") {
        deliveredRef.current = null;
        setPending(null);
        send({
          receiver: DIALOGS.entry.form,
          channel: "reset",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
        });
        send({
          receiver: DIALOGS.entry.overlay,
          channel: "dialog",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
        });
        return;
      }
      const dialog: NewsDialogKey | null = action.actionKey === "edit"
        ? "entry"
        : action.actionKey === "publish"
          ? "publication"
          : null;
      if (!dialog || action.rowIdentity == null) return;
      deliveredRef.current = null;
      setPending({ dialog, value: action, correlationId: signal.correlationId });
      send({
        receiver: DIALOGS[dialog].overlay,
        channel: "dialog",
        action: "activate",
        value: null,
        valueType: "none",
        correlationId: signal.correlationId,
      });
      return;
    }

    if (signal.channel === "command" && signal.action === "activate") {
      const dialog = readNewsDialogBySender(signal.sender);
      if (!dialog || submittingRef.current) return;
      if (signal.value === "save") {
        send({
          receiver: DIALOGS[dialog].form,
          channel: "submit",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
        });
        return;
      }
      if (signal.value === "cancel") {
        send({
          receiver: DIALOGS[dialog].form,
          channel: "reset",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
        });
        close(dialog, signal.correlationId);
      }
      return;
    }

    // The X or the backdrop. Refused while a save is in flight: the answer still has to land somewhere.
    if (signal.channel === "dialog" && signal.action === "close") {
      const dialog = readNewsDialogBySender(signal.sender);
      if (!dialog || !readPhiOverlayCloseRequest(signal.value) || submittingRef.current) return;
      send({
        receiver: DIALOGS[dialog].form,
        channel: "reset",
        action: "activate",
        value: null,
        valueType: "none",
        correlationId: signal.correlationId,
      });
      close(dialog, signal.correlationId);
      return;
    }

    // The Save button's own spinner, relayed to the button of the dialog whose Form is working.
    if (signal.channel === "submitting" && signal.action === "change" && typeof signal.value === "boolean") {
      const dialog = readNewsDialogBySender(signal.sender);
      if (!dialog) return;
      submittingRef.current = signal.value;
      send({
        receiver: DIALOGS[dialog].save,
        channel: "submitting",
        action: "change",
        value: signal.value,
        valueType: "boolean",
        correlationId: signal.correlationId,
      });
      return;
    }

    /*
     * A Form said it went through: close its dialog and let the Table read again.
     *
     * `resource` would be the Provider's word for it; here it is a reload signal, because the Table owns
     * its query and a Controller must not reach into it.
     */
    if (signal.channel === "submit" && signal.action === "activate") {
      const dialog = readNewsDialogBySender(signal.sender);
      if (!dialog) return;
      close(dialog, signal.correlationId);
      send({
        receiver: TABLE_ADDRESS,
        channel: "reload",
        action: "activate",
        value: null,
        valueType: "none",
        correlationId: signal.correlationId,
      });
      return;
    }

    // A dialog reports it is shut: nothing is in flight and nothing is pending any more.
    if (signal.channel === "state" && signal.action === "change" && signal.value === false) {
      submittingRef.current = false;
      deliveredRef.current = null;
      setPending(null);
    }
  }, [close, send]), {
    scopes: ["page", "area"],
    channels: ["action", "command", "dialog", "submitting", "submit", "state"],
  },
  /* The address this listener answers for; without it the bus holds every signal sent here. */
  address);

  /*
   * The record reaches the Form after its dialog is open, and once.
   *
   * Delivered from an effect rather than from the listener because the Form must be mounted to hear it, and
   * the key guards the second delivery: React may run this again for the same state, and a Form that reloads
   * its record mid-typing loses what somebody wrote.
   */
  useEffect(() => {
    if (!pending) return;
    const deliveryKey = `${pending.dialog}:${pending.correlationId}:${String(pending.value.rowIdentity)}`;
    if (deliveredRef.current === deliveryKey) return;
    deliveredRef.current = deliveryKey;
    send({
      receiver: DIALOGS[pending.dialog].form,
      channel: "action",
      action: "activate",
      value: pending.value,
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      correlationId: pending.correlationId,
    });
  }, [pending, send]);

  return null;
}

export const PHI_NEWS_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_NEWS_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ address }) => createElement(PhiNewsControllerMount, { address }),
} satisfies PhiRuntimeControllerPlugin<PhiNewsControllerConfig>;

export const PhiNewsRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_NEWS_RUNTIME_CONTROLLER_PLUGIN,
);
