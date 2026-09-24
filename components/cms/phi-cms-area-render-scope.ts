import "server-only";

import { cache } from "react";

import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import {
  resolvePhiCmsRuntimeModuleScope,
  resolvePhiCmsTreeRuntimeRegistry,
} from "./phi-cms-runtime-registry";
import { loadPhiCmsRootRequest } from "../../server-helpers/cms-root";
import {
  resolvePhiRuntimeModuleIdsForArea,
} from "../../plugins/runtime-modules/settings";
import { materializePhiRuntimeControllerSettings } from "../runtime/runtime-controller-materialization";
import { resolvePhiRuntimeControllerDefinitions } from "../../plugins/runtime-modules/resolver";
import {
  buildPhiRuntimeModuleAccessRegistry,
  filterPhiCmsRenderableTreeForViewer,
} from "../../helpers/cms-access-policy";
import { readPhiAreaPresetRuntimeModuleIds } from "../../helpers/cms-area-config";

/**
 * Everything an Area's own render needs, resolved once per request.
 *
 * The Area is rendered by two Layouts now, not one: a boundary that holds the guards, the providers and
 * the Area Overlays, and inside it a Shell that draws the Area-owned Regions. They are separate Layouts
 * because the root of an Area draws no Shell at all, and Next only mounts and unmounts a Layout when the
 * branch it belongs to changes -- a decision taken inside one Layout would survive a client navigation
 * that was supposed to change it.
 *
 * Splitting them means both need the same resolved tree, module scope and registry. This is where that
 * is worked out, behind `cache`, so the second caller pays nothing. Keying on the path rather than on
 * the array it came from is what lets a Layout, which receives no catch-all segments, share the entry
 * with a Page that does.
 */

/** The same key grammar `cms-root.ts` uses: a separator no path segment can contain. */
const PATH_KEY_SEPARATOR = String.fromCharCode(0);

const loadPhiCmsAreaRenderScopeCached = cache(async function loadPhiCmsAreaRenderScopeCached(
  root: string,
  pathKey: string,
  cmsBridge: PhiCmsSiteBridge,
) {
  const path = pathKey.length > 0 ? pathKey.split(PATH_KEY_SEPARATOR) : undefined;
  const rootScope = await loadPhiCmsRootRequest({ root, path, cmsBridge });
  const { resolvedAreaPreset, runtime } = rootScope;
  const layoutTree = resolvedAreaPreset ?? null;

  /*
   * Which Modules this Area runs, and not which ones this person may see. A Module is area-bound and
   * never switched off for a reader (ACCESS.md); what its Widgets show may still differ per person.
   */
  const runtimeModuleIds = resolvePhiRuntimeModuleIdsForArea(
    runtime.area,
    readPhiAreaPresetRuntimeModuleIds(layoutTree, runtime.area),
    [...cmsBridge.runtimeModuleCatalog.values()].map((entry) => entry.definition),
  );
  const runtimeModuleScope = await resolvePhiCmsRuntimeModuleScope({
    cmsBridge,
    moduleIds: runtimeModuleIds,
    area: runtime.area,
    serverCapabilities: rootScope.requestContext.serverCapabilities,
  });
  const filteredLayoutTree = layoutTree
    ? filterPhiCmsRenderableTreeForViewer({
        tree: layoutTree,
        viewer: runtime.viewer,
        registry: buildPhiRuntimeModuleAccessRegistry(runtimeModuleScope.moduleSet),
      })
    : null;
  const runtimeRegistry = await resolvePhiCmsTreeRuntimeRegistry({
    moduleScope: runtimeModuleScope,
    trees: filteredLayoutTree ? [filteredLayoutTree] : [],
  });
  const registeredControllerSettings = filteredLayoutTree
    ? materializePhiRuntimeControllerSettings({
        tree: filteredLayoutTree,
        ownerMountScope: "area",
        widgetPluginsByType: runtimeModuleScope.widgetDefinitionsByType,
        baseSettings: runtimeModuleScope.moduleSet.areaControllerSettings,
        activeControllerTypes: [...runtimeModuleScope.moduleSet.controllerDescriptorsByType.keys()],
      })
    : null;
  const controllerDefinitionsByType = registeredControllerSettings
    ? await resolvePhiRuntimeControllerDefinitions({
        catalog: cmsBridge.runtimeModuleCatalog,
        moduleSet: runtimeModuleScope.moduleSet,
        settings: registeredControllerSettings,
      })
    : new Map();

  return {
    rootScope,
    runtime,
    runtimeModuleScope,
    filteredLayoutTree,
    runtimeRegistry,
    registeredControllerSettings,
    controllerDefinitionsByType,
  };
});

export type PhiCmsAreaRenderScope = Awaited<ReturnType<typeof loadPhiCmsAreaRenderScopeCached>>;

export async function loadPhiCmsAreaRenderScope({
  root,
  path,
  cmsBridge,
}: {
  root: string;
  path?: string[];
  cmsBridge: PhiCmsSiteBridge;
}) {
  return loadPhiCmsAreaRenderScopeCached(
    root,
    path?.length ? path.join(PATH_KEY_SEPARATOR) : "",
    cmsBridge,
  );
}
