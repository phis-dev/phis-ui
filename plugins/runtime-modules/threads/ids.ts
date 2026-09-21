import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS } from "../../../constants/thread-library-provider-keys";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_THREADS_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/threads` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's own view of the keys it answers. The names are a Foundation contract, so anybody outside
 * this Module cites those; these aliases exist so a Module need not spell its own namespace back to
 * itself.
 */
export const PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS = {
  inbox: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table,
  // Not a Foundation name: who this viewer may write to is what this Module's own form asks, and a
  // Module offering its own inbox asks the Core route the same way rather than borrowing this key.
  candidates: createPhiSharedRuntimeDataProviderKey("options", "thread-candidates"),
} as const;
