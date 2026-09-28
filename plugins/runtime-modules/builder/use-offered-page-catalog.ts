"use client";

import { useMemo } from "react";

import type { PhiBuilderPageCatalogArea } from "../../../helpers/cms-page-catalog";
import {
  resolvePhiBuilderOfferedPageCatalog,
  type PhiBuilderOfferedCatalogState,
} from "./offered-page-catalog";

/**
 * The Pages an Area answers with, for a surface that offers one as a target.
 *
 * The distinction this exists to hold is between what is **installed** and what is **answered**, and
 * every surface that offers a Page has to be on the second side of it. The active catalog mirrors the
 * route declarations, so a base Module Page that a Site package covers is still in it -- and an author
 * looking at two entries both reading `/home` picks one by guess, with a fair chance of the one nobody
 * is ever served. The same narrowing settles `/`, which is a slot rather than an address.
 *
 * A hook rather than a call each time, because the answer needs six pieces of the workspace state and
 * a dependency list that names all six. Three surfaces had written that out themselves; two of them
 * had written it out wrong, in the same way, and the third was written by copying one of those.
 */
export function usePhiBuilderOfferedPageCatalog(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
) {
  const {
    modulePresetPagesByArea,
    customPages,
    persistedPageCatalogByArea,
    navigationSurfacesByArea,
    runtimeModuleIdsByArea,
    areaRootRoutes,
  } = state;

  return useMemo(
    () => resolvePhiBuilderOfferedPageCatalog({
      modulePresetPagesByArea,
      customPages,
      persistedPageCatalogByArea,
      navigationSurfacesByArea,
      runtimeModuleIdsByArea,
      areaRootRoutes,
    }, area),
    [
      area,
      areaRootRoutes,
      customPages,
      modulePresetPagesByArea,
      navigationSurfacesByArea,
      persistedPageCatalogByArea,
      runtimeModuleIdsByArea,
    ],
  );
}
