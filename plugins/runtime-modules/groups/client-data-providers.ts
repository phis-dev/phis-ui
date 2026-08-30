"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_GROUPS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.groupOptions,
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/groups/services/options"))
        .PhiGroupOptionsProviderClient,
  },
  {
    key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.myGroupOptions,
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/groups/services/options"))
        .PhiMyGroupOptionsProviderClient,
  },
  {
    key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.memberCandidates,
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/groups/services/options"))
        .PhiGroupMemberCandidatesOptionsProviderClient,
  },
  {
    key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/groups/services/table"))
        .PhiGroupsTableProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
