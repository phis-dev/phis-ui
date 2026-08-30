"use client";

export const loadPhiCoreRuntimeControllerClient = () =>
  import("../../../components/runtime/core-runtime-controller-plugin")
    .then((module) => module.PhiCoreRuntimeControllerClient);

export const loadPhiCoreRuntimeAuthoringClient = () =>
  import("./authoring")
    .then((module) => module.PhiCoreRuntimeModuleAuthoringClient);
