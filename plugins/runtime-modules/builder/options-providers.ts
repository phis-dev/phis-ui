"use client";

import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import {
  isPhiRuntimeAreaBaseModuleId,
  resolvePhiRuntimeAreaDefinition,
} from "../../../plugins/runtime-modules/area-definitions";
import type { PhiControlOption } from "../../../components/controls/phi-control-options";
import { isPhiCmsErrorPagePath } from "../../../constants/cms-error-pages";
import {
  PHI_BUILDER_AREA_LANDING_PAGE_EMPTY,
  PHI_BUILDER_AREA_ROOT_ROUTE_AUTOMATIC,
  PHI_BUILDER_AREA_ROOT_ROUTE_LANDING,
} from "./area-settings-values";
import {
  readPhiControlOptionsProviderParam,
  createPhiControlOptionsProviderClient,
  type PhiResolvedControlOptions,
  type PhiControlOptionsProviderContext,
} from "../../../components/controls/phi-options-provider";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import {
  findPhiBuilderCatalogPathForCatalog,
  normalizePhiBuilderCmsCatalogPath,
  resolvePhiBuilderCatalogPathForCatalog,
  resolvePhiBuilderCmsStoragePathForCatalog,
  resolvePhiBuilderActivePageCatalog,
  type PhiBuilderPageCatalogArea,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import {
  resolvePhiBuilderAreaRootApplicants,
  resolvePhiBuilderOfferedPageCatalog,
  resolvePhiBuilderOfferedPageKey,
} from "./offered-page-catalog";
import {
  builderWorkspaceStore,
  getPhiDeveloperBuilderStateSnapshot,
} from "./developer-workspace-store";
import type { PhiDeveloperBuilderWorkspaceState } from "./developer-workspace-types";
import { getPhiBuilderModuleMetasSnapshot } from "./plugin-meta-store";
import { resolvePhiBuilderSelectedCollectionItemContract } from "./selected-collection-source";

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
 * The fixed head of a list, taken from the field rather than invented here.
 *
 * A Form field states the answers that are not a Page as its own options, and they arrive already
 * resolved against the placement's translated captions. A Control placed without a form states
 * nothing, and then the provider's own wording stands -- which is what the arguments are for.
 */
function resolvePhiBuilderPlacementOptions(
  context: PhiControlOptionsProviderContext,
  ...fallbacks: readonly PhiControlOption[]
): readonly PhiControlOption[] {
  return context.options.length > 0 ? context.options : fallbacks;
}

/**
 * One caption the placement holds, with the provider param as the older way of saying it.
 */
function readPhiBuilderPlacementText(
  context: PhiControlOptionsProviderContext,
  configKey: string,
  paramKey: string,
) {
  const placed = context.sourceConfig?.[configKey];
  return typeof placed === "string" && placed.length > 0
    ? placed
    : readPhiControlOptionsProviderParam(context.optionsProvider, paramKey);
}

/**
 * The Pages a root may be sent to, which is every Page the Area answers with except two kinds.
 *
 * `/` is left out. A forward from the root to the root is a loop, and the Page standing there is
 * already reachable through the two answers above this list -- so naming it as a destination offers
 * an answer that cannot be carried out, spelled like one that can.
 *
 * The error Pages are left out for the other reason: they are what a refused request is answered
 * with, not somewhere a Site sends the people who arrive at its front door. A root that forwards to
 * `/error/404` is a Site that greets every visitor with "not found".
 *
 * Sorted by what the reader sees rather than by the order the Modules were installed in, which is
 * what the catalog carries and what no one looking for a Page by name can follow. The path decides
 * ties, because two Pages may share a title and never an address.
 */
function collectPageReferenceOptions(
  area: PhiBuilderPageCatalogArea,
  nodes: readonly PhiPresetPageNode[],
  allNodes: readonly PhiPresetPageNode[],
): PhiControlOption[] {
  const collect = (candidates: readonly PhiPresetPageNode[]): PhiControlOption[] =>
    candidates.flatMap((node) => {
      const storagePath = resolvePhiBuilderCmsStoragePathForCatalog(area, node.key, allNodes);
      const normalizedPath = normalizePhiBuilderCmsCatalogPath(storagePath);
      return [
        ...(node.reference &&
          node.tombstoned !== true &&
          normalizedPath !== "/" &&
          !isPhiCmsErrorPagePath(normalizedPath)
          ? [{
              value: node.reference,
              label: node.title,
              description: storagePath,
            }]
          : []),
        ...collect(node.children ?? []),
      ];
    });

  return collect(nodes).sort((left, right) =>
    left.label.localeCompare(right.label) ||
    (left.description ?? "").localeCompare(right.description ?? ""));
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
  /*
   * The caption the placement holds, read from the form's config rather than from a provider param:
   * the Builder preset is server-rendered and has the translated chrome labels, and a Client provider
   * has neither. Params stay readable for a Control placed without a form.
   */
  const adoptedLabel = readPhiBuilderPlacementText(context, "landingPageAdopted", "adoptedLabel");
  // The merged catalog rather than the raw preset pages: that is where a Module Page is given its
  // reference, and where a Page the Site has taken over carries the scope it was stored under.
  const catalog = resolvePhiBuilderActivePageCatalog(
    area,
    snapshot.modulePresetPagesByArea,
    snapshot.customPages,
    snapshot.persistedPageCatalogByArea,
  );
  const options: PhiControlOption[] = [
    ...resolvePhiBuilderPlacementOptions(context, {
      value: PHI_BUILDER_AREA_LANDING_PAGE_EMPTY,
      label: readPhiControlOptionsProviderParam(context.optionsProvider, "emptyLabel") ?? "None",
    }),
    // "None" keeps its place at the head; the applicants behind it read in their own order, which is
    // by name, because which package declared first is not something the reader can see.
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
      })
      .sort((left, right) =>
        left.label.localeCompare(right.label) || left.description.localeCompare(right.description)),
  ];

  /*
   * Options only. What the field holds is the Form's, and the Builder controller states it as part of
   * the record it sends when the dialog opens -- a second answer from here would be the same sentence
   * from a source that does not know what has been typed since.
   */
  return { options };
}

