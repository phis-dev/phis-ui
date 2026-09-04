"use client";

import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import {
  isPhiRuntimeAreaBaseModuleId,
  resolvePhiRuntimeAreaDefinition,
} from "../../../plugins/runtime-modules/area-definitions";
import type { PhiControlOption } from "../../../components/controls/phi-control-options";
import {
  readPhiControlOptionsProviderParam,
  createPhiControlOptionsProviderClient,
  type PhiResolvedControlOptions,
  type PhiControlOptionsProviderContext,
} from "../../../components/controls/phi-options-provider";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import {
  resolvePhiBuilderCmsStoragePathForCatalog,
  resolvePhiBuilderActivePageCatalog,
  type PhiBuilderPageCatalogArea,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import { builderWorkspaceStore , getPhiDeveloperBuilderStateSnapshot } from "./developer-workspace-store";
import type { PhiDeveloperBuilderWorkspaceState } from "./developer-workspace-types";
import { getPhiBuilderModuleMetasSnapshot } from "./plugin-meta-store";

function readBuilderSnapshot(context: PhiControlOptionsProviderContext) {
  return context.snapshot as PhiDeveloperBuilderWorkspaceState;
}

function resolveProviderArea(context: PhiControlOptionsProviderContext) {
  const builderArea = readBuilderSnapshot(context).area;
  return context.optionsProvider?.area && context.optionsProvider.area in readBuilderSnapshot(context).modulePresetPagesByArea
    ? (context.optionsProvider.area as PhiBuilderPageCatalogArea)
    : builderArea;
}

function collectPageOptions(area: PhiBuilderPageCatalogArea, nodes: PhiPresetPageNode[]): PhiControlOption[] {
  return nodes.flatMap((node) => [
    {
      value: resolvePhiBuilderCmsStoragePathForCatalog(area, node.key, nodes),
      label: node.title,
    },
    ...collectPageOptions(area, node.children ?? []),
  ]);
}

function resolveBuilderPagesOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const snapshot = readBuilderSnapshot(context);
  const resolvedArea = resolveProviderArea(context);
  if (!snapshot.catalogHydrated || !snapshot.pageCatalogHydratedByArea[resolvedArea]) {
    return { options: [] };
  }
  const pageTree = resolvePhiBuilderActivePageCatalog(
    resolvedArea,
    snapshot.modulePresetPagesByArea,
    snapshot.customPages,
    snapshot.persistedPageCatalogByArea,
  );

  return {
    options: collectPageOptions(resolvedArea, pageTree),
    ...(snapshot.pageKey
      ? {
          value: resolvePhiBuilderCmsStoragePathForCatalog(
            resolvedArea,
            snapshot.pageKey,
            pageTree,
          ),
        }
      : {}),
  };
}

function resolveBuilderNavigationOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const snapshot = readBuilderSnapshot(context);
  const builderArea = resolveProviderArea(context);
  const valueMode = readPhiControlOptionsProviderParam(context.optionsProvider, "value") === "scopeKey"
    ? "scopeKey"
    : "key";
  const surfaces = snapshot.navigationSurfacesByArea[builderArea] ?? [];
  const areaLabelPrefix = `${builderArea} `;
  const options = surfaces.map((surface) => {
    const fullLabel = surface.label.defaultMessage;
    const localLabel = fullLabel.toLowerCase().startsWith(areaLabelPrefix)
      ? fullLabel.slice(areaLabelPrefix.length)
      : fullLabel;
    return {
      value: valueMode === "scopeKey" ? surface.navKey : surface.navKey.split(":").slice(1).join(":"),
      label: localLabel.charAt(0).toUpperCase() + localLabel.slice(1),
    };
  });
  const defaultSurface = surfaces[0];

  return {
    options,
    value: defaultSurface
      ? valueMode === "scopeKey"
        ? defaultSurface.navKey
        : defaultSurface.navKey.split(":").slice(1).join(":")
      : undefined,
  };
}

function resolveRuntimeModulesOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const snapshot = readBuilderSnapshot(context);
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(snapshot.area);
  const baseModuleId = resolvePhiRuntimeAreaDefinition(cmsArea).baseModuleId;
  return {
    options: snapshot.runtimeModuleDefinitions
      .filter((definition) =>
        definition.kind === "platform" ||
        (
          definition.kind === "module" &&
          definition.eligibleAreas.includes(cmsArea) &&
          (
            !isPhiRuntimeAreaBaseModuleId(definition.moduleId) ||
            definition.moduleId === baseModuleId
          )
        ),
      )
      .map((definition) => ({
        value: definition.moduleId,
        label: definition.title,
        description: definition.description,
        icon: definition.icon ?? (definition.iconFamily ? `@phis/ui/widgets:${definition.iconFamily}` : undefined),
        disabled:
          definition.kind === "platform" ||
          definition.moduleId === baseModuleId,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "en", { sensitivity: "base" })),
  };
}

function resolveFormsOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const area = resolveProviderArea(context);
  return {
    options: [...getPhiBuilderModuleMetasSnapshot(area).forms],
  };
}

/**
 * Where the target Area's `/` goes, as one list.
 *
 * The two answers that are not a Page come first and are followed by every registered Page of the
 * Area. What a choice stores is the Page's reference, never its path: a path is a fact about today's
 * routing table and would rot the first time a Page moved or a Module renamed its route. The two
 * labels arrive as provider params because the preset that places the select is server-rendered and
 * has the translated label set; a Client provider has neither.
 */
export const PHI_BUILDER_AREA_ROOT_ROUTE_AUTOMATIC = "phi-root-route:automatic" as const;
export const PHI_BUILDER_AREA_ROOT_ROUTE_LANDING = "phi-root-route:landing" as const;

function collectPageReferenceOptions(
  area: PhiBuilderPageCatalogArea,
  nodes: readonly PhiPresetPageNode[],
  allNodes: readonly PhiPresetPageNode[],
): PhiControlOption[] {
  return nodes.flatMap((node) => [
    ...(node.reference && node.tombstoned !== true
      ? [{
          value: node.reference,
          label: node.title,
          description: resolvePhiBuilderCmsStoragePathForCatalog(area, node.key, allNodes),
        }]
      : []),
    ...collectPageReferenceOptions(area, node.children ?? [], allNodes),
  ]);
}

function resolveAreaRootRouteOptions(
  context: PhiControlOptionsProviderContext,
): PhiResolvedControlOptions {
  const snapshot = readBuilderSnapshot(context);
  const area = resolveProviderArea(context);
  const pageTree = resolvePhiBuilderActivePageCatalog(
    area,
    snapshot.modulePresetPagesByArea,
    snapshot.customPages,
    snapshot.persistedPageCatalogByArea,
  );
  const draft = snapshot.areaRootRouteDrafts?.[area];

  return {
    options: [
      {
        value: PHI_BUILDER_AREA_ROOT_ROUTE_AUTOMATIC,
        label: readPhiControlOptionsProviderParam(context.optionsProvider, "automaticLabel")
          ?? "First navigation entry",
      },
      {
        value: PHI_BUILDER_AREA_ROOT_ROUTE_LANDING,
        label: readPhiControlOptionsProviderParam(context.optionsProvider, "landingLabel")
          ?? "Landing page",
      },
      ...collectPageReferenceOptions(area, pageTree, pageTree),
    ],
    value: !draft
      ? PHI_BUILDER_AREA_ROOT_ROUTE_AUTOMATIC
      : draft.mode === "landing"
        ? PHI_BUILDER_AREA_ROOT_ROUTE_LANDING
        : draft.target,
  };
}

const builderProviderStore = {
  subscribe: (listener: () => void) => builderWorkspaceStore.subscribe("public", listener),
  getSnapshot: () => getPhiDeveloperBuilderStateSnapshot("public"),
};

export const PhiBuilderPagesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.builderPages,
  ...builderProviderStore,
  resolve: resolveBuilderPagesOptions,
});
export const PhiBuilderAreaRootRouteOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.areaRootRoute,
  ...builderProviderStore,
  resolve: resolveAreaRootRouteOptions,
});
export const PhiBuilderNavigationSetsOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.builderNavigationSets,
  ...builderProviderStore,
  resolve: resolveBuilderNavigationOptions,
});
export const PhiBuilderFormsOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.forms,
  ...builderProviderStore,
  resolve: resolveFormsOptions,
});
export const PhiRuntimeModulesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModules,
  ...builderProviderStore,
  resolve: resolveRuntimeModulesOptions,
});
