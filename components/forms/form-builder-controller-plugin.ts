"use client";

import type { PhiRuntimeControllerPlugin } from "../../types/cms-plugins";
import { createPhiRuntimeControllerClient } from "../runtime/runtime-controller-client-factory";
import {
  PHI_FORM_BUILDER_CONTROLLER_DEFINITION,
  type PhiFormBuilderControllerConfig,
} from "./form-builder-controller-definition";

export const PHI_FORM_BUILDER_CONTROLLER_PLUGIN = {
  ...PHI_FORM_BUILDER_CONTROLLER_DEFINITION,
  renderController: () => null,
} satisfies PhiRuntimeControllerPlugin<PhiFormBuilderControllerConfig>;

export const PhiFormBuilderControllerClient = createPhiRuntimeControllerClient(
  PHI_FORM_BUILDER_CONTROLLER_PLUGIN,
);
