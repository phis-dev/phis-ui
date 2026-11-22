"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readPhiDotPath } from "../../../../../helpers/dot-path";

import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiDescriptionListControl } from "../../../../../components/controls/phi-description-list-control";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { PhiSkeletonControl } from "../../../../../components/controls/phi-skeleton-control";
import { usePhiIntlLocale, usePhiIntlTimeZone } from "../../../../../components/root/phi-intl-locale";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import {
  emitPhiSignalCapability,
  usePhiSignalEmitter,
  usePhiSignalIdentity,
} from "../../../../../components/runtime/runtime-signal-identity";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";
import { renderPhiValueContent } from "../../../../../components/widgets/client/shared/phi-rendered-value";
import { usePhiTableProvider } from "../../../../../components/widgets/client/shared/phi-table-provider";
import {
  PHI_RECORD_WIDGET_DEFAULT_LABELS,
  formatPhiRecordWidgetLabel,
  type PhiRecordWidgetLabels,
} from "../../../../../components/widgets/label-types/record";
import { PhiWidgetFailure } from "../../../../../components/widgets/shared/widget-failure-client";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { fillPhiRecordTitle } from "../../../../../helpers/record-title";
import { validatePhiRecordWidgetBinding } from "../../../../../helpers/record-widget";
import type { PhiRecordWidgetConfig } from "../../../../../types/record-widget";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";
import type { PhiSignalValue } from "../../../../../types/signals";
import type { PhiTableProviderMutationResult, PhiTableRowIdentity } from "../../../../../types/table-widget";
import { readPhiTableActionSignalValue } from "../../../../../types/table-signal-values";
import { usePhiRecordWidgetActions, type PhiRecordWidgetActionsInput } from "./actions";

export type PhiRecordWidgetClientProps = {
  config: PhiRecordWidgetConfig;
  labels?: PhiRecordWidgetLabels;
  /** Where this draws, which decides who reads a failed read: the author, or only the log. */
  renderMode: PhiRenderableBlockRenderMode;
};

