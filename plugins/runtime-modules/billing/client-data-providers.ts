"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS, PHI_BILLING_RUNTIME_MODULE_ID } from "./ids";

export const PHI_BILLING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.documents,
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/documents-table")).PhiBillingDocumentsTableProviderClient,
  },
  {
    key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.series,
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/series-table")).PhiBillingSeriesTableProviderClient,
  },
  {
    key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.issuers,
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/series-options")).PhiBillingIssuersOptionsProviderClient,
  },
  {
    key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.nextNumber,
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/series-options")).PhiBillingNextNumberOptionsProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
