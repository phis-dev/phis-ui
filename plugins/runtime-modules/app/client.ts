"use client";

export const loadPhiAppRuntimeControllerClient = () =>
  import("../../../components/runtime/app-base-controller-plugin")
    .then((module) => module.PhiAppBaseControllerClient);

