"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_APP_ADDRESSES_DATA_PROVIDER_KEY, PHI_APP_RUNTIME_MODULE_ID } from "./ids";

export const PHI_APP_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_APP_ADDRESSES_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    loadLive: async () => (await import("./services/addresses-table")).PhiAppAddressesTableProviderClient,
  },
] as const satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
