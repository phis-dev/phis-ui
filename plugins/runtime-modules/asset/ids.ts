import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_ASSET_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/asset` as const satisfies PhiRuntimeModuleId;


export const PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS = {
  mediaFolders: createPhiSharedRuntimeDataProviderKey("options", "media-folders"),
  mediaCollection: createPhiSharedRuntimeDataProviderKey("collections", "media"),
} as const;
