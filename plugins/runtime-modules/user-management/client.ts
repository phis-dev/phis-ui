"use client";


export const loadPhiUserManagementRuntimeControllerClient = () =>
  import("../../../plugins/runtime-modules/user-management/controller/client")
    .then((module) => module.PhiUserManagementRuntimeControllerClient);

