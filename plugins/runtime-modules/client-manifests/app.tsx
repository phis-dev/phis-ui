"use client";

import { createPhiRuntimeModuleControllerClientManifestFromAreaContributions } from "../area-contributions-controller-client";
import { PHI_APP_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "../client-area-contributions/app";
import { PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST } from "./common";
import { PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST } from "./common-data-providers";
import { extendPhiRuntimeModuleDataProviderClientManifest } from "../../../components/runtime/runtime-module-data-provider-client-manifest";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../groups/client-data-providers";
import { extendPhiRuntimeModuleRenderClientManifest } from "../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_AUTH_SECURITY_RENDER_CLIENT_LOADER } from "./auth-render-clients";
export const PHI_APP_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleDataProviderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
    // The App reads groups too: someone sees which groups they are in and who else is in them.
    [...PHI_GROUPS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS],
  );
export { PHI_COMMON_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST as PHI_APP_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST } from "./common";

export const PHI_APP_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST =
  createPhiRuntimeModuleControllerClientManifestFromAreaContributions(
    PHI_APP_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  );

export const PHI_APP_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleRenderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
    [PHI_AUTH_SECURITY_RENDER_CLIENT_LOADER],
  );
