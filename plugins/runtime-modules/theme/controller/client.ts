"use client";

import { createElement } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { PhiBuilderBrandThemeControllerWidgetClient } from "../widgets/brand-controls/client";
import {
  PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  type PhiThemeRuntimeControllerConfig,
  type PhiThemeRuntimeControllerPreload,
} from "./definition";

export const PHI_THEME_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ runtime, preloadData }) => {
    if (!preloadData?.setOptions) {
      throw new Error("Theme controller preload is missing its Set options.");
    }
    return createElement(PhiBuilderBrandThemeControllerWidgetClient, {
      runtime,
      setOptions: preloadData.setOptions,
    });
  },
} satisfies PhiRuntimeControllerPlugin<PhiThemeRuntimeControllerConfig, PhiThemeRuntimeControllerPreload>;

export const PhiThemeRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_THEME_RUNTIME_CONTROLLER_PLUGIN,
);
