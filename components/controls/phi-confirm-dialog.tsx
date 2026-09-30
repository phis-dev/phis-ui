"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

import { PhiDialogControl } from "./phi-dialog-control";

export type PhiConfirmDialogRequest = {
  title: ReactNode;
  content?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** A confirmation whose answer cannot be walked back, drawn as the danger it is. */
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
};

/**
 * A confirmation that has nothing to hang on.
 *
 * `PhiConfirmControl` is the one to reach for wherever a button asks the question: a Popconfirm points
 * at what it is about. This is for the other case -- a Widget told by a signal to run an action that
 * needs an answer first, where there is no trigger on screen to point at, and for a command that is
 * issued from somewhere else entirely.
 *
 * It exists so that case does not mean `App.useApp().modal`. Ant Design's imperative `modal` needs the
 * `App` provider above it, and that provider carries the message, notification and modal runtimes into
 * every first load of every page, whether or not anything ever asks one of them a question. A Control
 * rendering a Dialog costs what it draws, and only where it is drawn.
 *
 * The caller renders `confirmDialog` somewhere in its own tree and calls `confirm(...)`; the Dialog
 * closes once the answer has been carried out. A `onConfirm` that throws leaves it open, because the
 * question was not answered -- what to say about the failure is the caller's, as it was before.
 */
export function usePhiConfirmDialog() {
  const [request, setRequest] = useState<PhiConfirmDialogRequest | null>(null);
  const [confirming, setConfirming] = useState(false);
  // The question on screen right now, read by an answer that finishes after another was asked.
  const currentRequestRef = useRef<PhiConfirmDialogRequest | null>(null);

  const close = useCallback(() => {
    currentRequestRef.current = null;
    setRequest(null);
    setConfirming(false);
  }, []);

  const confirm = useCallback((next: PhiConfirmDialogRequest) => {
    currentRequestRef.current = next;
    setConfirming(false);
    setRequest(next);
  }, []);

  const cancel = useCallback(() => {
    request?.onCancel?.();
    close();
  }, [close, request]);

  const accept = useCallback(() => {
    if (!request || confirming) return;
    setConfirming(true);
    void (async () => {
      /*
       * The answer may take a while, and a new question can be asked in the meantime. Settling then
       * belongs to the question that was answered: closing or re-enabling would dismiss or unlock the
       * one that replaced it.
       */
      try {
        await request.onConfirm();
        if (currentRequestRef.current === request) close();
      } catch {
        if (currentRequestRef.current === request) setConfirming(false);
      }
    })();
  }, [close, confirming, request]);

  const confirmDialog = (
    <PhiDialogControl
      open={request != null}
      title={request?.title}
      centered
      actions={request == null ? [] : [
        {
          key: "cancel",
          label: request.cancelLabel ?? "Cancel",
          disabled: confirming,
          onClick: cancel,
        },
        {
          key: "confirm",
          label: request.confirmLabel ?? "OK",
          type: "primary",
          danger: request.danger,
          loading: confirming,
          onClick: accept,
        },
      ]}
      onDismiss={cancel}
    >
      {request?.content ?? null}
    </PhiDialogControl>
  );

  return { confirm, confirmDialog };
}
