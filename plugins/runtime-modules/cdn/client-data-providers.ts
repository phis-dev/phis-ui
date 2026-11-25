"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS, PHI_CDN_RUNTIME_MODULE_ID } from "./ids";

export const PHI_CDN_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_CDN_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/table")).PhiCdnTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
