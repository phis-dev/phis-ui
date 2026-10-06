"use client";

import { createElement } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import {
  PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION,
  type PhiAssetRuntimeControllerConfig,
} from "./definition";
import { PhiAssetRuntimeControllerMount } from "./mount";

export const PHI_ASSET_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ address, mountScope, config }) =>
    createElement(PhiAssetRuntimeControllerMount, { address, mountScope, config }),
} satisfies PhiRuntimeControllerPlugin<PhiAssetRuntimeControllerConfig>;

export const PhiAssetRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_ASSET_RUNTIME_CONTROLLER_PLUGIN,
);
