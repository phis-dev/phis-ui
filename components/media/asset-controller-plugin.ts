"use client";

import { createElement } from "react";

import type { PhiRuntimeControllerPlugin } from "../../types";
import { createPhiRuntimeControllerClient } from "../runtime/runtime-controller-client-factory";
import {
  PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION,
  type PhiAssetRuntimeControllerConfig,
} from "./asset-controller-definition";
import { PhiAssetRuntimeControllerMount } from "./asset-controller-mount";

export const PHI_ASSET_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ mountScope }) => createElement(PhiAssetRuntimeControllerMount, { mountScope }),
} satisfies PhiRuntimeControllerPlugin<PhiAssetRuntimeControllerConfig>;

export const PhiAssetRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_ASSET_RUNTIME_CONTROLLER_PLUGIN,
);
