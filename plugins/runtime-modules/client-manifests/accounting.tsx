"use client";

import { createPhiRuntimeModuleControllerClientManifestFromAreaContributions } from "../area-contributions-controller-client";
import { PHI_ACCOUNTING_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "../client-area-contributions/accounting";
import { PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST, PHI_COMMON_RUNTIME_MODULE_UI_PROVIDER_CLIENT_MANIFEST } from "./common";
import { extendPhiRuntimeModuleUiProviderClientManifest } from "../../../components/runtime/runtime-module-ui-provider-client-manifest";
import { PHI_BILLING_RUNTIME_MODULE_UI_PROVIDER_CLIENT_DEFINITION } from "../billing/client-ui-provider";
import { PHI_BILLING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../billing/client-data-providers";
import { PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST } from "./common-data-providers";
import { extendPhiRuntimeModuleDataProviderClientManifest } from "../../../components/runtime/runtime-module-data-provider-client-manifest";
import { PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../accounting/client-data-providers";
import { PHI_DASHBOARD_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../dashboard/client-data-providers";
export { PHI_COMMON_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST as PHI_ACCOUNTING_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST } from "./common";
export { PHI_COMMON_RUNTIME_MODULE_MEDIA_SOURCE_CLIENT_MANIFEST as PHI_ACCOUNTING_RUNTIME_MODULE_MEDIA_SOURCE_CLIENT_MANIFEST } from "./common";
// The Billing Module brings its Form field registry beside the common providers.
export const PHI_ACCOUNTING_RUNTIME_MODULE_UI_PROVIDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleUiProviderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_UI_PROVIDER_CLIENT_MANIFEST,
    [PHI_BILLING_RUNTIME_MODULE_UI_PROVIDER_CLIENT_DEFINITION],
  );

export const PHI_ACCOUNTING_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST =
  createPhiRuntimeModuleControllerClientManifestFromAreaContributions(
    PHI_ACCOUNTING_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  );

export const PHI_ACCOUNTING_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST =
  PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST;

export const PHI_ACCOUNTING_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleDataProviderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
    [
      ...PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
      ...PHI_DASHBOARD_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
      ...PHI_BILLING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
    ],
  );
