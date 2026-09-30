"use client";

import type { ComponentType } from "react";

import type {
  PhiRuntimeModuleAuthoringClientProps,
  PhiRuntimeModuleId,
} from "../../types/cms-plugins";
import { createPhiRuntimeModuleClientManifestContext } from "./runtime-module-client-manifest-context";

export type PhiRuntimeModuleAuthoringClientLoader =
  () => Promise<ComponentType<PhiRuntimeModuleAuthoringClientProps>>;

export type PhiRuntimeModuleAuthoringClientManifest = ReadonlyMap<
  PhiRuntimeModuleId,
  PhiRuntimeModuleAuthoringClientLoader
>;

const authoringClientManifest = createPhiRuntimeModuleClientManifestContext<
  PhiRuntimeModuleAuthoringClientManifest
>("Runtime module Authoring Client manifest is not mounted.");

export const PhiRuntimeModuleAuthoringClientManifestProvider = authoringClientManifest.Provider;
export const usePhiRuntimeModuleAuthoringClientManifest = authoringClientManifest.useManifest;
