import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "./ids";

export const PHI_BUILDER_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.builderPages,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./options-providers"))
        .PhiBuilderPagesOptionsProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalSenders,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./signal-wiring-options"))
        .PhiBuilderSignalSendersOptionsProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalSenderCapabilities,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./signal-wiring-options"))
        .PhiBuilderSignalSenderCapabilitiesOptionsProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalReceivers,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./signal-wiring-options"))
        .PhiBuilderSignalReceiversOptionsProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalReceiverCapabilities,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./signal-wiring-options"))
        .PhiBuilderSignalReceiverCapabilitiesOptionsProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.pageSourceTree,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/page-source-tree"))
        .PhiBuilderPageSourceTreeProviderClient,
    loadAuthoring: async () =>
      (await import("./services/page-source-tree"))
        .PhiBuilderPageSourceTreeProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.builderNavigationSets,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./options-providers"))
        .PhiBuilderNavigationSetsOptionsProviderClient,
    loadAuthoring: async () =>
      (await import("./options-providers"))
        .PhiBuilderNavigationSetsOptionsProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.forms,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./options-providers"))
        .PhiBuilderFormsOptionsProviderClient,
    loadAuthoring: async () =>
      (await import("./options-providers"))
        .PhiBuilderFormsOptionsProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModules,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./options-providers"))
        .PhiRuntimeModulesOptionsProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModulesTable,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/runtime-modules-table"))
        .PhiBuilderRuntimeModulesTableProviderClient,
    loadAuthoring: async () =>
      (await import("./services/runtime-modules-table"))
        .PhiBuilderRuntimeModulesTableProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.navigationTable,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/navigation-table"))
        .PhiBuilderNavigationTableProviderClient,
    loadAuthoring: async () =>
      (await import("./services/navigation-table"))
        .PhiBuilderNavigationTableProviderClient,
  },
  {
    key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalRoutesTable,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/signal-routes-table"))
        .PhiBuilderSignalRoutesTableProviderClient,
    loadAuthoring: async () =>
      (await import("./services/signal-routes-table"))
        .PhiBuilderSignalRoutesTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
