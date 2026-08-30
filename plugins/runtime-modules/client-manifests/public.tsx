"use client";

import { createPhiRuntimeModuleControllerClientManifestFromAreaContributions } from "../area-contributions-controller-client";
import { PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "../client-area-contributions/public";
import { PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST } from "./common";
import { extendPhiRuntimeModuleRenderClientManifest } from "../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_AUTH_RUNTIME_MODULE_RENDER_CLIENT_LOADERS,
  PHI_CONTACT_FORM_RENDER_CLIENT_LOADER,
} from "./auth-render-clients";
export { PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST as PHI_PUBLIC_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST } from "./common-data-providers";
export { PHI_COMMON_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST as PHI_PUBLIC_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST } from "./common";

export const PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST =
  createPhiRuntimeModuleControllerClientManifestFromAreaContributions(
    PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  );

export const PHI_PUBLIC_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleRenderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
    [
      ...PHI_AUTH_RUNTIME_MODULE_RENDER_CLIENT_LOADERS,
      PHI_CONTACT_FORM_RENDER_CLIENT_LOADER,
    ],
  );
