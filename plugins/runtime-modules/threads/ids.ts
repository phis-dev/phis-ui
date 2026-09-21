import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import {
  PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS,
  PHI_THREAD_LIBRARY_ITEM_RENDERER_KEY,
} from "../../../constants/thread-library-provider-keys";

export const PHI_THREADS_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/threads` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's own view of the keys it answers. The names are a Foundation contract, so anybody outside
 * this Module cites those; these aliases exist so a Module need not spell its own namespace back to
 * itself.
 */
export const PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS = {
  inbox: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.collection,
} as const;

/** The row this Module ships for a conversation; a Site may name another. */
export const PHI_THREADS_RUNTIME_ITEM_RENDERER_KEY = PHI_THREAD_LIBRARY_ITEM_RENDERER_KEY;
