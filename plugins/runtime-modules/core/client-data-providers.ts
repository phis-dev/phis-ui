import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";

export const PHI_CORE_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.spacingScale,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../components/widgets/client/shared/core-options-providers"))
        .PhiSpacingScaleOptionsProviderClient,
    loadAuthoring: async () =>
      (await import("../../../components/widgets/client/shared/core-options-providers"))
        .PhiSpacingScaleOptionsProviderClient,
  },
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../components/widgets/client/shared/core-table-providers"))
        .PhiContentTableProviderClient,
    loadAuthoring: async () =>
      (await import("../../../components/widgets/client/shared/core-table-providers"))
        .PhiContentTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
