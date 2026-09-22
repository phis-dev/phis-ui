"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY } from "./ids";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

export const PHI_DASHBOARD_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/dashboard/services/collection"))
        .PhiDashboardCardCollectionProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
