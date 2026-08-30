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
  renderController: ({ preloadData }) => {
    if (
      !preloadData?.shellPresetDraftsByArea ||
      !preloadData.runtimeModuleDefinitions ||
      !preloadData.runtimeModuleIdsByArea ||
      !preloadData.modulePresetPagesByArea ||
      !preloadData.areaPresetSourcesByArea ||
      !preloadData.navigationSurfacesByArea ||
      !preloadData.pageMetaLabels
    ) {
      throw new Error("Builder runtime controller requires server preload data.");
    }

    return createElement(PhiDeveloperBuilderWorkspaceControllerMount, {
      shellPresetDraftsByArea: preloadData.shellPresetDraftsByArea,
      runtimeModuleDefinitions: preloadData.runtimeModuleDefinitions,
      runtimeModuleIdsByArea: preloadData.runtimeModuleIdsByArea,
      modulePresetPagesByArea: preloadData.modulePresetPagesByArea,
      areaPresetSourcesByArea: preloadData.areaPresetSourcesByArea,
      navigationSurfacesByArea: preloadData.navigationSurfacesByArea,
      pageMetaLabels: preloadData.pageMetaLabels,
    });
  },
} satisfies PhiRuntimeControllerPlugin<
  PhiBuilderRuntimeControllerConfig,
  PhiBuilderRuntimeControllerPreload
>;

export const PhiBuilderRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_BUILDER_RUNTIME_CONTROLLER_PLUGIN,
);
