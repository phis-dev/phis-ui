"use client";


export const loadPhiLocalizationRuntimeControllerClient = () =>
  import("../../../plugins/runtime-modules/localization/controller/client")
    .then((module) => module.PhiLocalizationRuntimeControllerClient);

