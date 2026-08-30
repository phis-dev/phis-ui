"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_REVISIONS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.bindings,
    ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/revisions/services/options"))
        .PhiRevisionsBindingsOptionsProviderClient,
  },
  {
    key: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/revisions/services/table"))
        .PhiRevisionsTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