export function PhiRecordWidgetClient({
  config,
  labels = PHI_RECORD_WIDGET_DEFAULT_LABELS,
  renderMode,
}: PhiRecordWidgetClientProps) {
  /*
   * Which record to show arrives as a signal, and is not read out of a store this Widget knows about.
   *
   * That is what makes it general: it never learns which table sent the row, so the same Widget serves
   * an Overlay beside a table, a panel next to it, and a page driven by a selection made somewhere else
   * entirely. The Overlay case is also why the signal has to survive the trip -- an Overlay mounts on
   * first open, so the row action that opens it is addressed to a Widget that does not exist yet, and
   * the bus holds an addressed signal until its receiver appears.
   */
  const { token } = usePhiConfig();
  const signalIdentity = usePhiSignalIdentity();
  /*
   * Memoised because the `?? []` hands out a fresh array whenever no routes are declared, and the
   * subscription below is keyed on it: without this the Widget would resubscribe on every render.
   */
  const listenRoutes = useMemo(() => config.signalRoutes?.listens ?? [], [config.signalRoutes?.listens]);
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);
  const emitSignal = usePhiSignalEmitter(signalIdentity.sender);
  const emitCapability = useCallback((
    capabilityId: string,
    value: PhiSignalValue,
    correlationId?: string | null,
  ) => emitPhiSignalCapability(emitSignal, emitRoutes, capabilityId, value, correlationId), [emitRoutes, emitSignal]);
  const { showMessage } = usePhiApplicationFeedback();
  const { provider, resource, bindingError } = usePhiTableProvider(config.source);
  // The actions measured against the resource, said where the record would stand (Table: contractError).
  const contractError = useMemo(
    () => resource ? validatePhiRecordWidgetBinding(config, resource)[0] ?? null : null,
    [config, resource],
  );
  // Sent with the read and part of what makes one new: an open record is read again after a switch.
  const locale = usePhiIntlLocale();
  const timeZone = usePhiIntlTimeZone();
  const [selectedRowIdentity, setSelectedRowIdentity] = useState<PhiTableRowIdentity | null>(null);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * Asks for the shown record again: after an action went through, what it shows has changed. A count
   * beside the identity rather than a call, so a record closed in the meantime is not read for nobody.
   */
  const [readSequence, setReadSequence] = useState(0);
  const requestRef = useRef<AbortController | null>(null);
  // The exchange the record was opened in, which its title answers.
  const openCorrelationRef = useRef<string | undefined>(undefined);
  /*
   * The title the record gives the dialog, where the placement takes one (`titleFromRecord`): announced
   * after every read, and empty as a row is asked for, so the last row's name does not stand over the
   * next one while it loads. Empty is the Overlay's own title.
   */
  const titleFromRecord = config.titleFromRecord;
  const announceRecordTitle = useCallback((loaded: Record<string, unknown> | null, correlationId?: string) => {
    if (!titleFromRecord) return;
    emitCapability(
      "recordTitle",
      fillPhiRecordTitle(titleFromRecord.template, loaded ? readPhiDotPath(loaded, titleFromRecord.field) : undefined),
      correlationId,
    );
  }, [emitCapability, titleFromRecord]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const loadRecord = useCallback(async (rowIdentity: PhiTableRowIdentity) => {
    requestRef.current?.abort();
    setLoading(true);
    setError(null);
    setRecord(null);
    if (bindingError || !config.source) {
      setError(bindingError ?? labels.missingBinding);
      setLoading(false);
      return;
    }
    /*
     * Two ways to fail that read the same to a visitor and not to an author: a resource that never
     * offered single records, and a Provider that declared the capability without implementing it.
     * Both are said with the resource's name, because that is what the author has to go and look at.
     */
    if (resource?.recordRead !== true || !provider?.readRecord) {
      setError(formatPhiRecordWidgetLabel(labels.recordReadUnsupported, config.source.resourceKey));
      setLoading(false);
      return;
    }
    const abortController = new AbortController();
    requestRef.current = abortController;
    try {
      const loaded = await provider.readRecord({
        resourceKey: config.source.resourceKey,
        rowIdentity,
        params: config.source.params,
        locale,
        timeZone,
        signal: abortController.signal,
      });
      if (!abortController.signal.aborted) {
        setRecord(loaded);
        announceRecordTitle(loaded, openCorrelationRef.current);
      }
    } catch (readError) {
      if (!abortController.signal.aborted) {
        setError(readError instanceof Error ? readError.message : labels.loadFailed);
      }
    } finally {
      /*
       * Whoever still owns the request ends the loading, aborted or not. Only a newer read replaces it --
       * and then that one owns the skeleton. A read aborted by `close` used to leave it standing, so
       * the next open showed the skeleton until a read finished.
       */
      if (requestRef.current === abortController) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [announceRecordTitle, bindingError, config.source, labels, locale, provider, resource?.recordRead, timeZone]);

  const onActionAccepted = useCallback<PhiRecordWidgetActionsInput["onAccepted"]>((
    result: PhiTableProviderMutationResult,
    action,
    rowIdentity,
    correlationId,
  ) => {
    // What the Provider has to say about what it did, as the Table says it: only where it says something.
    if (result.message?.trim()) showMessage({ level: "info", content: result.message.trim() });
    emitCapability("actionSuccess", { actionKey: action.key, rowIdentity, selectedRowIdentities: [] }, correlationId);
    setReadSequence((current) => current + 1);
  }, [emitCapability, showMessage]);
  const recordActions = usePhiRecordWidgetActions({
    actions: config.actions,
    provider,
    resource,
    source: config.source,
    rowIdentity: record ? selectedRowIdentity : null,
    onAccepted: onActionAccepted,
  });
  const forgetActionOutcome = recordActions.forget;
  const activateAction = recordActions.activate;

  usePhiSignalListener(useCallback((signal) => {
    const route = listenRoutes.find((candidate) =>
      candidate.channel === signal.channel &&
      candidate.action === signal.action &&
      candidate.valueType === signal.valueType &&
      (candidate.valueType !== "json" || candidate.valueSchema === signal.valueSchema));
    if (!route || (signal.receiver !== "broadcast" && signal.receiver !== signalIdentity.receiver)) return;
    if (route.capabilityId === "recordOpen") {
      const action = readPhiTableActionSignalValue(signal.value);
      if (!action || action.actionKey !== config.openActionKey || action.rowIdentity == null) return;
      openCorrelationRef.current = signal.correlationId;
      announceRecordTitle(null, signal.correlationId);
      forgetActionOutcome();
      setSelectedRowIdentity(action.rowIdentity);
    } else if (route.capabilityId === "close" && signal.value === false) {
      forgetActionOutcome();
      setSelectedRowIdentity(null);
      setRecord(null);
      setError(null);
    } else if (route.capabilityId === "actionActivate" && typeof signal.value === "string") {
      activateAction(signal.value.trim(), signal.correlationId);
    }
  }, [activateAction, announceRecordTitle, config.openActionKey, forgetActionOutcome, listenRoutes, signalIdentity.receiver]), useMemo(() => {
    if (listenRoutes.length === 0) return null;
    return {
      scopes: Array.from(new Set(listenRoutes.map((route) => route.scope))),
      channels: Array.from(new Set(listenRoutes.map((route) => route.channel))),
    };
  }, [listenRoutes]), signalIdentity.receiver);

  useEffect(() => {
    if (selectedRowIdentity == null) {
      requestRef.current?.abort();
      return undefined;
    }
    const timer = window.setTimeout(() => void loadRecord(selectedRowIdentity), 0);
    return () => window.clearTimeout(timer);
  }, [loadRecord, readSequence, selectedRowIdentity]);

  if (loading) {
    return <PhiSkeletonControl lines={config.presentation.fields.length || 7} withTitle />;
  }
  /*
   * Every error here is the source's -- no binding, a resource that reads no single records, a read that
   * failed -- and none of them is the reader's to fix, so it goes the way of every such failure.
   */
  const failure = contractError ?? error;
  if (failure) {
    return <PhiWidgetFailure renderMode={renderMode} widgetType={PhiCmsWidgetType.Record} title={failure} />;
  }
  if (!record) {
    return <PhiEmptyControl description={labels.empty} />;
  }

  /*
   * A refused action is not the source's failure: the record still stands, and the person who pressed
   * reads why above it, as a Table says a refused action above its rows.
   */
  const list = (
    <PhiDescriptionListControl
      presentation={config.presentation.appearance}
      columns={config.presentation.columns}
      items={config.presentation.fields.map((field) => ({
        key: field.key,
        label: field.label,
        full: field.full,
        value: renderPhiValueContent(readPhiDotPath(record, field.fieldKey), field, labels, "block"),
      }))}
    />
  );
  return config.actions.length === 0 ? list : (
    <PhiFlexControl vertical gap={token.paddingSM} style={{ minWidth: 0, width: "100%" }}>
      {recordActions.confirmDialog}
      {recordActions.error ? <PhiAlertControl level="error" showIcon title={recordActions.error} /> : null}
      {list}
    </PhiFlexControl>
  );
}
