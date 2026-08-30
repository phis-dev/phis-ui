"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";

export const PHI_AUTH_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS.installations,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../components/forms/auth-installations-table-service"))
        .PhiAuthInstallationsTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
