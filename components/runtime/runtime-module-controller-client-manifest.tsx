"use client";

import type { ComponentType } from "react";

import type {
  PhiRuntimeModuleControllerClientProps,
  PhiRuntimeModuleId,
} from "../../types/cms-plugins";
import { createPhiRuntimeModuleClientManifestContext } from "./runtime-module-client-manifest-context";

/**
 * A Module's Controller Client, as the manifest holds it.
 *
 * A component made with `next/dynamic(() => import(...))` at the Module's client entry, not a loader
 * function. Controllers render during the server render, and only a literal `dynamic()` call is entered
 * into the route's loadable manifest: the server then writes a preload hint for the Controller's chunks
 * into the HTML, where a loader behind `React.lazy` was only requested once hydration reached it.
 */
export type PhiRuntimeModuleControllerClient = ComponentType<PhiRuntimeModuleControllerClientProps>;

export type PhiRuntimeModuleControllerClientManifest = ReadonlyMap<
  PhiRuntimeModuleId,
  PhiRuntimeModuleControllerClient
>;

const controllerClientManifest = createPhiRuntimeModuleClientManifestContext<
  PhiRuntimeModuleControllerClientManifest
>("Runtime module Controller Client manifest is not mounted.");

export const PhiRuntimeModuleControllerClientManifestProvider = controllerClientManifest.Provider;
export const usePhiRuntimeModuleControllerClientManifest = controllerClientManifest.useManifest;
