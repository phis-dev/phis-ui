"use client";

export const loadPhiPublicRuntimeControllerClient = () =>
  import("../../../components/runtime/public-base-controller-plugin")
    .then((module) => module.PhiPublicBaseControllerClient);

