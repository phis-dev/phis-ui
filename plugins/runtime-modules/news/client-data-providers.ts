"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS, PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_NEWS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/table")).PhiNewsTableProviderClient,
  },
  {
    key: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.tags,
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/options")).PhiNewsTagsOptionsProviderClient,
  },
] as const satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
