import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS } from "../../ids";
import type { PhiCmsWidgetPlugin, PhiCmsWidgetRuntimeControllerRequirementResolver } from "../../../../../types";
import type { PhiTableSourceBinding } from "../../../../../types/table-widget";
import { isPhiRuntimeDataProviderKey } from "../../../../../types/runtime-data-provider";
import {
  PHI_OBSERVABILITY_CONTROLLER_INSTANCE_KEY,
  PHI_OBSERVABILITY_CONTROLLER_TYPE,
} from "../../../../../plugins/runtime-modules/observability/controller/address";

export type PhiObservabilityLogDetailWidgetConfig = {
  source: PhiTableSourceBinding | null;
  openActionKey: string;
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
  };
}

const requirePhiObservabilityController: PhiCmsWidgetRuntimeControllerRequirementResolver<
  PhiObservabilityLogDetailWidgetConfig
> = ({ config }) => [{
  type: PHI_OBSERVABILITY_CONTROLLER_TYPE,
  instanceKey: PHI_OBSERVABILITY_CONTROLLER_INSTANCE_KEY,
  enabled: true,
  config: { openActionKey: config.openActionKey },
}];

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
  runtimeSignals: { emits: [], listens: [] },
  requiredRuntimeControllers: requirePhiObservabilityController,
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
  | "requiredRuntimeControllers"
  | "runtimeSignals"
  | "requiredDataProviders"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
