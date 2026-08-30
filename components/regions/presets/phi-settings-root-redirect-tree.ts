import { readPhiCmsNavigationTargetPath } from "../../../helpers/navigation-target";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { resolvePhiCmsActiveNavigationSurfaces } from "../../../plugins/runtime-modules/descriptor-compiler";
import type {
  PhiCmsCompiledDescriptorCatalog,
  PhiCmsResolvedNavigationItem,
  PhiRuntimeModuleId,
} from "../../../types/cms-module-descriptors";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";

function findNavigationItemById(
  items: readonly PhiCmsResolvedNavigationItem[],
  id: PhiCmsResolvedNavigationItem["id"],
): PhiCmsResolvedNavigationItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    const child = findNavigationItemById(item.children, id);
    if (child) {
      return child;
    }
  }
  return null;
}

function findFirstNavigationLinkPath(
  items: readonly PhiCmsResolvedNavigationItem[],
): string | null {
  for (const item of items) {
    // An Overlay opener is not a destination, so it can never be what a root redirect lands on.
    const path = readPhiCmsNavigationTargetPath(item.target);
    if (item.kind === "link" && path) {
      return path;
    }
    const childPath = findFirstNavigationLinkPath(item.children);
    if (childPath) {
      return childPath;
    }
  }
  return null;
}

/**
 * The Settings container root is not a content page: it resolves by redirecting to the first
 * Settings entry visible to the current viewer (SETTINGS.md section 2). The entries are the
 * children of the Area sidebar's Settings container item, so the redirect resolves the sidebar
 * surface and descends into that container. The target depends on the viewer's access, so the
 * redirect is temporary (307), never permanent.
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
  const container = surface ? findNavigationItemById(surface.items, containerId) : null;
  const targetPath = container ? findFirstNavigationLinkPath(container.children) : null;

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Redirect,
      status: PhiCmsStatus.Published,
      layoutConfig: {
        redirect: {
          target: { area, path: targetPath ?? "/" },
          status: 307,
        },
      },
    },
    pageMeta: {
      title: { msgId: 0, source: title, value: title },
      description: null,
    },
    overlays: [],
    regions: [],
    layoutNodes: [],
    contentWidgets: [],
  };
}
