import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../contracts";
import { PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS } from "../../../constants/thread-library-provider-keys";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_THREADS_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/threads` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`): the id and,
 * where a Module declares one, its source locale. Stated here beside the id and spread into the
 * definition, so a Label Set a tree or a form reads does not import the definition that imports the
 * tree -- and a Module that writes in another language says so once.
 */
export const PHI_THREADS_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_THREADS_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;

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
