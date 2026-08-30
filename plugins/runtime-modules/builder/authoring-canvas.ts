"use client";

import { useMemo } from "react";

import type { PhiCmsWidgetAuthoringCanvas } from "../../../types/cms-plugins";
import {
  findPhiBuilderNavigationSurface,
  materializePhiBuilderNavigationSurface,
} from "../../../helpers/cms-navigation-catalog";
import { resolvePhiBuilderActivePageCatalog } from "../../../helpers/cms-page-catalog";
import { requirePhiBuilderNavigationScopeKey } from "../../../helpers/cms-navigation-catalog";
import { usePhiDeveloperBuilderStateValue } from "./developer-workspace-store";
import { getPhiBuilderNavigationDraftSnapshot } from "./navigation-store";

/**
 * The canvas context the Builder hands to every Widget it renders for authoring.
 *
 * Widgets cannot read this from `runtime`, which the canvas fills with a placeholder. Building it here
 * -- inside the Builder, which owns the state -- is what keeps Widgets from importing the Builder to
 * learn which Area they are being edited in.
 */
export function usePhiBuilderAuthoringCanvas(): PhiCmsWidgetAuthoringCanvas {
  const area = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const catalogHydrated = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.catalogHydrated,
  );
  const navigationSurfaces = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.navigationSurfacesByArea[state.area] ?? null,
  );
  const modulePresetPagesByArea = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.modulePresetPagesByArea,
  );
  const customPages = usePhiDeveloperBuilderStateValue("public", (state) => state.customPages);
  const persistedPageCatalogByArea = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.persistedPageCatalogByArea,
  );

  return useMemo(
    () => ({
      area,
      catalogHydrated,
      resolveNavigation: (navKey: string) => {
        const draft = getPhiBuilderNavigationDraftSnapshot(navKey);
        if (draft) {
          return draft;
        }
        if (!navigationSurfaces) {
          return null;
        }
        const surface = findPhiBuilderNavigationSurface(
          navigationSurfaces,
          requirePhiBuilderNavigationScopeKey(navKey),
        );
        return surface ? materializePhiBuilderNavigationSurface(surface, null) : null;
      },
      pageCatalog: resolvePhiBuilderActivePageCatalog(
        area,
        modulePresetPagesByArea,
        customPages,
        persistedPageCatalogByArea,
      ),
    }),
    [area, catalogHydrated, customPages, modulePresetPagesByArea, navigationSurfaces, persistedPageCatalogByArea],
  );
}
