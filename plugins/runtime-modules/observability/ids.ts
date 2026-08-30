import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_OBSERVABILITY_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/observability` as const satisfies PhiRuntimeModuleId;


export const PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "observability"),
} as const;
