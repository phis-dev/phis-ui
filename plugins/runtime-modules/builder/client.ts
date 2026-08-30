"use client";


export function loadPhiBuilderRuntimeControllerClient() {
  return import("./controller/client")
    .then((module) => module.PhiBuilderRuntimeControllerClient);
}

export function loadPhiBuilderRuntimeAuthoringClient() {
  return import("./authoring")
    .then((module) => module.PhiBuilderRuntimeModuleAuthoringClient);
}

