"use client";

import type { PhiRuntimeModuleId } from "../../types/cms-plugins";
import type {
  PhiRuntimeModuleAuthoringClientLoader,
  PhiRuntimeModuleAuthoringClientManifest,
} from "../../components/runtime/runtime-module-authoring-client-manifest";

export type PhiRuntimeModuleAuthoringClientContribution = {
  moduleId: PhiRuntimeModuleId;
  loadAuthoring: PhiRuntimeModuleAuthoringClientLoader;
};

export function definePhiRuntimeModuleAuthoringClientContribution(
  contribution: PhiRuntimeModuleAuthoringClientContribution,
): PhiRuntimeModuleAuthoringClientContribution {
  return contribution;
}

export function createPhiRuntimeModuleAuthoringClientManifest(
  contributions: readonly PhiRuntimeModuleAuthoringClientContribution[],
): PhiRuntimeModuleAuthoringClientManifest {
  return extendPhiRuntimeModuleAuthoringClientManifest(new Map(), contributions);
}

export function extendPhiRuntimeModuleAuthoringClientManifest(
  base: PhiRuntimeModuleAuthoringClientManifest,
  contributions: readonly PhiRuntimeModuleAuthoringClientContribution[],
): PhiRuntimeModuleAuthoringClientManifest {
  const manifest = new Map(base);
  const moduleIds = new Set<PhiRuntimeModuleId>();
  for (const contribution of contributions) {
    if (moduleIds.has(contribution.moduleId) || manifest.has(contribution.moduleId)) {
      throw new Error(
        `Duplicate Authoring Client contribution for runtime module "${contribution.moduleId}".`,
      );
    }
    moduleIds.add(contribution.moduleId);
    manifest.set(contribution.moduleId, contribution.loadAuthoring);
  }
  return manifest;
}
