import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_CORE_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/core` as const satisfies PhiRuntimeModuleId;


export const PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS = {
  spacingScale: createPhiSharedRuntimeDataProviderKey("options", "spacing-scale"),
  contentTable: createPhiSharedRuntimeDataProviderKey("tables", "content"),
} as const;
