"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Descriptions, Flex, Skeleton, Tag, Typography } from "antd";

import { formatPhiDateTime } from "../../../../../helpers/format-date-time";
import {
  type PhiTableRowIdentity,
} from "../../../../../types/table-widget";
import { usePhiTableProvider } from "../../../../../components/widgets/client/shared/phi-table-provider";
import type { PhiObservabilityLogDetailWidgetConfig } from "./config";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { readPhiTableActionSignalValue } from "../../../../../types/table-widget";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogRow = {
  id: string;
  ts: string;
  level: LogLevel;
  service: string;
  event: string;
  message: string;
  area: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  meta: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
};

export type ObservabilityLogsWidgetLabels = {
  searchPlaceholder: string;
  serviceLabel: string;
  levelLabel: string;
  eventLabel: string;
  areaLabel: string;
  timeWindowLabel: string;
  timeWindowOptions: {
    lastHour: string;
    last6Hours: string;
    last24Hours: string;
    last7Days: string;
    last30Days: string;
  };
  serviceOptions: {
    server: string;
    site: string;
    shared: string;
  };
  levelOptions: {
    debug: string;
    info: string;
    warn: string;
    error: string;
  };
  columns: {
    time: string;
    level: string;
    service: string;
    event: string;
    area: string;
    user: string;
    requestId: string;
    message: string;
    actions: string;
  };
  detail: {
    title: string;
    meta: string;
    error: string;
    method: string;
    path: string;
    status: string;
  };
  empty: {
    title: string;
    text: string;
  };
};

type Props = {
  config: PhiObservabilityLogDetailWidgetConfig;
  labels: ObservabilityLogsWidgetLabels;
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function levelColor(level: LogLevel) {
  switch (level) {
    case "error":
      return "error";
    case "warn":
      return "warning";
    case "info":
      return "processing";
    default:
      return "default";
  }
}

export function PhiObservabilityLogDetailWidgetClient({ config, labels }: Props) {
  /*
   * Which record to show arrives as a signal, and is not read out of a store the widget knows about.
   *
   * The overlay this sits in mounts on first open, so the row action that opens it is addressed to a
   * widget that does not exist yet. The signal bus holds an addressed signal until its receiver is
   * usable, which is what lets this stay a declarative listener instead of reaching for module state.
   */
  const signalIdentity = usePhiSignalIdentity();
  const listenRoutes = config.signalRoutes?.listens ?? [];
  const [selectedRowIdentity, setSelectedRowIdentity] = useState<PhiTableRowIdentity | null>(null);
  const { provider, resource, bindingError } = usePhiTableProvider(config.source);
  const [selectedRow, setSelectedRow] = useState<LogRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const loadRecord = useCallback(async (rowIdentity: PhiTableRowIdentity) => {
    requestRef.current?.abort();
    setLoading(true);
    setError(null);
    setSelectedRow(null);
    if (bindingError || resource?.recordRead !== true || !provider?.readRecord || !config.source) {
      setError(bindingError ?? "The Observability log detail provider is not readable.");
      setLoading(false);
      return;
    }
    const abortController = new AbortController();
    requestRef.current = abortController;
    try {
      const record = await provider.readRecord({
        resourceKey: config.source.resourceKey,
        rowIdentity,
        params: config.source.params,
        signal: abortController.signal,
      });
      if (!abortController.signal.aborted) {
        setSelectedRow(record as LogRow);
      }
    } catch (readError) {
      if (!abortController.signal.aborted) {
        setError(readError instanceof Error ? readError.message : "The log detail could not be loaded.");
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [bindingError, config.source, provider, resource?.recordRead]);

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
      setSelectedRow(null);
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

  return (
    <Flex vertical gap={16} style={{ minWidth: 0, width: "100%" }}>
        {loading ? <Skeleton active paragraph={{ rows: 7 }} /> : null}
        {error ? <PhiAlertControl level="error" showIcon title={error} /> : null}
        {!loading && !error && selectedRow ? (
          <Flex vertical gap={16}>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label={labels.columns.time}>
                {formatPhiDateTime(selectedRow.ts)}
              </Descriptions.Item>
              <Descriptions.Item label={labels.columns.level}>
                <Tag color={levelColor(selectedRow.level)}>{labels.levelOptions[selectedRow.level]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={labels.columns.service}>
                <Tag>{selectedRow.service}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={labels.columns.event}>
                <Typography.Text code>{selectedRow.event}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label={labels.columns.area}>
                {formatValue(selectedRow.area)}
              </Descriptions.Item>
              <Descriptions.Item label={labels.detail.method}>{formatValue(selectedRow.method)}</Descriptions.Item>
              <Descriptions.Item label={labels.detail.path}>{formatValue(selectedRow.path)}</Descriptions.Item>
              <Descriptions.Item label={labels.detail.status}>{formatValue(selectedRow.status)}</Descriptions.Item>
              <Descriptions.Item label={labels.columns.message} span={2}>
                {selectedRow.message}
              </Descriptions.Item>
            </Descriptions>

            <Flex vertical gap={8}>
              <Typography.Text strong>{labels.detail.meta}</Typography.Text>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(selectedRow.meta ?? {}, null, 2)}
              </pre>
            </Flex>

            {selectedRow.error ? (
              <Flex vertical gap={8}>
                <Typography.Text strong>{labels.detail.error}</Typography.Text>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(selectedRow.error, null, 2)}
                </pre>
              </Flex>
            ) : null}
          </Flex>
        ) : null}
    </Flex>
  );
}
