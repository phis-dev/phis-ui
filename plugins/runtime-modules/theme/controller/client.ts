"use client";

import { createElement } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { PhiBuilderBrandThemeControllerWidgetClient } from "../widgets/brand-controls/client";
import {
  PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  type PhiThemeRuntimeControllerConfig,
} from "./definition";

export const PHI_THEME_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ runtime }) => createElement(PhiBuilderBrandThemeControllerWidgetClient, { runtime }),
} satisfies PhiRuntimeControllerPlugin<PhiThemeRuntimeControllerConfig>;

export const PhiThemeRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_THEME_RUNTIME_CONTROLLER_PLUGIN,
);
