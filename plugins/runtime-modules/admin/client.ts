"use client";

export const loadPhiAdminRuntimeControllerClient = () =>
  import("../../../plugins/runtime-modules/admin/controller/client")
    .then((module) => module.PhiAdminRuntimeControllerClient);

