"use client";

export const loadPhiEditorRuntimeControllerClient = () =>
  import("../../../plugins/runtime-modules/editor/controller/client")
    .then((module) => module.PhiEditorRuntimeControllerClient);

