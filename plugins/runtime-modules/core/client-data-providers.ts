import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../constants/core-data-provider-keys";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";
import { PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS } from "../../../constants/thread-library-provider-keys";

export const PHI_CORE_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    loadLive: async () => (await import("./messaging/thread-inbox-table")).PhiThreadTableProviderClient,
  },
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
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteLocales,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../components/widgets/client/shared/core-options-providers"))
        .PhiSiteLocalesOptionsProviderClient,
    loadAuthoring: async () =>
      (await import("../../../components/widgets/client/shared/core-options-providers"))
        .PhiSiteLocalesOptionsProviderClient,
  },
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    loadLive: async () => (await import("./content-entries/table")).PhiContentEntriesTableProviderClient,
  },
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryTags,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    loadLive: async () => (await import("./content-entries/tags")).PhiContentEntryTagsOptionsProviderClient,
  },
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/table"))
        .PhiContentTableProviderClient,
    loadAuthoring: async () =>
      (await import("./services/table"))
        .PhiContentTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
