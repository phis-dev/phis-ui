"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "./ids";

export const PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.platformLocales,
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/localization/services/options"))
        .PhiLocalizationPlatformLocalesOptionsProviderClient,
  },
  {
    key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.adminSiteLocales,
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/localization/services/options"))
        .PhiLocalizationAdminSiteLocalesOptionsProviderClient,
  },
  {
    key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.siteLocales,
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/localization/services/options"))
        .PhiLocalizationSiteLocalesOptionsProviderClient,
  },
  {
    key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.translationContexts,
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/localization/services/options"))
        .PhiLocalizationTranslationContextsOptionsProviderClient,
  },
  {
    key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/localization/services/table"))
        .PhiLocalizationTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
