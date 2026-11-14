import { normalizePhiBuilderCmsCatalogPath, type PhiPresetPageNode } from "../../../helpers/cms-page-catalog";
import { buildPhiRuntimeModulePackageRoutePrefix } from "../../../helpers/runtime-module-route-path";
import type { PhiRuntimeModuleId } from "../../../types";

export type PhiBuilderPageAddressConflict = {
  kind: "collision" | "nested";
  /** The address of the Site Page the requested one conflicts with. */
  path: string;
};

function collectSitePagePaths(nodes: readonly PhiPresetPageNode[], paths: string[] = []) {
  for (const node of nodes) {
    // Site Pages only: a Module Page has no Site path, and folders are not Pages.
    if (node.storagePath && !node.sourcePreset) {
      paths.push(normalizePhiBuilderCmsCatalogPath(node.storagePath));
    }
    if (node.children) collectSitePagePaths(node.children, paths);
  }
  return paths;
}

function liesBeneath(path: string, ancestor: string) {
  return ancestor !== "/" && path.startsWith(`${ancestor}/`);
}

/**
 * The Builder's early answer to "a Page is never a folder", from the catalog it holds, so the dialog can
 * object before a request is sent. The server decides under a lock and also counts pending and deleted
 * addresses the catalog may not show; this is only the part the Builder can already see.
 */
export function findPhiBuilderSitePageAddressConflict(
  requestedPath: string,
  catalog: readonly PhiPresetPageNode[],
  options: { exceptPath?: string | null } = {},
): PhiBuilderPageAddressConflict | null {
  const path = normalizePhiBuilderCmsCatalogPath(requestedPath);
  const except = options.exceptPath == null ? null : normalizePhiBuilderCmsCatalogPath(options.exceptPath);
  const others = collectSitePagePaths(catalog).filter((candidate) => candidate !== except);
  const equal = others.find((candidate) => candidate === path);
  if (equal) return { kind: "collision", path: equal };
  const nested = others.find((candidate) => liesBeneath(path, candidate) || liesBeneath(candidate, path));
  return nested ? { kind: "nested", path: nested } : null;
}

export function describePhiBuilderPageAddressConflict(conflict: PhiBuilderPageAddressConflict) {
  return conflict.kind === "collision"
    ? "Page path already exists."
    : `A Page is never a folder: this path and the Page at ${conflict.path} would lie one beneath the other.`;
}

export type PhiBuilderModuleAddressConflict = {
  moduleId: PhiRuntimeModuleId;
  /**
   * That the address is one of the Area's base Pages -- `/contact` in Public. Those are edited where they
   * are, in the Builder, so a Site Page beside them is never the way to change one.
   */
  base: boolean;
  /** The Module's address the Page would take or lie beneath: a route in Public, the package path elsewhere. */
  path: string;
};

function overlaps(left: string, right: string) {
  return left === right || liesBeneath(left, right) || liesBeneath(right, left);
}

/**
 * Whether a Site Page at this address would sit on a Module that is active in the Area.
 *
 * A Page is never put onto an address a Module answers on (PUBLIC_ADDRESSES.md section 1): in Public that
 * is each active Module's route, wherever this Site addressed it; in every other Area it is the Module's
 * whole package path, `/<scope>/<package>`, because there the path is the Module's identity and it has no
 * other address to yield to. Nested counts like equal, for the reason a Page is never a folder. The Area
 * root is nobody's: it is the landing slot, not a route.
 */
export function findPhiBuilderModuleAddressConflict(
  requestedPath: string,
  input: {
    area: string;
    activeModuleIds: readonly PhiRuntimeModuleId[];
    catalog: readonly PhiPresetPageNode[];
    /** The Area's base Module, whose Pages are edited in place rather than replaced by a Site Page. */
    baseModuleId?: PhiRuntimeModuleId | null;
  },
): PhiBuilderModuleAddressConflict | null {
  const path = normalizePhiBuilderCmsCatalogPath(requestedPath);
  if (path === "/") return null;
  const active = new Set(input.activeModuleIds);
  if (input.area !== "public") {
    for (const moduleId of input.activeModuleIds) {
      const prefix = buildPhiRuntimeModulePackageRoutePrefix(moduleId);
      if (overlaps(path, prefix)) return { moduleId, path: prefix, base: moduleId === input.baseModuleId };
    }
    return null;
  }
  const visit = (nodes: readonly PhiPresetPageNode[]): PhiBuilderModuleAddressConflict | null => {
    for (const node of nodes) {
      const owner = node.sourcePreset?.ownerModuleId;
      if (owner && active.has(owner) && node.storagePath) {
        const routePath = normalizePhiBuilderCmsCatalogPath(node.storagePath);
        if (routePath !== "/" && overlaps(path, routePath)) {
          return { moduleId: owner, path: routePath, base: owner === input.baseModuleId };
        }
      }
      const nested = visit(node.children ?? []);
      if (nested) return nested;
    }
    return null;
  };
  return visit(input.catalog);
}

export function describePhiBuilderModuleAddressConflict(conflict: PhiBuilderModuleAddressConflict) {
  return conflict.base
    ? `${conflict.path} is one of this Area's built-in Pages. Open it in the Builder and edit it there; a second Page cannot take its address.`
    : `The Module ${conflict.moduleId} answers on ${conflict.path}; a Page cannot take that address or one beneath it.`;
}

/**
 * The first Site Page that stands on a Module's package path, per Area, or null.
 *
 * Outside Public a Module answers under its package path and nowhere else, so a Site Page authored there
 * before the package was installed makes activation refuse until the Site moves the Page -- the newcomer
 * bears the cost, as it does in Public, and here it has no address to yield to.
 */
export function findPhiBuilderSitePageOnModulePackagePath(
  moduleId: PhiRuntimeModuleId,
  sitePagePaths: readonly string[],
) {
  const prefix = buildPhiRuntimeModulePackageRoutePrefix(moduleId);
  const path = sitePagePaths
    .map((candidate) => normalizePhiBuilderCmsCatalogPath(candidate))
    .find((candidate) => candidate !== "/" && overlaps(candidate, prefix));
  return path ? { prefix, path } : null;
}
