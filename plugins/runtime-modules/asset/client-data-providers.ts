"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";

export const PHI_ASSET_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolders,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/options"))
        .PhiMediaFoldersOptionsProviderClient,
  },
  {
    key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/collection"))
        .PhiAssetCollectionProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
