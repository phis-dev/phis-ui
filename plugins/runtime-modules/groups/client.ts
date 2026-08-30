"use client";


export const loadPhiGroupsRuntimeControllerClient = () =>
  import("../../../plugins/runtime-modules/groups/controller/client")
    .then((module) => module.PhiGroupsRuntimeControllerClient);

