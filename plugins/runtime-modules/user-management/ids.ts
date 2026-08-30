import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/user-management` as const satisfies PhiRuntimeModuleId;


export const PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "user-management"),
} as const;