function resolveAreaRootRouteOptions(
  context: PhiControlOptionsProviderContext,
): PhiResolvedControlOptions {
  const snapshot = readBuilderSnapshot(context);
  const area = resolveProviderArea(context);
  // What the Area answers with, not what is installed: a destination that is covered by another
  // Module is one no visitor reaches, and listing it beside the Page that covers it puts the same
  // address in the Select twice.
  const pageTree = resolvePhiBuilderOfferedPageCatalog(snapshot, area);
  /*
   * Options only. Which of them the Area stands at is the Form's to hold: the Builder controller
   * states the whole record when the dialog opens, and a second answer from here would be the same
   * sentence from a source that does not know what has been typed since.
   */
  return {
    options: [
      ...resolvePhiBuilderPlacementOptions(
        context,
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
      ),
      ...collectPageReferenceOptions(area, pageTree, pageTree),
    ],
  };
}

const builderProviderStore = {
  subscribe: (listener: () => void) => builderWorkspaceStore.subscribe("public", listener),
  getSnapshot: () => getPhiDeveloperBuilderStateSnapshot("public"),
};

/**
 * The renderers on offer for whatever this Collection View is bound to.
 *
 * The bound resource names the item contract, and every active Module that declared a renderer for that
 * contract appears -- including the one the provider ships, which declares itself like any other. So the
 * list is empty until a source is chosen, which is correct: without items there is nothing to draw, and
 * offering renderers for an unknown shape would only let an author pick one that cannot read the data.
 *
 * Nothing here knows what a media asset is. The Module that owns the items published a contract when it
 * named its resource's renderer, and the Modules offering alternatives cite that name.
 */
function resolveCollectionItemRendererOptions(
  context: PhiControlOptionsProviderContext,
): PhiResolvedControlOptions {
  const state = readBuilderSnapshot(context);
  const metas = getPhiBuilderModuleMetasSnapshot(state.area);
  const itemRendererKey = resolvePhiBuilderSelectedCollectionItemContract(state, metas.dataProviders ?? []);
  if (!itemRendererKey) {
    return { options: [] };
  }
  return {
    options: (metas.collectionItemRenderers ?? [])
      .filter((renderer) => renderer.rendersItemsOf === itemRendererKey)
      .map((renderer) => ({
        value: renderer.key,
        label: renderer.title,
        description: renderer.description,
      })),
  };
}

export const PhiBuilderCollectionItemRenderersOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.collectionItemRenderers,
  ...builderProviderStore,
  resolve: resolveCollectionItemRendererOptions,
});

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
