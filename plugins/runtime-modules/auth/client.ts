"use client";


export const loadPhiAuthRuntimeControllerClient = () =>
  import("../../../components/runtime/auth-controller-plugin")
    .then((module) => module.PhiAuthControllerClient);

