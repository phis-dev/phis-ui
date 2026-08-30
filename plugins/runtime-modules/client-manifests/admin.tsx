"use client";

import { createPhiRuntimeModuleControllerClientManifestFromAreaContributions } from "../area-contributions-controller-client";
import { PHI_ADMIN_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "../client-area-contributions/admin";
import { PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST } from "./common";
import {
  definePhiRuntimeModuleRenderClientLoader,
  extendPhiRuntimeModuleRenderClientManifest,
} from "../../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../../constants/runtime-render-client-types";
import { extendPhiRuntimeModuleDataProviderClientManifest } from "../../../components/runtime/runtime-module-data-provider-client-manifest";
import { PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST } from "./common-data-providers";
import { PHI_AUTH_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../auth/client-data-providers";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../groups/client-data-providers";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../localization/client-data-providers";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../observability/client-data-providers";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../user-management/client-data-providers";
export { PHI_COMMON_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST as PHI_ADMIN_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST } from "./common";

export const PHI_ADMIN_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST =
  createPhiRuntimeModuleControllerClientManifestFromAreaContributions(
    PHI_ADMIN_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  );

export const PHI_ADMIN_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleRenderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
    [
      [
        PhiRuntimeRenderClientType.ObservabilityLogDetail,
        definePhiRuntimeModuleRenderClientLoader(
          () => import("../observability/widgets/log-detail/client")
            .then((module) => module.PhiObservabilityLogDetailWidgetClient),
        ),
      ],
    ],
  );

export const PHI_ADMIN_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleDataProviderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
    [
      ...PHI_AUTH_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
      ...PHI_GROUPS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
      ...PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
      ...PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
      ...PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
    ],
  );
