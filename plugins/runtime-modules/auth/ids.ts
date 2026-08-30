import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_AUTH_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/auth` as const satisfies PhiRuntimeModuleId;


export const PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS = {
  installations: createPhiSharedRuntimeDataProviderKey("tables", "auth-installations"),
} as const;
