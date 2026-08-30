import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_REVISIONS_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/revisions` as const satisfies PhiRuntimeModuleId;


export const PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "revisions"),
  bindings: createPhiSharedRuntimeDataProviderKey("options", "revision-bindings"),
} as const;
