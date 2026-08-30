"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";

export const loadPhiRevisionsRuntimeControllerClient = () =>
  import("../../../plugins/runtime-modules/revisions/controller/client")
    .then((module) => module.PhiRevisionsRuntimeControllerClient);

export const PHI_REVISIONS_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION =
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
    loadController: () => loadPhiRevisionsRuntimeControllerClient(),
  });

