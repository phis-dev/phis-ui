import type { PhiTreeOption } from "../types/tree";
import { resolvePhiBuilderCmsFetchPath, resolvePhiBuilderCmsStoragePath } from "./cms-paths";
import type { PhiPresetPageNode } from "./cms-page-catalog";
import type { PhiPageReferenceSelection } from "../components/widgets/client/shared/phi-page-reference-picker";

export type PhiBuilderPageReferenceTreeLabels = {
  landing: string;
};

const PHI_BUILDER_PAGE_REFERENCE_TREE_DEFAULT_LABELS: PhiBuilderPageReferenceTreeLabels = {
  landing: "(Landing page)",
};

/**
 * The Area's Pages as the tree they are, with each node carrying what it stands for.
 *
 * Flattening this was the earlier answer and it cost the two things a tree is for. Nesting is how a
 * reader tells two Pages called "Overview" apart, and it is how a node that cannot be chosen keeps its
 * children reachable: a path with no Page of its own, or a Page whose deletion has been published, is
 * still the branch its children hang from. Those nodes stand here disabled rather than absent.
 *
 * `value` is the Page's own reference, never its path and never the Builder key -- `REFERENCES.md` names
 * both among the things that must not stand in for Page identity. A node with nothing to stand for takes
 * its Builder key as a value it can be told apart by, and carries no `meta`; the absent `meta` is what
 * makes it unchoosable, rather than something the caller has to check after the click.
 *
 * `/` carries its slot after its title. Whoever answers the root -- the base welcome, a Site package's
 * landing -- tends to be called "Home", and so does the `/home` Page next to it; two entries with one
 * name ask an author to guess. The mark sits in the label rather than the description, because a closed
 * Select shows the label alone. `meta.title` keeps the bare title, which is what a link drawn from the
 * pick should read.
 */
export function buildPhiBuilderPageReferenceTree(
  area: Parameters<typeof resolvePhiBuilderCmsFetchPath>[0],
  nodes: readonly PhiPresetPageNode[],
  allNodes: readonly PhiPresetPageNode[],
  labels: PhiBuilderPageReferenceTreeLabels = PHI_BUILDER_PAGE_REFERENCE_TREE_DEFAULT_LABELS,
): PhiTreeOption<PhiPageReferenceSelection>[] {
  return nodes.map((node) => {
    const path = resolvePhiBuilderCmsFetchPath(area, node.key, allNodes);
    const reference = node.tombstoned === true ? undefined : node.reference;
    return {
      value: reference ?? node.key,
      label: node.storagePath === "/" ? labelLanding(node.title, labels) : node.title,
      description: path,
      ...(reference
        ? { meta: { reference, title: node.title, path } }
        : { disabled: true }),
      ...(node.children?.length
        ? { children: buildPhiBuilderPageReferenceTree(area, node.children, allNodes, labels) }
        : {}),
    };
  });
}

function labelLanding(title: string, labels: PhiBuilderPageReferenceTreeLabels) {
  const trimmed = title.trim();
  return trimmed ? `${trimmed} ${labels.landing}` : labels.landing;
}

/** How the Page scope picker tells a folder's value from a Page reference. */
export const PHI_PAGE_SCOPE_FOLDER_VALUE_PREFIX = "folder:";

/**
 * The Area's Pages for a Region's Page scope (SHELL.md "Region visibility per Page"): the tree above,
 * with its folders choosable too.
 *
 * A folder is not a Page and has no reference -- a Site Page is never nested under another -- so the
 * only thing that names it is the start of its Pages' paths. That start is read off the nearest Page
 * below it, one segment dropped per level, rather than off the folder's catalog key: outside Public the
 * key leaves the package namespace out, and the address a visitor opens does not.
 *
 * A Page that has Pages below it (a Module's) keeps its reference; choosing it chooses the subtree.
 * A Page whose deletion has been published stays unchoosable, as in the tree above.
 */
export function buildPhiBuilderPageScopeTree(
  area: Parameters<typeof resolvePhiBuilderCmsFetchPath>[0],
  nodes: readonly PhiPresetPageNode[],
  allNodes: readonly PhiPresetPageNode[],
  labels: PhiBuilderPageReferenceTreeLabels = PHI_BUILDER_PAGE_REFERENCE_TREE_DEFAULT_LABELS,
): PhiTreeOption[] {
  return nodes.map((node) => {
    const children = node.children?.length
      ? buildPhiBuilderPageScopeTree(area, node.children, allNodes, labels)
      : undefined;
    const reference = node.tombstoned === true ? undefined : node.reference;
    const folder = reference == null && node.children?.length
      ? resolveFolderPath(area, node.children, allNodes)
      : null;
    return {
      value: reference ?? (folder ? `${PHI_PAGE_SCOPE_FOLDER_VALUE_PREFIX}${folder}` : node.key),
      label: node.storagePath === "/" ? labelLanding(node.title, labels) : node.title,
      description: folder ?? resolvePhiBuilderCmsFetchPath(area, node.key, allNodes),
      ...(reference == null && folder == null ? { disabled: true } : {}),
      ...(children ? { children } : {}),
    };
  });
}

/** The folder's own path, from the first Page below it, `depth` levels down. */
function resolveFolderPath(
  area: Parameters<typeof resolvePhiBuilderCmsFetchPath>[0],
  nodes: readonly PhiPresetPageNode[],
  allNodes: readonly PhiPresetPageNode[],
  depth = 1,
): string | null {
  for (const node of nodes) {
    if (node.reference != null) {
      const segments = resolvePhiBuilderCmsStoragePath(area, node.key, allNodes).split("/").filter(Boolean);
      return segments.length > depth ? `/${segments.slice(0, segments.length - depth).join("/")}` : null;
    }
  }
  for (const node of nodes) {
    const below = node.children?.length ? resolveFolderPath(area, node.children, allNodes, depth + 1) : null;
    if (below != null) {
      return below;
    }
  }
  return null;
}
