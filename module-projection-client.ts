"use client";

import type { PhiCmsAreaKey } from "./constants/cms-areas";
import type { PhiRuntimeModuleRenderClientLoader } from "./components/runtime/runtime-module-render-client-manifest";
import type { PhiModuleClientContributions } from "./module-client";
import type { PhiModuleDefinitions } from "./module";
import type { PhiRuntimeModuleAuthoringClientContribution } from "./plugins/runtime-modules/authoring-contributions-client";
import type { PhiRuntimeModuleControllerClientAreaContribution } from "./plugins/runtime-modules/area-contributions-controller-client";
import type { PhiRuntimeModuleId } from "./types/cms-module-descriptors";
import type { PhiRuntimeModuleDataProviderClientDefinition } from "./types/cms-plugins";
import type { PhiSiteModuleClientContributions } from "./plugins/runtime-modules/site-modules-client";

/**
 * The Client counterpart of `collectPhiSiteModuleServerAreaContributions`.
 *
 * The Areas come from the definitions rather than from the Client contributions, because a Module states
 * them once and the Server boundary must not be imported here to read them. A Client contribution naming
 * a Module that is not among the definitions is dropped: it can only come from a package assembled
 * inconsistently, and carrying it would leave a loader registered for a Module no Area offers.
 *
 * Calendar adapters are not placed at all. They resolve by type wherever a Widget renders, and every Area
 * holds the same set.
 */

type CollectedArea = {
  controllers: PhiRuntimeModuleControllerClientAreaContribution[];
  renderLoaders: Array<readonly [string, PhiRuntimeModuleRenderClientLoader]>;
  dataProviders: PhiRuntimeModuleDataProviderClientDefinition[];
  authoring: PhiRuntimeModuleAuthoringClientContribution[];
};

export function collectPhiSiteModuleClientContributions(input: {
  definitions: PhiModuleDefinitions;
  clients: readonly PhiModuleClientContributions[];
  authoring: readonly PhiRuntimeModuleAuthoringClientContribution[];
}): PhiSiteModuleClientContributions {
  const areasByModuleId = new Map<PhiRuntimeModuleId, readonly PhiCmsAreaKey[]>(
    input.definitions.map((definition) => [definition.moduleId, definition.eligibleAreas]),
  );
  const collected = new Map<PhiCmsAreaKey, CollectedArea>();

  const areaFor = (area: PhiCmsAreaKey): CollectedArea => {
    const current = collected.get(area);
    if (current) {
      return current;
    }
    const created: CollectedArea = {
      controllers: [],
      renderLoaders: [],
      dataProviders: [],
      authoring: [],
    };
    collected.set(area, created);
    return created;
  };

  for (const client of input.clients) {
    for (const contribution of client.modules) {
      const { loadController, renderLoaders, dataProviders, moduleId } = contribution;
      for (const area of areasByModuleId.get(moduleId) ?? []) {
        const target = areaFor(area);
        if (loadController) {
          target.controllers.push({ moduleId, loadController });
        }
        target.renderLoaders.push(...(renderLoaders ?? []));
        target.dataProviders.push(...(dataProviders ?? []));
      }
    }
  }

  for (const contribution of input.authoring) {
    for (const area of areasByModuleId.get(contribution.moduleId) ?? []) {
      areaFor(area).authoring.push(contribution);
    }
  }

  return {
    areas: Object.fromEntries(collected),
    calendarAdapters: input.clients.flatMap((client) => [...(client.calendarAdapters ?? [])]),
  };
}
