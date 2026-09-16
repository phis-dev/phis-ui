"use client";

import dynamic from "next/dynamic";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";

/*
 * next/dynamic rather than a loader: rendered during the server render, it names its chunks in the
 * route's loadable manifest, and the HTML asks for them before hydration instead of after it.
 */
export const PhiLazyRevisionsRuntimeControllerClient = dynamic(() =>
  import("../../../plugins/runtime-modules/revisions/controller/client").then((module) => module.PhiRevisionsRuntimeControllerClient));

export const PHI_REVISIONS_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION =
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
    Controller: PhiLazyRevisionsRuntimeControllerClient,
  });

