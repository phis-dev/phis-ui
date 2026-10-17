"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY, PHI_EDITOR_RUNTIME_MODULE_ID } from "./ids";

export const PHI_EDITOR_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("./services/releases-table")).PhiEditorReleasesTableProviderClient,
  },
] as const satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
