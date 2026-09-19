"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiDescriptionListControl } from "../../../../../components/controls/phi-description-list-control";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiSkeletonControl } from "../../../../../components/controls/phi-skeleton-control";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { renderPhiValueContent } from "../../../../../components/widgets/client/shared/phi-rendered-value";
import { usePhiTableProvider } from "../../../../../components/widgets/client/shared/phi-table-provider";
import {
  PHI_RECORD_WIDGET_DEFAULT_LABELS,
  formatPhiRecordWidgetLabel,
  type PhiRecordWidgetLabels,
} from "../../../../../components/widgets/label-types/record";
import type { PhiRecordWidgetConfig } from "../../../../../types/record-widget";
import {
  readPhiTableActionSignalValue,
  type PhiTableRowIdentity,
} from "../../../../../types/table-widget";

export type PhiRecordWidgetClientProps = {
  config: PhiRecordWidgetConfig;
  labels?: PhiRecordWidgetLabels;
};

/** A Provider field, dotted for a value that sits inside another one. */
function readRecordValue(record: Record<string, unknown>, path: string) {
  return path.split(".").filter(Boolean).reduce<unknown>((current, segment) =>
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)[segment]
      : undefined, record);
}

export function PhiRecordWidgetClient({
  config,
  labels = PHI_RECORD_WIDGET_DEFAULT_LABELS,
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
  const signalIdentity = usePhiSignalIdentity();
  const listenRoutes = config.signalRoutes?.listens ?? [];
  const { provider, resource, bindingError } = usePhiTableProvider(config.source);
  const [selectedRowIdentity, setSelectedRowIdentity] = useState<PhiTableRowIdentity | null>(null);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

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
        signal: abortController.signal,
      });
      if (!abortController.signal.aborted) {
        setRecord(loaded);
      }
    } catch (readError) {
      if (!abortController.signal.aborted) {
        setError(readError instanceof Error ? readError.message : labels.loadFailed);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [bindingError, config.source, labels, provider, resource?.recordRead]);

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
      setSelectedRowIdentity(action.rowIdentity);
    } else if (route.capabilityId === "close" && signal.value === false) {
      setSelectedRowIdentity(null);
      setRecord(null);
      setError(null);
    }
  }, [config.openActionKey, listenRoutes, signalIdentity.receiver]), useMemo(() => {
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
  }, [loadRecord, selectedRowIdentity]);

  if (loading) {
    return <PhiSkeletonControl lines={config.presentation.fields.length || 7} withTitle />;
  }
  if (error) {
    return <PhiAlertControl level="error" showIcon title={error} />;
  }
  if (!record) {
    return <PhiEmptyControl description={labels.empty} />;
  }

  return (
    <PhiDescriptionListControl
      presentation={config.presentation.appearance}
      columns={config.presentation.columns}
      items={config.presentation.fields.map((field) => ({
        key: field.key,
        label: field.label,
        full: field.full,
        value: renderPhiValueContent(readRecordValue(record, field.fieldKey), field, "block"),
      }))}
    />
  );
}
