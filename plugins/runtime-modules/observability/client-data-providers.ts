"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "./ids";

export const PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/observability/services/table"))
        .PhiObservabilityTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
