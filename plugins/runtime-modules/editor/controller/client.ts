"use client";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import {
  PHI_EDITOR_RUNTIME_CONTROLLER_DEFINITION,
  type PhiEditorControllerConfig,
} from "./definition";

export const PHI_EDITOR_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_EDITOR_RUNTIME_CONTROLLER_DEFINITION,
  renderController: () => null,
} satisfies PhiRuntimeControllerPlugin<PhiEditorControllerConfig>;

export const PhiEditorRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_EDITOR_RUNTIME_CONTROLLER_PLUGIN,
);
