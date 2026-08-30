import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "./ids";

export const PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Observability tables",
    description: "Runtime log data exposed by the Observability module.",
    resources: [{
      resourceKey: "logs",
      title: "Runtime logs",
      rowIdentityPath: "id",
      fields: [
        { key: "id", title: "ID", type: "string", required: true },
        { key: "ts", title: "Timestamp", type: "datetime" },
        { key: "level", title: "Level", type: "string" },
        { key: "service", title: "Service", type: "string" },
        { key: "event", title: "Event", type: "string" },
        { key: "area", title: "Area", type: "string" },
        { key: "userId", title: "User ID", type: "string" },
        { key: "requestId", title: "Request ID", type: "string" },
        { key: "message", title: "Message", type: "string" },
        { key: "actorRole", title: "Actor role", type: "string" },
        { key: "pluginKey", title: "Plugin", type: "string" },
        { key: "method", title: "Method", type: "string" },
        { key: "path", title: "Path", type: "string" },
        { key: "status", title: "Status", type: "number" },
        { key: "durationMs", title: "Duration", type: "number" },
        { key: "targetType", title: "Target type", type: "string" },
        { key: "targetId", title: "Target ID", type: "string" },
        { key: "meta", title: "Metadata", type: "json" },
        { key: "error", title: "Error", type: "json" },
      ],
      query: {
        search: true,
        filterFields: ["service", "level", "event", "area", "since"],
        sorting: "none",
        pagination: "offset",
      },
      recordRead: true,
    }],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
