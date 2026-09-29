import type { PhiCmsInstanceId } from "../types/cms-instance-id";

export const PHI_CMS_MAX_LAYOUT_SUBLAYOUT_DEPTH = 3;

export type PhiCmsLayoutDepthNode = {
  id: PhiCmsInstanceId;
  parentLayoutNodeId: PhiCmsInstanceId | null;
};

export type PhiCmsLayoutRenderDepthNode = PhiCmsLayoutDepthNode & {
  childLayouts?: readonly PhiCmsLayoutRenderDepthNode[];
};

export function resolvePhiCmsRenderLayoutNodeDepth(
  layoutNodes: readonly PhiCmsLayoutRenderDepthNode[],
  targetNodeId: PhiCmsInstanceId,
  depth = 1,
): number | null {
  for (const node of layoutNodes) {
    if (node.id === targetNodeId) {
      return depth;
    }

    const childDepth = resolvePhiCmsRenderLayoutNodeDepth(node.childLayouts ?? [], targetNodeId, depth + 1);
    if (childDepth != null) {
      return childDepth;
    }
  }

  return null;
}
