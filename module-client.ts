"use client";

import type { PhiRuntimeModuleControllerClientLoader } from "./components/runtime/runtime-module-controller-client-manifest";
import type { PhiRuntimeModuleRenderClientLoader } from "./components/runtime/runtime-module-render-client-manifest";
import type { PhiRuntimeModuleId } from "./types/cms-module-descriptors";
import type {
  PhiRuntimeModuleCalendarAdapterClientDefinition,
  PhiRuntimeModuleDataProviderClientDefinition,
} from "./types/cms-plugins";

/**
 * The live Client contributions of a Module package, exported as `phiModuleClientContributions`.
 *
 * One entry per Module rather than one per package, because a package may carry several Modules and the
 * generated projection places each into the Areas that Module declares. Render loaders and Data Provider
 * definitions are keyed by type and by provider key, not by Module, so without this grouping there would
 * be nothing to distribute them by -- a package-wide list would have to be delivered to the union of
 * every Module's Areas, loading a Module's Client code where the Module itself is not eligible.
 *
 * A Module has at most one Controller, as the live Controller projection holds exactly one static loader.
 *
 * Calendar adapters sit beside the Modules rather than inside them: they are resolved by their type
 * wherever a Widget renders, and no Area holds a different set. They are stated here so a package has one
 * Client entrypoint, and the projection flattens them.
 */
export type PhiModuleClientContribution = {
  moduleId: PhiRuntimeModuleId;
  loadController?: PhiRuntimeModuleControllerClientLoader;
  renderLoaders?: ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClientLoader]>;
  dataProviders?: readonly PhiRuntimeModuleDataProviderClientDefinition[];
};

export type PhiModuleClientContributions = {
  modules: readonly PhiModuleClientContribution[];
  calendarAdapters?: readonly PhiRuntimeModuleCalendarAdapterClientDefinition[];
};

export function definePhiModuleClientContributions(
  contributions: PhiModuleClientContributions,
): PhiModuleClientContributions {
  const seen = new Set<PhiRuntimeModuleId>();
  for (const contribution of contributions.modules) {
    if (seen.has(contribution.moduleId)) {
      throw new Error(`Duplicate Client contribution for runtime module "${contribution.moduleId}".`);
    }
    seen.add(contribution.moduleId);
  }
  return contributions;
}
