"use client";

export const loadPhiFormBuilderRuntimeControllerClient = () =>
  import("../../../components/forms/form-builder-controller-plugin")
    .then((module) => module.PhiFormBuilderControllerClient);

