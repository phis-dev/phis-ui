"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY, PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./ids";

export const PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/products-table")).PhiAccountingProductsTableProviderClient,
  },
] as const satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
