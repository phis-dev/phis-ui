"use client";

import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import { isPhiCmsErrorPagePath } from "../../../constants/cms-error-pages";
import {
  choosePhiAreaRootApplicant,
  resolvePhiAreaLandingSelection,
} from "../../../helpers/cms-area-config";
import {
  findPhiBuilderPageKeyFromStoragePath,
  findPhiPageNodePath,
  normalizePhiBuilderCmsCatalogPath,
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderActivePageKey,
  resolvePhiBuilderRequestedPageKey,
  resolvePhiBuilderPageKeyFromCatalogPath,
  type PhiBuilderPageCatalogArea,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import { findFirstPhiCmsNavigationLinkPath } from "../../../components/regions/presets/navigation-redirect";
import { canPhiViewerAccess, type PhiAccessViewer } from "../../../types/access";
import type { PhiPageReference } from "../../../types/references";
import { resolvePhiRuntimeAreaDefinition } from "../area-definitions";
import { resolvePhiAreaRootRouteNavKey, resolvePhiAreaRootRoutePresetKey } from "../area-root-route";
import { listPhiAlwaysActiveRuntimeModuleIds } from "../settings";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";
import { readPhiBuilderStoredAreaRootRoute } from "./developer-workspace-store";
import type { PhiDeveloperBuilderWorkspaceState } from "./developer-workspace-types";

/**
 * The part of the workspace this reads, named rather than taken whole.
 *
 * Two callers pass two different objects -- the options provider its snapshot, the workspace
 * controller its state -- and both are the same store; saying which fields are consulted keeps that a
 * fact rather than a coincidence.
 */
export type PhiBuilderOfferedCatalogState = Pick<
  PhiDeveloperBuilderWorkspaceState,
  | "modulePresetPagesByArea"
  | "customPages"
  | "persistedPageCatalogByArea"
  | "navigationSurfacesByArea"
  | "runtimeModuleIdsByArea"
  | "runtimeModuleDefinitions"
  | "areaRootRoutes"
>;

/**
 * Which Modules answer in this Area, and which Module the Area itself is.
 *
 * Switched on here, or the Area's own base Module -- which is never in the selection because it is
 * never switchable: the Area is its Module. Leaving it out would drop the landing every Site starts
 * with from the list of the landings it may choose, and would leave the root slot with no applicant
 * to fall back to. A Module declared `activation: "always"` is not in the selection either, and
 * answers in every Area it is eligible for.
 */
function resolvePhiBuilderAreaModuleActivation(
  state: Pick<PhiBuilderOfferedCatalogState, "runtimeModuleIdsByArea" | "runtimeModuleDefinitions">,
  area: PhiBuilderPageCatalogArea,
) {
  const baseModuleId = resolvePhiRuntimeAreaDefinition(resolvePhiBuilderAreaAsCmsArea(area))?.baseModuleId ?? null;
  const activeModuleIds = new Set([
    ...listPhiAlwaysActiveRuntimeModuleIds(area, state.runtimeModuleDefinitions ?? []),
    ...(state.runtimeModuleIdsByArea?.[area] ?? []),
  ]);
  return {
    baseModuleId,
    isActive: (moduleId: PhiRuntimeModuleId) =>
      moduleId === baseModuleId || activeModuleIds.has(moduleId),
  };
}

/**
 * Every Page that could stand at this Area's root, whether or not it applied for the job.
 *
 * Applying (`landingPage`) and being eligible are two different questions, and only the first belongs
 * to the Module: an application is what may be adopted without asking, so a built-in Page never makes
 * one -- otherwise every Site would ship with the slot already claimed and an installed Site package
 * would arrive as the second applicant. Being offered in the Select is the other question, and there
 * the Area's own Page belongs, or a Builder could not choose the landing their Site started with.
 *
 * Only Modules that are switched on here: a Page from a Module that is off is one the Site cannot
 * draw.
 */
export function resolvePhiBuilderAreaRootApplicants(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
  catalog: readonly PhiPresetPageNode[],
) {
  const { isActive } = resolvePhiBuilderAreaModuleActivation(state, area);
  return catalog.filter((node) =>
    node.storagePath === "/" &&
    node.sourcePreset != null &&
    node.tombstoned !== true &&
    isActive(node.sourcePreset.ownerModuleId));
}

/**
 * The one `/` this Area actually has, out of every Module that applied for it.
 *
 * The catalog carries a node for every declared `/`, because it mirrors what is installed rather than
 * what is answered. `choosePhiAreaRootApplicant` is the same decision the route table makes, so the
 * Page an author opens is the Page a visitor is served; running a second copy of that chain here
 * would agree while exactly one Module applies -- which is every case except the one the slot exists
 * for -- and disagree the moment a second one does.
 */
function resolvePhiBuilderAreaRootPageNode(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
  catalog: readonly PhiPresetPageNode[],
) {
  const { baseModuleId } = resolvePhiBuilderAreaModuleActivation(state, area);

  return choosePhiAreaRootApplicant(
    resolvePhiBuilderAreaRootApplicants(state, area, catalog),
    (node) => ({
      ownerModuleId: node.sourcePreset!.ownerModuleId,
      presetKey: node.sourcePreset!.presetKey,
      landingPage: node.landingPage,
    }),
    {
      baseModuleId,
      landingSelection: resolvePhiAreaLandingSelection(
        readPhiBuilderStoredAreaRootRoute(state, area),
      ),
    },
  );
}

/**
 * The Pages this Area does not answer with, taken out of the list.
 *
 * The catalog carries a node per declared route, because it mirrors what is **installed**. What the
 * list must show is what is **answered**, or an author edits a Page nobody is served -- the rule `/`
 * is already held to, two paragraphs down. Two narrowings get from one to the other, and they are the
 * same two the route table applies:
 *
 * A Module that is switched off answers nothing. Its routes are claims it would make if somebody
 * flipped its switch, and `compilePhiCmsActiveRouteTable` skips them for exactly that reason.
 *
 * A base Module's Page that a package Module covers is no longer reachable either: the address
 * answers with the covering one. Only what survived the first narrowing can cover, so the two are
 * applied in that order and the second needs to ask nothing about activation.
 *
 * `/` is left to `choosePhiAreaRootApplicant` below. It is a slot rather than an address and is
 * settled on rules this has not got -- the base landing has to stay in the running, because "landing,
 * nobody" is answered by it standing.
 *
 * A node goes whether or not a stored Page hangs on it. What is stored is not lost by being off the
 * list: neither switching a Module off nor covering renames or deletes anything, so the revision
 * waits where it is and comes back with the address. Keeping its entry to guard it would cost the
 * list the one thing it is for.
 */
function removePhiBuilderUnansweredPresetPages(
  nodes: readonly PhiPresetPageNode[],
  baseModuleId: PhiRuntimeModuleId | null,
  isActive: (moduleId: PhiRuntimeModuleId) => boolean,
): PhiPresetPageNode[] {
  /*
   * A folder is a segment of somebody's path rather than a Page of its own, so it goes when the last
   * Page under it does: `insertPageTarget` only ever makes one to hold children.
   */
  const pruneEmptied = (node: PhiPresetPageNode, children: PhiPresetPageNode[]) =>
    children.length > 0 || node.sourcePreset != null || node.storagePath != null;

  const keepActive = (candidates: readonly PhiPresetPageNode[]): PhiPresetPageNode[] => candidates
    .flatMap((node) => {
      const ownerModuleId = node.sourcePreset?.ownerModuleId;
      if (ownerModuleId != null && !isActive(ownerModuleId)) {
        return [];
      }
      if (!node.children) {
        return [node];
      }
      const children = keepActive(node.children);
      return pruneEmptied(node, children) ? [{ ...node, children }] : [];
    });

  const active = keepActive(nodes);
  if (baseModuleId == null) {
    return active;
  }

  const coveredPaths = new Set<string>();
  const collectCoveredPaths = (candidates: readonly PhiPresetPageNode[]) => {
    for (const node of candidates) {
      const ownerModuleId = node.sourcePreset?.ownerModuleId;
      const path = node.storagePath == null
        ? null
        : normalizePhiBuilderCmsCatalogPath(node.storagePath);
      if (path != null && path !== "/" && ownerModuleId != null && ownerModuleId !== baseModuleId) {
        coveredPaths.add(path);
      }
      if (node.children) {
        collectCoveredPaths(node.children);
      }
    }
  };
  collectCoveredPaths(active);
  if (coveredPaths.size === 0) {
    return active;
  }

  const uncover = (candidates: readonly PhiPresetPageNode[]): PhiPresetPageNode[] => candidates
    .flatMap((node) => {
      if (
        node.sourcePreset?.ownerModuleId === baseModuleId &&
        node.storagePath != null &&
        coveredPaths.has(normalizePhiBuilderCmsCatalogPath(node.storagePath))
      ) {
        return [];
      }
      if (!node.children) {
        return [node];
      }
      const children = uncover(node.children);
      return pruneEmptied(node, children) ? [{ ...node, children }] : [];
    });
  return uncover(active);
}

/**
 * Whether the Page standing at `/` is the Area's own forward rather than a landing.
 *
 * The base Module of every Area behind a sign-in stands a forward there (`buildPhiAreaRootRoutePresetDescriptor`);
 * Public's base stands its Welcome Page, and a Site package offers a landing of its own. Which of them
 * answers an Area that stored nothing is the applicant chain's, so whether that Area forwards is a fact
 * about the applicant, not about the absent answer.
 */
function isPhiBuilderAreaRootForward(
  node: PhiPresetPageNode,
  area: PhiBuilderPageCatalogArea,
  baseModuleId: PhiRuntimeModuleId | null,
) {
  return node.sourcePreset != null &&
    node.sourcePreset.ownerModuleId === baseModuleId &&
    node.sourcePreset.presetKey === resolvePhiAreaRootRoutePresetKey(resolvePhiBuilderAreaAsCmsArea(area));
}

/**
 * The Pages of an Area that may actually be opened, which is not the same as the Pages it has.
 *
 * While `/` forwards it is not a Page anybody authors: the forward is the whole content of the root
 * preset's tree, and a stored revision replaces a preset's tree -- so authoring there would switch the
 * forward off without touching the Select that decides it. Taking the entry away is the whole fix: no
 * entry, no revision, no contradiction. It comes back with whatever it had when the Area is set to a
 * landing again, because nothing is cleaned up here either.
 *
 * `/` forwards when the Area stored a redirect, or when it stored nothing and the applicant that stands
 * there is the base Module's forward. Nothing stored is not a forward by itself: Public's root is its
 * Welcome Page then, or the landing a Site package offers, and reading the absent answer as a forward
 * kept the one Page every Site starts with out of its own Page list.
 *
 * Otherwise exactly the one root that is served. Every other applicant leaves the list either way --
 * an entry that cannot be reached is worse than a missing one, and two entries both reading `/` would
 * ask an author to guess which of them the visitor gets.
 */
export function resolvePhiBuilderOfferedPageCatalog(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
): PhiPresetPageNode[] {
  const catalog = resolvePhiBuilderActivePageCatalog(
    area,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  );
  const { baseModuleId, isActive } = resolvePhiBuilderAreaModuleActivation(state, area);
  const answered = removePhiBuilderUnansweredPresetPages(catalog, baseModuleId, isActive);
  const storedRootRoute = readPhiBuilderStoredAreaRootRoute(state, area);
  const rootApplicant = storedRootRoute?.mode === "redirect"
    ? null
    : resolvePhiBuilderAreaRootPageNode(state, area, answered);
  const rootPageNode = rootApplicant != null &&
    (storedRootRoute?.mode === "landing" || !isPhiBuilderAreaRootForward(rootApplicant, area, baseModuleId))
    ? rootApplicant
    : null;

  return answered.filter((node) =>
    node.storagePath !== "/" || (rootPageNode != null && node === rootPageNode));
}

/**
 * The Page a catalog path names, read against the Pages the Area answers with.
 *
 * The Select the Builder is steered by lists one entry per address, and those entries come from the
 * offered list -- so the path it emits has to be read back against that same list. Read against the
 * installed catalog instead, an address two Modules declare is answered by whichever was declared
 * first, and that is always the base Module: picking the covered address would send the Builder to a
 * Page that is not on offer, the normalisation above would move it off again, and it would land on
 * whatever the Area falls back to, which is the root.
 */
export function resolvePhiBuilderOfferedPageKeyFromCatalogPath(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
  path: string,
): string | null {
  return resolvePhiBuilderPageKeyFromCatalogPath(
    area,
    path,
    resolvePhiBuilderOfferedPageCatalog(state, area),
  );
}

/** The key of the Page a reference names, anywhere in the tree. */
function findPageKeyByReference(
  nodes: readonly PhiPresetPageNode[],
  reference: PhiPageReference,
): string | null {
  for (const node of nodes) {
    if (node.reference === reference) {
      return node.key;
    }
    const childKey = node.children ? findPageKeyByReference(node.children, reference) : null;
    if (childKey) {
      return childKey;
    }
  }
  return null;
}

/**
 * The Page the Builder should be on, given the one it asked for.
 *
 * The asked-for Page when the Area offers it. Otherwise the Area's landing, the Page at `/`, wherever
 * it is on offer: it is the front door, and the one Page every Area has. Otherwise where the front door
 * leads, because that is the answer to the question whoever set the forward just asked: `/` goes there,
 * so that is the Page they mean. Otherwise the first Page on offer, which without the steps before it
 * is an error Page -- whatever sorts first in a catalog is nobody's idea of a starting point.
 *
 * One order, one place. The workspace moves the Builder by it and the Page Select displays by it, and
 * if they each kept their own the Select would name one Page while the canvas edited another.
 */
export function resolvePhiBuilderOfferedPageKey(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
  requestedPageKey: string | null | undefined,
): { pages: PhiPresetPageNode[]; pageKey: string | null } {
  const pages = resolvePhiBuilderOfferedPageCatalog(state, area);
  const requested = resolvePhiBuilderRequestedPageKey(requestedPageKey, pages);
  if (requested) {
    return { pages, pageKey: requested };
  }

  return {
    pages,
    // Only the root the Area serves is left on the list at `/`, and only while it does not forward.
    pageKey: pages.find((node) => node.storagePath === "/")?.key
      ?? findAreaForwardTargetPageKey(state, area, pages)
      ?? findAreaNavigationEntryPageKey(state, area, pages)
      ?? resolvePhiBuilderActivePageKey(null, pages),
  };
}

function findAreaForwardTargetPageKey(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
  pages: readonly PhiPresetPageNode[],
) {
  const rootRoute = readPhiBuilderStoredAreaRootRoute(state, area);
  return rootRoute?.mode === "redirect"
    ? findPageKeyByReference(pages, rootRoute.targetLinkTarget.reference)
    : null;
}

/** The shell is drawn on the Page its Area leads to, below the landing at `/`. */
export function resolvePhiBuilderShellPreviewPage(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
  viewer: PhiAccessViewer,
): { pages: PhiPresetPageNode[]; pageKey: string | null } {
  const pages = resolvePhiBuilderOfferedPageCatalog(state, area);
  const isPreviewablePage = (key: string | null) => {
    const page = key ? findPhiPageNodePath(pages, key)?.at(-1) : null;
    if (!page?.storagePath || page.tombstoned || page.routeParameter) {
      return false;
    }
    const path = normalizePhiBuilderCmsCatalogPath(page.storagePath);
    return path !== "/" && !isPhiCmsErrorPagePath(path);
  };

  const forwardTargetKey = findAreaForwardTargetPageKey(state, area, pages);
  if (isPreviewablePage(forwardTargetKey)) {
    return { pages, pageKey: forwardTargetKey };
  }

  // Public has its Home entry in the header. Staff and App Area roots follow their own sidebar.
  const navKey = area === "public" ? "public:header" : resolvePhiAreaRootRouteNavKey(resolvePhiBuilderAreaAsCmsArea(area));
  const surface = state.navigationSurfacesByArea[area]?.find((candidate) => candidate.navKey === navKey);
  const findPageKey = (path: string) => findPhiBuilderPageKeyFromStoragePath(area, path, pages);
  const path = findFirstPhiCmsNavigationLinkPath(surface?.items ?? [], "/", {
    isVisible: (item) => canPhiViewerAccess(viewer, item.accessPolicy),
    acceptsPath: (candidate) => isPreviewablePage(findPageKey(candidate)),
  });
  return { pages, pageKey: path ? findPageKey(path) : null };
}

/**
 * Where a root that forwards on its own actually lands.
 *
 * With no target stored, the root preset forwards to the first entry of the Area's own sidebar --
 * `findFirstPhiCmsNavigationLinkPath` is the same walk it uses, so the Builder opens on the Page a
 * visitor arriving at `/` would reach rather than on whatever sorts first in the catalog, which is an
 * error Page. The surface is named by `resolvePhiAreaRootRouteNavKey`, the one statement of which
 * surface a root forwards through.
 *
 * A navigation target carries a runtime address, so it is matched against storage paths; `/` is
 * skipped for the reason the runtime skips it, which is that a root forwarding to itself is a loop.
 */
function findAreaNavigationEntryPageKey(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
  pages: readonly PhiPresetPageNode[],
) {
  const navKey = resolvePhiAreaRootRouteNavKey(resolvePhiBuilderAreaAsCmsArea(area));
  const surface = state.navigationSurfacesByArea?.[area]?.find((candidate) => candidate.navKey === navKey);
  const targetPath = surface ? findFirstPhiCmsNavigationLinkPath(surface.items, "/") : null;
  return targetPath ? findPhiBuilderPageKeyFromStoragePath(area, targetPath, pages) : null;
}

/**
 * Whether the open Page is a root the Builder has taken over to construct itself.
 *
 * True only for the Area's `/` and only while the landing is answered with nobody. It is what makes
 * that Page behave like a Page somebody just created: an empty canvas to build in, rather than the
 * Area's own Page copied into the drafts, which is what "I will make my own landing" cannot mean.
 *
 * Nothing about the live Site follows from it. The published root keeps standing until a revision for
 * `/` is published from `/pages`, exactly as a newly created Page does not exist for a visitor until
 * it is published.
 */
export function isPhiBuilderConstructedRootPage(
  state: PhiBuilderOfferedCatalogState,
  area: PhiBuilderPageCatalogArea,
  pageKey: string,
): boolean {
  if (resolvePhiAreaLandingSelection(readPhiBuilderStoredAreaRootRoute(state, area))?.kind !== "empty") {
    return false;
  }

  const catalog = resolvePhiBuilderActivePageCatalog(
    area,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  );
  return catalog.some((node) => node.key === pageKey && node.storagePath === "/");
}
