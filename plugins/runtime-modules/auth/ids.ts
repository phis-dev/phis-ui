import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_AUTH_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/auth` as const satisfies PhiRuntimeModuleId;


export const PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS = {
  installations: createPhiSharedRuntimeDataProviderKey("tables", "auth-installations"),
} as const;

/**
 * The namespace this Module publishes its configuration facts under.
 *
 * Here rather than beside the resolver, so that naming it costs nothing: the catalog states the
 * namespace on every render and loads the resolver only where a page asks about it.
 */
export const PHI_AUTH_RUNTIME_MODULE_FEATURE_NAMESPACE = "auth";
