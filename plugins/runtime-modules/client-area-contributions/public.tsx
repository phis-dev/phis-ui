"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../public/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_NEWS_RUNTIME_MODULE_ID } from "../news/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { PhiLazyPublicRuntimeControllerClient } from "../public/client";
import { PhiLazyAuthRuntimeControllerClient } from "../auth/client";
import { PhiLazyNewsRuntimeControllerClient } from "../news/client";

export const PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    Controller: PhiLazyPublicRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
    Controller: PhiLazyAuthRuntimeControllerClient,
  }),
  /*
   * Carried here although no Public Page asks for it: every Area that carries a Module must be able to load
   * its Controller, and the mount policy decides whether anything does. The News list on a Public page needs
   * none of it, so nothing mounts -- but an Area that could not load it would be a Module half installed.
   */
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_NEWS_RUNTIME_MODULE_ID,
    Controller: PhiLazyNewsRuntimeControllerClient,
  }),
] as const;
