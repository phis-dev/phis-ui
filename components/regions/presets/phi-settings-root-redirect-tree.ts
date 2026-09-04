import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { resolvePhiCmsActiveNavigationSurfaces } from "../../../plugins/runtime-modules/descriptor-compiler";
import type {
  PhiCmsCompiledDescriptorCatalog,
  PhiRuntimeModuleId,
} from "../../../types/cms-module-descriptors";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";
import {
  buildPhiCmsRedirectPageTree,
  findFirstPhiCmsNavigationLinkPath,
  findPhiCmsNavigationItemById,
} from "./navigation-redirect";

/**
 * The Settings container root is not a content page: it resolves by redirecting to the first
 * Settings entry visible to the current viewer (SETTINGS.md section 2). The entries are the
 * children of the Area sidebar's Settings container item, so the redirect resolves the sidebar
 * surface and descends into that container.
 */
export function buildPhiSettingsRootRedirectTree({
  page,
  runtime,
  catalog,
  activeModuleIds,
  area,
  navKey,
  containerItemKey,
  title,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  catalog: PhiCmsCompiledDescriptorCatalog;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  area: PhiCmsAreaKey;
  navKey: string;
  containerItemKey: string;
  title: string;
}): PhiResolvedCmsPageTree {
  const definition = catalog.areaDefinitions.get(area);
  if (!definition) {
    throw new Error(`Area "${area}" is not declared.`);
  }
  const surface = resolvePhiCmsActiveNavigationSurfaces({
    catalog,
    area,
    activeModuleIds,
    viewer: runtime.viewer,
  }).find((candidate) => candidate.navKey === navKey);
  const containerId = createPhiPresetCmsInstanceId({
    domain: "navigation",
    ownerModuleId: definition.baseModuleId,
    presetKey: navKey,
    nodeKey: containerItemKey,
  });
  const container = surface ? findPhiCmsNavigationItemById(surface.items, containerId) : null;
  const targetPath = container ? findFirstPhiCmsNavigationLinkPath(container.children) : null;

  return buildPhiCmsRedirectPageTree({ page, area, path: targetPath ?? "/", title });
}
