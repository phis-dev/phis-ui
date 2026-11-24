"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS, PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THREADS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.candidates,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/options")).PhiThreadCandidatesOptionsProviderClient,
  },
  {
    key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.customerFile,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/customer-file-table")).PhiThreadsCustomerFileTableProviderClient,
  },
  {
    key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.customerFileAddresses,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/customer-file-addresses")).PhiThreadsCustomerFileAddressesProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
