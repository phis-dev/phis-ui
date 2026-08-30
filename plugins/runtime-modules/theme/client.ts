"use client";


export const loadPhiThemeRuntimeControllerClient = () =>
  import("../../../plugins/runtime-modules/theme/controller/client")
    .then((module) => module.PhiThemeRuntimeControllerClient);

