"use client";


export const loadPhiObservabilityRuntimeControllerClient = () =>
  import("../../../plugins/runtime-modules/observability/controller/client")
    .then((module) => module.PhiObservabilityRuntimeControllerClient);

