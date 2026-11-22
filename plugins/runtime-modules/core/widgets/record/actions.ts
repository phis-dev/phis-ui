"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePhiConfirmDialog } from "../../../../../components/controls/phi-confirm-dialog";
import {
  requestPhiTableProviderMutation,
  type PhiTableProviderRegistration,
} from "../../../../../components/widgets/client/shared/phi-table-provider";
import { formatPhiRecordWidgetLabel } from "../../../../../components/widgets/label-types/record";
import type { PhiProviderResourceSource } from "../../../../../types/runtime-data-provider";
import type { PhiRecordWidgetAction } from "../../../../../types/record-widget";
import {
  checkPhiTableProviderActionRequest,
  readPhiTableProviderError,
  type PhiTableProviderMutationResult,
  type PhiTableProviderResourceDescriptor,
  type PhiTableRowIdentity,
} from "../../../../../types/table-widget";

export type PhiRecordWidgetActionsInput = {
  actions: readonly PhiRecordWidgetAction[];
  provider: PhiTableProviderRegistration | null;
  resource: PhiTableProviderResourceDescriptor | null;
  source: PhiProviderResourceSource | null;
  /** The record shown, by identity; null while none is, and nothing runs then. */
  rowIdentity: PhiTableRowIdentity | null;
  /** What the Provider accepted, for the Widget to say and announce. */
  onAccepted: (
    result: PhiTableProviderMutationResult,
    action: PhiRecordWidgetAction,
    rowIdentity: PhiTableRowIdentity,
    correlationId: string | undefined,
  ) => void;
};

/*
 * Running a Provider action on the record shown (TABLES.md, "The record Widget").
 *
 * The record Widget holds a row identity and a bound source, which is all a row action of that source
 * needs: the same request the Table's Binding sends (`checkPhiTableProviderActionRequest`, then
 * `requestPhiTableProviderMutation`), with the identity it holds rather than one a signal names, and no
 * query, because a record is not a view of rows. A key it does not list, a press while nothing is shown,
 * and a second press while the first runs do nothing. A refusal -- the Provider's `rejected`, or a
 * failure on the way -- is said above the record as the Table says it above its rows, and stands until the
 * next press or the next record.
 */
export function usePhiRecordWidgetActions({
  actions,
  provider,
  resource,
  source,
  rowIdentity,
  onAccepted,
}: PhiRecordWidgetActionsInput) {
  const { confirm, confirmDialog } = usePhiConfirmDialog();
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef<AbortController | null>(null);

  useEffect(() => () => runningRef.current?.abort(), []);

  const run = useCallback(async (
    action: PhiRecordWidgetAction,
    identity: PhiTableRowIdentity,
    correlationId: string | undefined,
  ) => {
    // Without a binding no record was read, so nothing is shown to act on.
    if (runningRef.current || !provider || !source) return;
    const request = { kind: "action" as const, actionKey: action.key, rowIdentity: identity, selectedRowIdentities: [], query: {} };
    const requestError = checkPhiTableProviderActionRequest(resource, request);
    setError(requestError?.message ?? null);
    if (requestError) return;
    const abortController = new AbortController();
    runningRef.current = abortController;
    try {
      const result = await requestPhiTableProviderMutation(provider, source, request, abortController.signal);
      if (abortController.signal.aborted) return;
      if (result.status === "rejected") {
        setError(result.message ?? "Table change was rejected.");
        return;
      }
      onAccepted(result, action, identity, correlationId);
    } catch (runError) {
      if (!abortController.signal.aborted) setError(readPhiTableProviderError(runError).message);
    } finally {
      if (runningRef.current === abortController) runningRef.current = null;
    }
  }, [onAccepted, provider, resource, source]);

  const activate = useCallback((actionKey: string, correlationId?: string) => {
    const action = actions.find((candidate) => candidate.key === actionKey);
    if (!action || rowIdentity == null || runningRef.current) return;
    if (!action.confirm) {
      void run(action, rowIdentity, correlationId);
      return;
    }
    confirm({
      title: formatPhiRecordWidgetLabel(action.confirm.title, rowIdentity),
      content: action.confirm.description ? formatPhiRecordWidgetLabel(action.confirm.description, rowIdentity) : undefined,
      confirmLabel: action.confirm.okText,
      cancelLabel: action.confirm.cancelText,
      danger: action.mode === "danger",
      onConfirm: () => run(action, rowIdentity, correlationId),
    });
  }, [actions, confirm, rowIdentity, run]);

  /** A new record, or none: what was said of the last one is not said of it. */
  const forget = useCallback(() => {
    runningRef.current?.abort();
    runningRef.current = null;
    setError(null);
  }, []);

  return { activate, error, forget, confirmDialog };
}
