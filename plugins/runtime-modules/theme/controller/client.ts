"use client";

import { createElement } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { PhiThemeControllerRuntime } from "./runtime";
import {
  PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  type PhiThemeRuntimeControllerConfig,
  type PhiThemeRuntimeControllerPreload,
} from "./definition";

export const PHI_THEME_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ runtime, config, preloadData }) => {
    if (!preloadData?.setOptions || !preloadData.historyLabels) {
      throw new Error("Theme controller preload is missing its Set options or its history labels.");
    }
    return createElement(PhiThemeControllerRuntime, {
      runtime,
      config,
      setOptions: preloadData.setOptions,
      historyLabels: preloadData.historyLabels,
    });
  },
} satisfies PhiRuntimeControllerPlugin<PhiThemeRuntimeControllerConfig, PhiThemeRuntimeControllerPreload>;

export const PhiThemeRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_THEME_RUNTIME_CONTROLLER_PLUGIN,
);
