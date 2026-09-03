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
  const moduleSet = await resolvePhiRuntimeModuleSet({
    catalog,
    area: resolvePhiBuilderAreaAsCmsArea(area),
    moduleIds,
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
