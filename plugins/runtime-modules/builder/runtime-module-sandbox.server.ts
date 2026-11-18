import "server-only";

import type {
  PhiResolvedCmsRenderableTree,
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleId,
  PhiCapabilitySnapshot,
} from "../../../types";
import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";
import {
  resolvePhiRuntimeModuleSet,
  resolvePhiRuntimeRenderRegistry,
} from "../../../plugins/runtime-modules/resolver";
import { resolvePhiRuntimeModuleIdsForArea } from "../../../plugins/runtime-modules/settings";
import type { PhiAccessViewer } from "../../../types/access";
import {
  buildPhiRuntimeModuleAccessRegistry,
  filterPhiCmsRenderableTreeForViewer,
} from "../../../helpers/cms-access-policy";

export async function resolvePhiBuilderCanvasRuntimeModuleSandbox({
  catalog,
  area,
  moduleIds,
  trees,
  viewer,
  serverCapabilities,
}: {
  catalog: PhiRuntimeModuleCatalog;
  area: PhiDeveloperBuilderArea;
  moduleIds: readonly PhiRuntimeModuleId[];
  trees: readonly PhiResolvedCmsRenderableTree[];
  viewer: PhiAccessViewer;
  serverCapabilities: PhiCapabilitySnapshot | null;
}) {
  /*
   * The ids arrive from a preview snapshot, the address bar or the stored Area, and only the last was
   * read tolerantly before it got here. A browser tab opened before a release keeps sending the
   * selection it loaded -- one that may name a Module this build no longer has or has since locked --
   * and the canvas must not go down over it, so all three are read the way a stored selection is.
   */
  const moduleSet = await resolvePhiRuntimeModuleSet({
    catalog,
    area: resolvePhiBuilderAreaAsCmsArea(area),
    moduleIds: resolvePhiRuntimeModuleIdsForArea(
      area,
      moduleIds,
      [...catalog.values()].map((entry) => entry.definition),
    ),
    serverCapabilities,
  });
  const accessRegistry = buildPhiRuntimeModuleAccessRegistry(moduleSet);
  const registry = await resolvePhiRuntimeRenderRegistry({
      catalog,
      moduleSet,
      trees: trees.map((tree) =>
        filterPhiCmsRenderableTreeForViewer({
          tree,
          viewer,
          registry: accessRegistry,
        })
      ),
      serverCapabilities,
    });
  return { moduleSet, registry };
}
