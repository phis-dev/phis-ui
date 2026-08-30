"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./ids";

export const PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/user-management/services/table"))
        .PhiUserManagementTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
