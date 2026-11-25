"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import {
  findPhiSignalRoutesByCapabilityId,
  type PhiSignalAddress,
  type PhiSignalValue,
} from "../../../../types/signals";
import {
  readPhiTableActionSignalValue,
  readPhiTableSelectionSignalValue,
} from "../../../../types/table-signal-values";
import { readPhiOverlayCloseRequest } from "../../../../types/cms-overlay";
import { readPhiThreadSignalValue } from "../../../../types/thread-widget";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiRuntimeConditionStateResponder } from "../../../../components/runtime/runtime-condition-state-responder";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { dispatchPhiSignalCapability } from "../../../../components/runtime/runtime-signal-identity";
import {
  PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION,
  type PhiThreadsControllerConfig,
} from "./definition";
import { readPhiPositiveInteger } from "../../../../components/widgets/client/shared/phi-table-provider-request";
import { readPhiCustomerFileThreadId } from "../services/customer-file-read";
import { PHI_CUSTOMER_FILE_MEMBER_PARAM } from "../../../../constants/customer-file";

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
  /*
   * The conversation that is open, kept because two things need it after the fact.
   *
   * A reply Form is emptied when its message lands, and emptying returns its fields to their initial
   * values -- where the conversation is not, because it never was one: it arrived as a signal. So it is
   * asserted again afterwards. The same value is what the Page conditions on, which is the other reason
   * it cannot merely pass through.
   */
  const [openThreadId, setOpenThreadId] = useState<number | null>(null);
  /*
   * A customer file Page's two readers apart: the member's file, and the conversation a Reply was last
   * pressed in -- the file's or the listing's -- so the note that lands is read again where it was written.
   */
  const [fileThreadId, setFileThreadId] = useState<number | null>(null);
  const [replyThreadId, setReplyThreadId] = useState<number | null>(null);
  const memberRead = useRef<{ userId: number | null; controller: AbortController | null }>({ userId: null, controller: null });
  useEffect(() => () => memberRead.current.controller?.abort(), []);
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
  ) => dispatchPhiSignalCapability(dispatchSignal, address, emitRoutes, capabilityId, value, correlationId), [address, dispatchSignal, emitRoutes]);

  /*
   * Which Form is the dialog's, read off the wiring rather than from an id in this file.
   *
   * The Form this Controller presses and resets is the one the dialog holds -- that is what its own
   * routes say. So a success from that address closes the dialog, and a success from anywhere else is a
   * message written into the open conversation. Nothing here has to know a Widget id, and a Site that
   * moves either Form is understood without being asked.
   */
  const dialogFormAddresses = useMemo(
    () => new Set(
      ["formSubmit", "formReset"]
        .flatMap((capabilityId) => findPhiSignalRoutesByCapabilityId(emitRoutes, capabilityId))
        .map((route) => route.receiver)
        .filter((receiver): receiver is PhiSignalAddress => receiver != null && receiver !== "broadcast"),
    ),
    [emitRoutes],
  );

  const sendThread = useCallback((
    threadId: number | null,
    correlationId: string,
    options: { tellReader?: boolean } = {},
  ) => {
    setOpenThreadId(threadId);
    // The reader that announced the conversation itself already shows it; telling it again is an echo.
    if (options.tellReader !== false) {
      emitCapability("threadChange", { threadId }, correlationId);
    }
    /*
     * And as condition state, pushed rather than answered.
     *
     * A node's visibility gate listens; it never asks. So a node a Site gates on an open conversation is
     * told, on the correlation id of the choice that caused it. The responder below still answers a Widget
     * that does ask.
     */
    emitCapability(
      "conditionStateChange",
      { state: { ready: true, threadOpen: threadId != null } },
      correlationId,
    );
  }, [emitCapability]);

  /*
   * Another member chosen: the Tables that read something of theirs are told as filters, whatever shows
   * something of theirs by binding params -- the addresses tiles -- as binding params, and their file is
   * read from the request the Tables make for the same choice (it joins that one, so a choice stays one
   * entry in the access log) and handed to the file panel. Nobody chosen, the reader's own file and a
   * failed read all close the panel; the Tables say why.
   */
  const openMemberFile = useCallback((userId: number | null, correlationId: string) => {
    if (memberRead.current.userId === userId) return;
    memberRead.current.controller?.abort();
    const controller = userId == null ? null : new AbortController();
    memberRead.current = { userId, controller };
    setFileThreadId(null);
    // The Tables and the addresses ask in their next render, while the read below is under way, and join it.
    // The customer file Provider reads the member from the `userId` filter (`query.filters.userId`).
    emitCapability("memberFiltersChange", { userId }, correlationId);
    emitCapability("memberParamsChange", { params: { [PHI_CUSTOMER_FILE_MEMBER_PARAM]: userId } }, correlationId);
    emitCapability("fileThreadChange", { threadId: null }, correlationId);
    if (userId == null || !controller) return;
    readPhiCustomerFileThreadId(userId, controller.signal).then((threadId) => {
      if (controller.signal.aborted) return;
      setFileThreadId(threadId);
      if (threadId != null) emitCapability("fileThreadChange", { threadId }, correlationId);
    }, () => undefined);
  }, [emitCapability]);

  const reloadInbox = useCallback((correlationId: string) =>
    emitCapability("reload", null, correlationId), [emitCapability]);

  const closeDialog = useCallback((correlationId: string) =>
    emitCapability("dialogClose", null, correlationId), [emitCapability]);

  const resetForm = useCallback((correlationId: string) =>
    emitCapability("formReset", null, correlationId), [emitCapability]);

  /*
   * What the Page may condition on: that this Controller is up, and whether a conversation is open.
   *
   * The reply Form hangs on the second one. A Form whose hidden conversation is empty would refuse its
   * own submit with a validation message on a field nobody can see, so it is not shown at all until
   * there is something to write into -- and the sentence that stands there instead is its own node with
   * the opposite condition. Absent means "no answer yet" to a visibility gate, which is why nothing
   * flashes before the first selection arrives.
   */
  const conditionState = useMemo(
    () => ({ ready: true, threadOpen: openThreadId != null }),
    [openThreadId],
  );
  usePhiRuntimeConditionStateResponder({ address, scope: "page", state: conditionState });

  usePhiSignalListener(useCallback((signal) => {
    if (signal.receiver !== address) return;

    // The toolbar's `+`. A Table says which action was run and on which row; what that means is here.
    if (signal.channel === "action" && signal.action === "activate") {
      const tableAction = readPhiTableActionSignalValue(signal.value);
      if (tableAction?.actionKey === "reply") {
        setReplyThreadId(readPhiPositiveInteger(tableAction.rowIdentity));
        return;
      }
      if (tableAction?.actionKey !== "newConversation") return;
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
      if (signal.sender != null && !dialogFormAddresses.has(signal.sender)) {
        /*
         * A message landed in the open conversation, from the Reply dialog. The reader is asked to catch
         * up rather than to switch, and the listing is stale because its order is by last activity.
         */
        // A note in the member's file: the file panel catches up, and the listing, which leaves it out, is as it was.
        if (fileThreadId != null && replyThreadId === fileThreadId) {
          emitCapability("fileThreadReload", { threadId: fileThreadId }, signal.correlationId);
          return;
        }
        reloadInbox(signal.correlationId);
        emitCapability("threadReload", { threadId: openThreadId }, signal.correlationId);
        return;
      }
      setSubmitting(false);
      resetForm(signal.correlationId);
      closeDialog(signal.correlationId);
      reloadInbox(signal.correlationId);
      const createdThreadId = readCreatedThreadId(signal.value);
      if (createdThreadId != null) sendThread(createdThreadId, signal.correlationId);
      return;
    }


    if (signal.channel === "selection") {
      sendThread(readSelectedThreadId(signal.value), signal.correlationId);
      return;
    }

    if (signal.channel === "member" && signal.action === "change") {
      // The member select's value: the user id as text, `""` for nobody.
      openMemberFile(readPhiPositiveInteger(signal.value), signal.correlationId);
      return;
    }

    if (signal.channel === "opened" && signal.action === "change") {
      const opened = readPhiThreadSignalValue(signal.value)?.threadId ?? null;
      if (opened != null) sendThread(opened, signal.correlationId, { tellReader: false });
    }
  }, [
    address,
    closeDialog,
    dialogFormAddresses,
    emitCapability,
    fileThreadId,
    openMemberFile,
    openThreadId,
    reloadInbox,
    replyThreadId,
    resetForm,
    sendThread,
    submitting,
  ]), {
    scopes: ["page"],
    receiver: address,
  });

  return null;
}

const PHI_THREADS_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address, config }) =>
    <PhiThreadsControllerView key={key} address={address} config={config} />,
} satisfies PhiRuntimeControllerPlugin<PhiThreadsControllerConfig>;

export const PhiThreadsRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_THREADS_RUNTIME_CONTROLLER_PLUGIN,
);
