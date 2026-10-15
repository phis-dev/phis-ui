import { createPhiRuntimeModuleDataProviderClientManifest } from "../../../components/runtime/runtime-module-data-provider-client-manifest";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../asset/client-data-providers";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../core/client-data-providers";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../threads/client-data-providers";

export const PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST =
  createPhiRuntimeModuleDataProviderClientManifest([
    ...PHI_CORE_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
    ...PHI_ASSET_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
    // Conversations are every Area's, so their listing is too.
    ...PHI_THREADS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
  ]);
