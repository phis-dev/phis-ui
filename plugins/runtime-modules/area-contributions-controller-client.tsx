"use client";

import type { PhiRuntimeModuleId } from "../../types/cms-plugins";
import type {
  PhiRuntimeModuleControllerClientLoader,
  PhiRuntimeModuleControllerClientManifest,
} from "../../components/runtime/runtime-module-controller-client-manifest";

export type PhiRuntimeModuleControllerClientAreaContribution = {
  moduleId: PhiRuntimeModuleId;
  loadController: PhiRuntimeModuleControllerClientLoader;
};

export function definePhiRuntimeModuleControllerClientAreaContribution(
  contribution: PhiRuntimeModuleControllerClientAreaContribution,
): PhiRuntimeModuleControllerClientAreaContribution {
  return contribution;
}

export function createPhiRuntimeModuleControllerClientManifestFromAreaContributions(
  contributions: readonly PhiRuntimeModuleControllerClientAreaContribution[],
): PhiRuntimeModuleControllerClientManifest {
  return extendPhiRuntimeModuleControllerClientManifest(
    new Map(),
    contributions,
  );
}

export function extendPhiRuntimeModuleControllerClientManifest(
  base: PhiRuntimeModuleControllerClientManifest,
  contributions: readonly PhiRuntimeModuleControllerClientAreaContribution[],
): PhiRuntimeModuleControllerClientManifest {
  const manifest = new Map(base);
  const moduleIds = new Set<PhiRuntimeModuleId>();
  for (const contribution of contributions) {
    if (moduleIds.has(contribution.moduleId) || manifest.has(contribution.moduleId)) {
      throw new Error(
        `Duplicate Controller Client Area contribution for runtime module "${contribution.moduleId}".`,
      );
    }
    moduleIds.add(contribution.moduleId);
    manifest.set(contribution.moduleId, contribution.loadController);
  }
  return manifest;
}
