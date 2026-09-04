import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS } from "../../ids";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiTableSourceBinding } from "../../../../../types/table-widget";
import { isPhiRuntimeDataProviderKey } from "../../../../../types/runtime-data-provider";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet } from "../../../../../types/signals";

export type PhiObservabilityLogDetailWidgetConfig = {
  source: PhiTableSourceBinding | null;
  openActionKey: string;
  signalRoutes: ReturnType<typeof readPhiSignalRouteSet>;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export function parsePhiObservabilityLogDetailWidgetConfig(
  rawConfig: Record<string, unknown>,
): PhiObservabilityLogDetailWidgetConfig {
  const source = readRecord(rawConfig.source);
  const providerKey = typeof source.providerKey === "string" ? source.providerKey : "";
  const resourceKey = typeof source.resourceKey === "string" ? source.resourceKey.trim() : "";
  return {
    source: isPhiRuntimeDataProviderKey(providerKey) && resourceKey
      ? {
          providerKey,
          resourceKey,
          params: readRecord(source.params),
        }
      : null,
    openActionKey: typeof rawConfig.openActionKey === "string" && rawConfig.openActionKey.trim()
      ? rawConfig.openActionKey.trim()
      : "view",
    signalRoutes: readPhiSignalRouteSet(rawConfig.signalRoutes),
  };
}

export const PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("observability-log-detail"),
  typeKey: "observability-log-detail",
  title: "Observability Log Detail",
  description: "Displays the complete record for a selected site-runtime log entry.",
  category: "data",
  tags: ["logs", "detail", "observability"],
  icon: "antd:file-search",
  slotSizePolicy: "fill-inline",
  runtimeSignals: {
    emits: [],
    listens: [
      {
        id: "recordOpen",
        channel: "action",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      { id: "close", channel: "state", action: "change", valueType: "boolean" },
    ],
  },
  requiredDataProviders: [PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS.table],
  fields: [
    {
      key: "source",
      type: "data-provider",
      providerKind: "table",
      label: "Log source",
      required: true,
    },
    { key: "openActionKey", type: "string", label: "Open action key", required: true },
  ],
  defaultConfig: {
    source: {
      providerKey: PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS.table,
      resourceKey: "logs",
    },
    openActionKey: "view",
    signalRoutes: null,
  },
  parseConfig: parsePhiObservabilityLogDetailWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiObservabilityLogDetailWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "requiredDataProviders"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
