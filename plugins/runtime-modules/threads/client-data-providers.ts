"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS, PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THREADS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.inbox,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/collection")).PhiThreadCollectionProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
