import type { PhiCmsInstanceId } from "../types/cms-instance-id";

export const PHI_CMS_MAX_LAYOUT_SUBLAYOUT_DEPTH = 3;

export type PhiCmsLayoutDepthNode = {
  id: PhiCmsInstanceId;
  parentLayoutNodeId: PhiCmsInstanceId | null;
};

export function resolvePhiCmsFlatLayoutNodeDepth(
  layoutNodes: readonly PhiCmsLayoutDepthNode[],
  targetNodeId: PhiCmsInstanceId,
) {
  const nodesById = new Map(layoutNodes.map((node) => [node.id, node]));
  const visiting = new Set<PhiCmsInstanceId>();

  function resolveDepth(nodeId: PhiCmsInstanceId): number | null {
    const node = nodesById.get(nodeId);
    if (!node) {
      return null;
    }

    if (node.parentLayoutNodeId == null) {
      return 0;
    }

    if (visiting.has(nodeId)) {
      return null;
    }

    visiting.add(nodeId);
    const parentDepth = resolveDepth(node.parentLayoutNodeId);
    visiting.delete(nodeId);

    return parentDepth == null ? null : parentDepth + 1;
  }

  return resolveDepth(targetNodeId);
}

export function collectPhiCmsLayoutDepthValidationErrors(
  layoutNodes: readonly PhiCmsLayoutDepthNode[],
  maxDepth = PHI_CMS_MAX_LAYOUT_SUBLAYOUT_DEPTH,
) {
  const errors: string[] = [];

  for (const node of layoutNodes) {
    const depth = resolvePhiCmsFlatLayoutNodeDepth(layoutNodes, node.id);
    if (depth == null) {
      errors.push(`Layout node ${node.id} has a circular or unresolved parent chain.`);
      continue;
    }

    if (depth > maxDepth) {
      errors.push(`Layout node ${node.id} exceeds maximum layout depth ${maxDepth}.`);
    }
  }

  return errors;
}

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
