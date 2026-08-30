"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_THEME_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THEME_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_THEME_RUNTIME_DATA_PROVIDER_KEYS.themePresets,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/theme/services/options"))
        .PhiThemePresetsOptionsProviderClient,
    loadAuthoring: async () =>
      (await import("../../../plugins/runtime-modules/theme/services/options"))
        .PhiThemePresetsOptionsProviderClient,
  },
  {
    key: PHI_THEME_RUNTIME_DATA_PROVIDER_KEYS.themeKeys,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/theme/services/options"))
        .PhiThemeKeysOptionsProviderClient,
    loadAuthoring: async () =>
      (await import("../../../plugins/runtime-modules/theme/services/options"))
        .PhiThemeKeysOptionsProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
