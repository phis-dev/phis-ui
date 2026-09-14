import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "../../../constants/media-library-provider-keys";

export const PHI_ASSET_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/asset` as const satisfies PhiRuntimeModuleId;


/**
 * The Module's own view of the two keys it answers. The names themselves are a Foundation contract, so
 * a Widget outside this Module cites those and never this file; these aliases exist because a Module
 * should not have to spell its own namespace back to itself.
 */
export const PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS = {
  mediaFolders: PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.folders,
  mediaCollection: PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection,
} as const;
