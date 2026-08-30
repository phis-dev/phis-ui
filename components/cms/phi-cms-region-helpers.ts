import type { PhiResolvedCmsRenderableTree } from "../../types/cms";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";

export function hasRenderableRegionRoot(tree: PhiResolvedCmsRenderableTree, rootLayoutNodeId: PhiCmsInstanceId) {
  return tree.layoutNodes.some((node) => node.id === rootLayoutNodeId);
}
