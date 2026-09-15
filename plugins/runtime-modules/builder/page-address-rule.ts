import { normalizePhiBuilderCmsCatalogPath, type PhiPresetPageNode } from "../../../helpers/cms-page-catalog";

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
