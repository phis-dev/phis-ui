"use client";

import { createPhiRuntimeModuleControllerClientManifestFromAreaContributions } from "../area-contributions-controller-client";
import { PHI_EDITOR_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "../client-area-contributions/editor";
import { PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST } from "./common";
export { PHI_COMMON_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST as PHI_EDITOR_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST } from "./common";
import { extendPhiRuntimeModuleDataProviderClientManifest } from "../../../components/runtime/runtime-module-data-provider-client-manifest";
import { PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST } from "./common-data-providers";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../localization/client-data-providers";

export const PHI_EDITOR_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST =
  createPhiRuntimeModuleControllerClientManifestFromAreaContributions(
    PHI_EDITOR_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  );

export const PHI_EDITOR_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST =
  PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST;

export const PHI_EDITOR_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleDataProviderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
    PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
  );
