import type { PhiPageReference } from "../../../types/references";
import type { PhiTreeOption } from "../../../types/tree";
import { resolvePhiBuilderCmsFetchPath } from "../../../helpers/cms-paths";
import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";

export type PhiBuilderPageReferenceSelection = {
  reference: PhiPageReference;
  title: string;
  path: string;
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
 */
export function buildPhiBuilderPageReferenceTree(
  area: Parameters<typeof resolvePhiBuilderCmsFetchPath>[0],
  nodes: readonly PhiPresetPageNode[],
  allNodes: readonly PhiPresetPageNode[],
): PhiTreeOption<PhiBuilderPageReferenceSelection>[] {
  return nodes.map((node) => {
    const path = resolvePhiBuilderCmsFetchPath(area, node.key, allNodes);
    const reference = node.tombstoned === true ? undefined : node.reference;
    return {
      value: reference ?? node.key,
      label: node.title,
      description: path,
      ...(reference
        ? { meta: { reference, title: node.title, path } }
        : { disabled: true }),
      ...(node.children?.length
        ? { children: buildPhiBuilderPageReferenceTree(area, node.children, allNodes) }
        : {}),
    };
  });
}
