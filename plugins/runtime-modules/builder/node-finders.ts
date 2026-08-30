import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";

export function findPhiBuilderLayoutNodeById(
  nodes: readonly PhiCmsLayoutRenderNode[],
  nodeId: PhiCmsInstanceId,
): PhiCmsLayoutRenderNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const childNode = findPhiBuilderLayoutNodeById(node.childLayouts ?? [], nodeId);
    if (childNode) {
      return childNode;
    }
  }

  return null;
}

export function findPhiBuilderWidgetNodeByIdInWidgets(
  nodes: readonly PhiCmsContentWidgetNode[],
  nodeId: PhiCmsInstanceId,
): PhiCmsContentWidgetNode | null {
  return nodes.find((node) => node.id === nodeId) ?? null;
}

export function findPhiBuilderWidgetNodeByIdInLayouts(
  nodes: readonly PhiCmsLayoutRenderNode[],
  nodeId: PhiCmsInstanceId,
): PhiCmsContentWidgetNode | null {
  for (const node of nodes) {
    const childWidget = findPhiBuilderWidgetNodeByIdInWidgets(node.childWidgets ?? [], nodeId);
    if (childWidget) {
      return childWidget;
    }

    const childNode = findPhiBuilderWidgetNodeByIdInLayouts(node.childLayouts ?? [], nodeId);
    if (childNode) {
      return childNode;
    }
  }

  return null;
}
