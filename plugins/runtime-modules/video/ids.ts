import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiModuleScopedKey } from "../../../constants/runtime-module-ownership";
import type { PhiVideoProviderKey } from "../../../types/video";

export const PHI_VIDEO_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/video` as const satisfies PhiRuntimeModuleId;

/**
 * The providers this Module ships. An add-on brings its own under its own package name and never passes
 * through this table -- that is the whole point of the namespace being open at the package end.
 */
export const PHI_VIDEO_PROVIDER_KEYS = {
  youtube: createPhiModuleScopedKey("video-providers", "youtube") satisfies PhiVideoProviderKey,
  vimeo: createPhiModuleScopedKey("video-providers", "vimeo") satisfies PhiVideoProviderKey,
} as const;
