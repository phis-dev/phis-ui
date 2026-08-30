import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_GROUPS_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/groups` as const satisfies PhiRuntimeModuleId;


export const PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "groups"),
  groupOptions: createPhiSharedRuntimeDataProviderKey("options", "groups"),
  memberCandidates: createPhiSharedRuntimeDataProviderKey("options", "group-member-candidates"),
  myGroupOptions: createPhiSharedRuntimeDataProviderKey("options", "my-groups"),
} as const;
