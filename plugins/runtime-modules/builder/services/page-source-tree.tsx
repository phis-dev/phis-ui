"use client";

import { useMemo, type ReactNode } from "react";

import { PHI_BUILDER_AREA_KEYS, type PhiBuilderAreaKey } from "../../../../constants/cms-areas";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/builder/data-providers";
import type { PhiTreeProviderRegistration } from "../../../../components/widgets/client/shared/phi-tree-provider";
import { PhiTreeProviderClient } from "../../../../components/widgets/client/shared/phi-tree-provider";
import { resolvePhiBuilderCmsFetchPath } from "../../../../helpers/cms-paths";
import { resolvePhiBuilderActivePageCatalog, type PhiPresetPageNode } from "../../../../helpers/cms-page-catalog";
import {
  buildPhiBuilderNavigationFolderDragSourceKey,
  buildPhiBuilderNavigationPageDragSourceKey,
} from "../navigation-widget-runtime";
import { hasPhiBuilderNavigableContent, isPhiBuilderNavigablePage } from "../navigation-folder-drop";
import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";

/*
 * Folders are nodes of their own. A folder has no route, but neither does a Navigation container, which
 * is what dropping one builds -- and leaving folders out hung every Page beneath one at the root.
 */
function flattenPages(
  area: PhiBuilderAreaKey,
  pages: readonly PhiPresetPageNode[],
  allPages: readonly PhiPresetPageNode[],
  parentId: string | null = null,
): Record<string, unknown>[] {
  return pages.flatMap((page) => {
    const children = page.children ?? [];
    if (isPhiBuilderNavigablePage(page)) {
      return [{
        id: page.key,
        parentId,
        title: page.title,
        path: resolvePhiBuilderCmsFetchPath(area, page.key, allPages),
        dragIdentity: buildPhiBuilderNavigationPageDragSourceKey(area, page.reference!),
      }, ...flattenPages(area, children, allPages, page.key)];
    }
    if (!page.reference && hasPhiBuilderNavigableContent(page)) {
      return [{
        id: page.key,
        parentId,
        title: page.title,
        path: resolvePhiBuilderCmsFetchPath(area, page.key, allPages),
        dragIdentity: buildPhiBuilderNavigationFolderDragSourceKey(area, page.key),
      }, ...flattenPages(area, children, allPages, page.key)];
    }
    // A deleted Page is not offered; what lives beneath it still is, one level up.
    return flattenPages(area, children, allPages, parentId);
  });
}

function isBuilderArea(value: unknown): value is PhiBuilderAreaKey {
  return typeof value === "string" && (PHI_BUILDER_AREA_KEYS as readonly string[]).includes(value);
}

export function PhiBuilderPageSourceTreeProviderClient({ children }: { children: ReactNode }) {
  const state = usePhiDeveloperBuilderStateValue("public", (value) => value);
  const registration = useMemo<PhiTreeProviderRegistration>(() => {
    const descriptor = PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find((candidate) =>
      candidate.key === PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.pageSourceTree);
    return {
      key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.pageSourceTree,
      resources: descriptor?.kind === "tree" ? descriptor.resources.map((resource) => ({
        ...resource,
        bindingFields: resource.bindingFields?.map((field) => field.key === "area"
          ? { ...field, defaultValue: state.area }
          : field),
      })) : [],
      query: async (request) => {
        const area = isBuilderArea(request.params?.area) ? request.params.area : state.area;
        const pages = resolvePhiBuilderActivePageCatalog(
          area,
          state.modulePresetPagesByArea,
          state.customPages,
          state.persistedPageCatalogByArea,
        );
        const nodes = flattenPages(area, pages, pages);
        const search = request.query.search?.trim().toLocaleLowerCase();
        return {
          nodes: search
            ? nodes.flatMap((node) => {
                const title = typeof node.title === "string" ? node.title.toLocaleLowerCase() : "";
                const path = typeof node.path === "string" ? node.path.toLocaleLowerCase() : "";
                return title.includes(search) || path.includes(search) ? [{ ...node, parentId: null }] : [];
              })
            : nodes,
        };
      },
    };
  }, [state]);
  return <PhiTreeProviderClient registration={registration}>{children}</PhiTreeProviderClient>;
}
