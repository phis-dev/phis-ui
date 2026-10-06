"use client";

import { createElement } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { PhiDeveloperBuilderWorkspaceControllerMount } from "./mount";
import {
  PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION,
  type PhiBuilderRuntimeControllerConfig,
  type PhiBuilderRuntimeControllerPreload,
} from "./definition";

export const PHI_BUILDER_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ preloadData, config }) => {
    if (
      !preloadData?.shellPresetDraftsByArea ||
      !preloadData.runtimeModuleDefinitions ||
      !preloadData.runtimeModuleIdsByArea ||
      !preloadData.modulePresetPagesByArea ||
      !preloadData.areaPresetSourcesByArea ||
      !preloadData.navigationSurfacesByArea ||
      !preloadData.unresolvedModuleIdsByArea ||
      !preloadData.serverUnavailableModules ||
      !preloadData.publicRouteClaims ||
      !preloadData.publicRoutePaths ||
      !preloadData.areaRootRoutesByArea ||
      !preloadData.areaMetaByArea ||
      !preloadData.areaControllerSettingsByArea ||
      !preloadData.pageMetaLabels ||
      !preloadData.historyLabels
    ) {
      throw new Error("Builder runtime controller requires server preload data.");
    }

    return createElement(PhiDeveloperBuilderWorkspaceControllerMount, {
      signalRoutes: config.signalRoutes,
      shellPresetDraftsByArea: preloadData.shellPresetDraftsByArea,
      runtimeModuleDefinitions: preloadData.runtimeModuleDefinitions,
      runtimeModuleIdsByArea: preloadData.runtimeModuleIdsByArea,
      modulePresetPagesByArea: preloadData.modulePresetPagesByArea,
      areaPresetSourcesByArea: preloadData.areaPresetSourcesByArea,
      navigationSurfacesByArea: preloadData.navigationSurfacesByArea,
      unresolvedModuleIdsByArea: preloadData.unresolvedModuleIdsByArea,
      serverUnavailableModules: preloadData.serverUnavailableModules,
      publicRouteClaims: preloadData.publicRouteClaims,
      publicRoutePaths: preloadData.publicRoutePaths,
      areaRootRoutesByArea: preloadData.areaRootRoutesByArea,
      areaMetaByArea: preloadData.areaMetaByArea,
      areaControllerSettingsByArea: preloadData.areaControllerSettingsByArea,
      pageMetaLabels: preloadData.pageMetaLabels,
      historyLabels: preloadData.historyLabels,
    });
  },
} satisfies PhiRuntimeControllerPlugin<
  PhiBuilderRuntimeControllerConfig,
  PhiBuilderRuntimeControllerPreload
>;

export const PhiBuilderRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_BUILDER_RUNTIME_CONTROLLER_PLUGIN,
);
