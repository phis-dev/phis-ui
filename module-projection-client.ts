"use client";

import type { PhiCmsAreaKey } from "./constants/cms-areas";
import type { PhiRuntimeModuleRenderClient } from "./components/runtime/runtime-module-render-client-manifest";
import type { PhiModuleClientContributions } from "./module-client";
import type { PhiRuntimeModuleControllerClientAreaContribution } from "./plugins/runtime-modules/area-contributions-controller-client";
import type { PhiRuntimeModuleId } from "./types/cms-module-descriptors";
import type { PhiRuntimeModuleDataProviderClientDefinition } from "./types/cms-plugins";
import type { PhiSiteModuleClientContributions } from "./plugins/runtime-modules/site-modules-client";
import type {
  PhiRuntimeModuleUiProviderClientDefinition,
} from "./components/runtime/runtime-module-ui-provider-client-manifest";
import {
  readPhiSiteModulePlacements,
  type PhiSiteModulePlacement,
} from "./plugins/runtime-modules/site-module-placements";

/**
 * The Client counterpart of `collectPhiSiteModuleServerAreaContributions`.
 *
 * Called once per Area, by that Area's own generated file. `phis module` read every package's
 * `package.json#phis` and imported only the Client doors of packages with a Module for that Area, so an
 * Area's bundle never holds another Area's Module code -- nor, as it did while one file served every
 * Area, each package's whole definition just so the Areas could be read out of it. The placements are
 * the generator's reading, passed as data. A Client contribution for a Module they do not place here is
 * dropped: a package with Modules for different Areas brings all of them through its one door.
 *
 * Calendar adapters are not placed by Module. They resolve by type wherever a Widget renders, so an Area
 * holds the adapters of every package whose Client door its file imports.
 *
 * Authoring contributions are not here at all. They have their own projection and their own generated
 * file, because a value this object can reach is a value every Area host that imports it must ship --
 * see `collectPhiSiteModuleAuthoringContributions`.
 */

type CollectedArea = {
  controllers: PhiRuntimeModuleControllerClientAreaContribution[];
  renderClients: Array<readonly [string, PhiRuntimeModuleRenderClient]>;
  dataProviders: PhiRuntimeModuleDataProviderClientDefinition[];
  uiProviders: PhiRuntimeModuleUiProviderClientDefinition[];
};

export function collectPhiSiteModuleClientContributions(input: {
  placements: readonly PhiSiteModulePlacement[];
  clients: readonly PhiModuleClientContributions[];
}): PhiSiteModuleClientContributions {
  const areasByModuleId: ReadonlyMap<PhiRuntimeModuleId, readonly PhiCmsAreaKey[]> =
    readPhiSiteModulePlacements(input.placements);
  const collected = new Map<PhiCmsAreaKey, CollectedArea>();

  const areaFor = (area: PhiCmsAreaKey): CollectedArea => {
    const current = collected.get(area);
    if (current) {
      return current;
    }
    const created: CollectedArea = {
      controllers: [],
      renderClients: [],
      dataProviders: [],
      uiProviders: [],
    };
    collected.set(area, created);
    return created;
  };

  for (const client of input.clients) {
    for (const contribution of client.modules) {
      const { Controller, renderClients, dataProviders, uiProvider, moduleId } = contribution;
      for (const area of areasByModuleId.get(moduleId) ?? []) {
        const target = areaFor(area);
        if (Controller) {
          target.controllers.push({ moduleId, Controller });
        }
        target.renderClients.push(...(renderClients ?? []));
        target.dataProviders.push(...(dataProviders ?? []));
        if (uiProvider) {
          target.uiProviders.push({ moduleId, Provider: uiProvider });
        }
      }
    }
  }

  return {
    areas: Object.fromEntries(collected),
    calendarAdapters: input.clients.flatMap((client) => [...(client.calendarAdapters ?? [])]),
  };
}
