"use client";

import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_BUILDER_AREA_OPTIONS } from "../../../../constants/cms-areas";
import {
  type PhiBuilderPageCatalogArea,
  type PhiPresetPageNode,
  resolvePhiBuilderActivePageCatalog,
} from "../../../../helpers/cms-page-catalog";
import {
  phiWorkspaceCatalogStore,
  PHI_WORKSPACE_CATALOG_SCOPE,
  type PhiWorkspaceCatalogState,
} from "../../../../components/workspace/catalog-store";
import {
  PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM,
} from "../../../../helpers/cms-scope-search-params";
import { resolvePhiBuilderRevisionPagePath } from "../types";
import {
  createPhiControlOptionsProviderClient,
  readPhiControlOptionsProviderParam,
  readPhiControlOptionsProviderSourceValue,
  type PhiControlOptionsProviderContext,
  type PhiResolvedControlOptions,
} from "../../../../components/controls/phi-options-provider";

function readSnapshot(context: PhiControlOptionsProviderContext) {
  return context.snapshot as PhiWorkspaceCatalogState;
}

function collectPageOptions(
  area: PhiBuilderPageCatalogArea,
  nodes: readonly PhiPresetPageNode[],
  pages: readonly PhiPresetPageNode[] = nodes,
): { value: string; label: string }[] {
  return nodes.flatMap((node) => [
    {
      value: resolvePhiBuilderRevisionPagePath(area, node.key, pages),
      label: node.title,
    },
    ...collectPageOptions(area, node.children ?? [], pages),
  ]);
}

function resolveKind(context: PhiControlOptionsProviderContext) {
  const value = readPhiControlOptionsProviderSourceValue(context, "kindParam") ??
    context.sourceConfig?.kind;
  return value === "page" || value === "navigation" || value === "theme" ? value : "area";
}

function resolveOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const snapshot = readSnapshot(context);
  const mode = readPhiControlOptionsProviderParam(context.optionsProvider, "mode");
  if (mode === "kind") {
    return {
      options: [
        { value: "area", label: "Area" },
        { value: "page", label: "Page" },
        { value: "navigation", label: "Navigation" },
        { value: "theme", label: "Theme" },
      ],
      value: "area",
    };
  }

  const area = snapshot.area as PhiBuilderPageCatalogArea;
  const kind = resolveKind(context);
  const currentValue = typeof context.sourceConfig?.scopeKey === "string"
    ? context.sourceConfig.scopeKey
    : null;
  const requestedScope = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM);
  if (kind === "area") {
    return {
      options: [...PHI_BUILDER_AREA_OPTIONS],
      value: area,
      valueMode: "authoritative",
    };
  }
  if (kind === "theme") {
    return { options: [{ value: "default", label: "default" }], value: "default" };
  }
  if (kind === "navigation") {
    const options = (snapshot.navigationSurfacesByArea[area] ?? []).map((surface) => ({
      value: surface.navKey,
      label: surface.label.defaultMessage,
    }));
    return {
      options,
      value: options.some((option) => option.value === currentValue)
        ? currentValue ?? undefined
        : options.some((option) => option.value === requestedScope)
          ? requestedScope ?? undefined
          : options[0]?.value,
    };
  }

  if (!snapshot.pageCatalogHydratedByArea[area]) {
    return { options: [] };
  }
  const pageTree = resolvePhiBuilderActivePageCatalog(
    area,
    snapshot.modulePresetPagesByArea,
    snapshot.customPages,
    snapshot.persistedPageCatalogByArea,
  );
  const options = collectPageOptions(area, pageTree);
  const fallbackValue = snapshot.pageKey
    ? resolvePhiBuilderRevisionPagePath(area, snapshot.pageKey, pageTree)
    : options[0]?.value;
  return {
    options,
    value: options.some((option) => option.value === currentValue)
      ? currentValue ?? undefined
      : options.some((option) => option.value === requestedScope)
        ? requestedScope ?? undefined
        : fallbackValue,
  };
}

export const PhiRevisionsBindingsOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.bindings,
  subscribe: (listener) => phiWorkspaceCatalogStore.subscribe(PHI_WORKSPACE_CATALOG_SCOPE, listener),
  getSnapshot: () => phiWorkspaceCatalogStore.getSnapshot(PHI_WORKSPACE_CATALOG_SCOPE),
  resolve: resolveOptions,
});
