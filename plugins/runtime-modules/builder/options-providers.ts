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
  findPhiBuilderCatalogPathForCatalog,
  resolvePhiBuilderCatalogPathForCatalog,
  resolvePhiBuilderCmsStoragePathForCatalog,
  resolvePhiBuilderActivePageCatalog,
  type PhiBuilderPageCatalogArea,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import {
  resolvePhiBuilderAreaRootApplicants,
  resolvePhiBuilderOfferedPageKey,
} from "./offered-page-catalog";
import {
  builderWorkspaceStore,
  getPhiDeveloperBuilderStateSnapshot,
  readPhiBuilderEffectiveAreaRootRoute,
} from "./developer-workspace-store";
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
  return nodes.flatMap((node) => {
    const path = resolvePhiBuilderCatalogPathForCatalog(area, node.key, nodes);
    return [
      {
        value: path,
        /*
         * The root reads as the address, not as the title of whatever Page is standing in it.
         *
         * Which Page answers `/` is a decision taken elsewhere and it changes -- the Area's own Page,
         * a Module's landing, or one the Builder constructs. Showing that Page's title here would put
         * a name in the Page list that means "the front door" today and something else tomorrow, and
         * would read as a second entry for a Page that is already listed under its own address.
         */
        label: node.storagePath === "/" ? path : node.title,
      },
      ...collectPageOptions(area, node.children ?? []),
    ];
  });
}

function resolveBuilderPagesOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const snapshot = readBuilderSnapshot(context);
  const resolvedArea = resolveProviderArea(context);
  if (!snapshot.catalogHydrated || !snapshot.pageCatalogHydratedByArea[resolvedArea]) {
    return { options: [] };
  }
  /*
   * The same Page the workspace moves to, displayed as its path.
   *
   * Not "no value": a Cascader has no such state. Its value is a path, and an absent one normalises to
   * the root path -- so leaving it out while the root is hidden printed the one entry the forward
   * exists to keep off the screen. Naming a Page that is really on offer is the only way to say "not
   * the root" in a control whose empty value is spelled `/`.
   */
  const { pages: pageTree, pageKey } = resolvePhiBuilderOfferedPageKey(
    snapshot,
    resolvedArea,
    snapshot.pageKey,
  );
  const activePagePath = pageKey
    ? findPhiBuilderCatalogPathForCatalog(resolvedArea, pageKey, pageTree)
    : null;

  return {
    options: collectPageOptions(resolvedArea, pageTree),
    ...(activePagePath ? { value: activePagePath } : {}),
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
/**
 * "Nobody -- I will author it myself", as a value the Select can carry.
 *
 * The state has always existed in storage as a landing without a target; what it never had was a way
 * to be said. A cleared Select is indistinguishable from one nobody has touched, so a Builder who
 * meant "none" was read as "never asked" and the single applicant on offer was adopted behind them.
 */
export const PHI_BUILDER_AREA_LANDING_PAGE_EMPTY = "phi-landing-page:empty" as const;

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

/**
 * Every Page that may stand at this Area's root, as the second Select lists them.
 *
 * The eligible Pages, not the applications: a Module applies so that it can be adopted without being
 * asked, and a built-in Page never applies -- but it is still a Page a Builder may choose, and leaving
 * it out would drop the landing every Site starts with from the list of the landings it may pick.
 *
 * "None" leads, because it is the answer that has to be sayable: it is what a Builder who wants to
 * author the root themselves selects, and until it was an option of its own it could only be spelled
 * as a cleared Select, which reads as "not answered yet" and was treated as one.
 */
function resolveLandingPageOptions(
  context: PhiControlOptionsProviderContext,
): PhiResolvedControlOptions {
  const snapshot = readBuilderSnapshot(context);
  const area = resolveProviderArea(context);
  const moduleTitles = new Map(
    (snapshot.runtimeModuleDefinitions ?? []).map((definition) => [definition.moduleId, definition.title] as const),
  );
  const adoptedLabel = readPhiControlOptionsProviderParam(context.optionsProvider, "adoptedLabel");
  // The merged catalog rather than the raw preset pages: that is where a Module Page is given its
  // reference, and where a Page the Site has taken over carries the scope it was stored under.
  const catalog = resolvePhiBuilderActivePageCatalog(
    area,
    snapshot.modulePresetPagesByArea,
    snapshot.customPages,
    snapshot.persistedPageCatalogByArea,
  );
  const options: PhiControlOption[] = [
    {
      value: PHI_BUILDER_AREA_LANDING_PAGE_EMPTY,
      label: readPhiControlOptionsProviderParam(context.optionsProvider, "emptyLabel") ?? "None",
    },
    ...resolvePhiBuilderAreaRootApplicants(snapshot, area, catalog)
      .filter((node) => node.reference)
      .map((node) => {
        const source = node.sourcePreset!;
        const owner = moduleTitles.get(source.ownerModuleId) ?? source.ownerModuleId;
        return {
          value: node.reference!,
          label: node.title,
          description: node.pageScopeId != null && adoptedLabel ? `${owner} -- ${adoptedLabel}` : owner,
        };
      }),
  ];

  const rootRoute = readPhiBuilderEffectiveAreaRootRoute(snapshot, area);
  return {
    options,
    value: rootRoute?.mode === "landing" && rootRoute.target
      ? rootRoute.target
      : PHI_BUILDER_AREA_LANDING_PAGE_EMPTY,
  };
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
  // The effective answer, not only this session's: the Select has to open on what the Area actually
  // says, and until somebody changes it that sentence came from the server.
  const rootRoute = readPhiBuilderEffectiveAreaRootRoute(snapshot, area);

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
    value: !rootRoute
      ? PHI_BUILDER_AREA_ROOT_ROUTE_AUTOMATIC
      : rootRoute.mode === "landing"
        ? PHI_BUILDER_AREA_ROOT_ROUTE_LANDING
        : rootRoute.target,
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
export const PhiBuilderLandingPageOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.landingPage,
  ...builderProviderStore,
  resolve: resolveLandingPageOptions,
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
