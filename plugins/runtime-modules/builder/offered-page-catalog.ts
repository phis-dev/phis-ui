"use client";

import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import {
  choosePhiAreaRootApplicant,
  resolvePhiAreaLandingSelection,
} from "../../../helpers/cms-area-config";
import {
  findPhiBuilderPageKeyFromStoragePath,
  normalizePhiBuilderCmsCatalogPath,
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderActivePageKey,
  type PhiBuilderPageCatalogArea,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import { findFirstPhiCmsNavigationLinkPath } from "../../../components/regions/presets/navigation-redirect";
import type { PhiPageReference } from "../../../types/references";
import { resolvePhiRuntimeAreaDefinition } from "../area-definitions";
import { resolvePhiAreaRootRouteNavKey } from "../area-root-route";
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
  | "areaRootRoutes"
>;

/**
 * Which Modules answer in this Area, and which Module the Area itself is.
 *
 * Switched on here, or the Area's own base Module -- which is never in the selection because it is
 * never switchable: the Area is its Module. Leaving it out would drop the landing every Site starts
 * with from the list of the landings it may choose, and would leave the root slot with no applicant
 * to fall back to.
 */
export function resolvePhiBuilderAreaModuleActivation(
  state: Pick<PhiBuilderOfferedCatalogState, "runtimeModuleIdsByArea">,
  area: PhiBuilderPageCatalogArea,
) {
  const baseModuleId = resolvePhiRuntimeAreaDefinition(resolvePhiBuilderAreaAsCmsArea(area))?.baseModuleId ?? null;
  const selectedModuleIds = new Set(state.runtimeModuleIdsByArea?.[area] ?? []);
  return {
    baseModuleId,
    isActive: (moduleId: PhiRuntimeModuleId) =>
      moduleId === baseModuleId || selectedModuleIds.has(moduleId),
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
 * The Pages of an Area that may actually be opened, which is not the same as the Pages it has.
 *
 * While `/` forwards it is not a Page anybody authors: the forward is the whole content of the root
 * preset's tree, and a stored revision replaces a preset's tree -- so authoring there would switch the
 * forward off without touching the Select that decides it. Taking the entry away is the whole fix: no
 * entry, no revision, no contradiction. It comes back with whatever it had when the Area is set to a
 * landing again, because nothing is cleaned up here either.
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
  const forwards = readPhiBuilderStoredAreaRootRoute(state, area)?.mode !== "landing";
  const rootPageNode = forwards ? null : resolvePhiBuilderAreaRootPageNode(state, area, answered);

  return answered.filter((node) =>
    node.storagePath !== "/" || (rootPageNode != null && node === rootPageNode));
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
 * The asked-for Page when the Area offers it. Otherwise where the front door leads, because that is
 * the answer to the question whoever set the forward just asked: `/` goes there, so that is the Page
 * they mean. Otherwise the first Page on offer, which without the step before it is an error Page --
 * whatever sorts first in a catalog is nobody's idea of a starting point.
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
  const requested = requestedPageKey?.trim() ?? "";
  if (requested && resolvePhiBuilderActivePageKey(requested, pages) === requested) {
    return { pages, pageKey: requested };
  }

  const rootRoute = readPhiBuilderStoredAreaRootRoute(state, area);
  const forwardTargetKey = rootRoute?.mode === "redirect"
    ? findPageKeyByReference(pages, rootRoute.target)
    : null;

  return {
    pages,
    pageKey: forwardTargetKey
      ?? findAreaNavigationEntryPageKey(state, area, pages)
      ?? resolvePhiBuilderActivePageKey(null, pages),
  };
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
