"use client";

import dynamic from "next/dynamic";
import { createPhiRuntimeModuleControllerClientManifestFromAreaContributions } from "../area-contributions-controller-client";
import { PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "../client-area-contributions/builder";
import { PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST } from "./common";
import {
  definePhiRuntimeModuleRenderClient,
  extendPhiRuntimeModuleRenderClientManifest,
} from "../../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../../constants/runtime-render-client-types";
import { PhiCmsWidgetType } from "../../../constants/cms-widget-types";
import { extendPhiRuntimeModuleDataProviderClientManifest } from "../../../components/runtime/runtime-module-data-provider-client-manifest";
import { PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST } from "./common-data-providers";
import { PHI_DASHBOARD_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../dashboard/client-data-providers";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../builder/client-data-providers";
import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../revisions/client-data-providers";
import { PHI_THEME_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../theme/client-data-providers";
import {
  PHI_AUTH_RUNTIME_MODULE_RENDER_CLIENT_LOADERS,
} from "./auth-render-clients";
export { PHI_COMMON_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST as PHI_BUILDER_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST } from "./common";

export const PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST =
  createPhiRuntimeModuleControllerClientManifestFromAreaContributions(
    PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  );

export const PHI_BUILDER_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleRenderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
    [
      ...PHI_AUTH_RUNTIME_MODULE_RENDER_CLIENT_LOADERS,
      [
        PhiCmsWidgetType.AssetFocalRect,
        definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/media/phi-asset-focal-rect-widget").then((module) => module.PhiAssetFocalRectWidget)),
      ),
      ],
      [
        PhiRuntimeRenderClientType.BuilderChromeControls,
        definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../builder/widgets/chrome-controls/client").then((module) => module.PhiBuilderChromeControlsWidgetClient)),
      ),
      ],
      [
        PhiRuntimeRenderClientType.BuilderDraftStatus,
        definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../builder/widgets/draft-status/authoring").then((module) => module.PhiDeveloperBuilderDraftStatusWidgetClient)),
      ),
      ],
      [
        PhiRuntimeRenderClientType.BuilderModeSwitch,
        definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../plugins/runtime-modules/builder/clients/mode-switch").then((module) => module.PhiBuilderModeSwitchWidgetClient)),
      ),
      ],
    ],
  );

export const PHI_BUILDER_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST =
  extendPhiRuntimeModuleDataProviderClientManifest(
    PHI_COMMON_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
    [
      ...PHI_DASHBOARD_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
      ...PHI_BUILDER_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
      ...PHI_REVISIONS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
      ...PHI_THEME_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS,
    ],
  );
