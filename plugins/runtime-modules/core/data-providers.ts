import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";

export const PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.spacingScale,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "static",
    authoringMode: "read",
    title: "Spacing scale",
    description: "Shared padding and margin token options.",
  },
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "static",
    authoringMode: "read",
    title: "Content table",
    description: "Package-owned static table resources.",
    resources: [{
      resourceKey: "empty",
      title: "Empty table",
      description: "Neutral package-owned baseline for a provider-bound table.",
      rowIdentityPath: "id",
      fields: [{ key: "id", title: "ID", type: "string", required: true }],
      query: { search: true, sorting: "multiple", pagination: "offset" },
    }],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
