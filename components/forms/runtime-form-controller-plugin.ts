"use client";

import { createElement } from "react";

import type { PhiRuntimeControllerPlugin } from "../../types";
import { createPhiRuntimeControllerClient } from "../runtime/runtime-controller-client-factory";
import {
  PHI_RUNTIME_FORM_CONTROLLER_DEFINITION,
  type PhiRuntimeFormControllerConfig,
} from "./runtime-form-controller-definition";
import { PhiRuntimeFormControllerMount } from "./runtime-form-controller-mount";

export const PHI_RUNTIME_FORM_CONTROLLER_PLUGIN = {
  ...PHI_RUNTIME_FORM_CONTROLLER_DEFINITION,
  renderController: ({ address }) =>
    createElement(PhiRuntimeFormControllerMount, {
      address,
      registerInstance: false,
    }),
} satisfies PhiRuntimeControllerPlugin<PhiRuntimeFormControllerConfig>;

export const PhiRuntimeFormControllerClient = createPhiRuntimeControllerClient(
  PHI_RUNTIME_FORM_CONTROLLER_PLUGIN,
);
