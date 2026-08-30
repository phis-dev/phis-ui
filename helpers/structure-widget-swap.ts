import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../types/cms";
import type { PhiCmsInstanceId } from "../types/cms-instance-id";

export type PhiExtractedStructureNode = {
  childLayouts: PhiCmsLayoutRenderNode[];
  childWidgets: PhiCmsContentWidgetNode[];
  node: PhiCmsLayoutRenderNode | PhiCmsContentWidgetNode | null;
};

export function extractPhiStructureNode(
  childLayouts: readonly PhiCmsLayoutRenderNode[],
  childWidgets: readonly PhiCmsContentWidgetNode[],
  nodeId: PhiCmsInstanceId,
  nodeKind: "layout" | "widget",
): PhiExtractedStructureNode {
  let extractedNode: PhiExtractedStructureNode["node"] = null;
  const nextWidgets = childWidgets.filter((widget) => {
    if (nodeKind === "widget" && widget.id === nodeId) {
      extractedNode = widget;
      return false;
    }
    return true;
  });
  const nextLayouts: PhiCmsLayoutRenderNode[] = [];

  for (const layout of childLayouts) {
    if (nodeKind === "layout" && layout.id === nodeId) {
      extractedNode = layout;
      continue;
    }
    if (extractedNode) {
      nextLayouts.push(layout);
      continue;
    }
    const nested = extractPhiStructureNode(
      layout.childLayouts ?? [],
      layout.childWidgets ?? [],
      nodeId,
      nodeKind,
    );
    if (nested.node) {
      extractedNode = nested.node;
      nextLayouts.push({
        ...layout,
        childLayouts: nested.childLayouts,
        childWidgets: nested.childWidgets,
      });
    } else {
      nextLayouts.push(layout);
    }
  }

  return {
    childLayouts: nextLayouts,
    childWidgets: nextWidgets,
    node: extractedNode,
  };
}

function appendWidgetChildById(
  nodes: readonly PhiCmsLayoutRenderNode[],
  targetNodeId: PhiCmsInstanceId,
  nextChild: PhiCmsContentWidgetNode,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => node.id === targetNodeId
    ? { ...node, childWidgets: [...(node.childWidgets ?? []), nextChild] }
    : (node.childLayouts?.length ?? 0) === 0
      ? node
      : {
          ...node,
          childLayouts: appendWidgetChildById(node.childLayouts, targetNodeId, nextChild),
        });
}

function insertWidgetAtStructurePosition(
  childLayouts: PhiCmsLayoutRenderNode[],
  childWidgets: PhiCmsContentWidgetNode[],
  rootNodeId: PhiCmsInstanceId,
  widget: PhiCmsContentWidgetNode,
  position: Pick<PhiCmsContentWidgetNode, "parentLayoutNodeId" | "slotIndex" | "sortOrder">,
) {
  const movedWidget = {
    ...widget,
    parentLayoutNodeId: position.parentLayoutNodeId,
    slotIndex: position.slotIndex,
    sortOrder: position.sortOrder,
  };
  return position.parentLayoutNodeId === rootNodeId
    ? { childLayouts, childWidgets: [...childWidgets, movedWidget] }
    : {
        childLayouts: appendWidgetChildById(childLayouts, position.parentLayoutNodeId, movedWidget),
        childWidgets,
      };
}

export function swapPhiStructureWidgetsInTree({
  childLayouts,
  childWidgets,
  rootNodeId,
  sourceWidgetId,
  targetWidgetId,
}: {
  childLayouts: PhiCmsLayoutRenderNode[];
  childWidgets: PhiCmsContentWidgetNode[];
  rootNodeId: PhiCmsInstanceId;
  sourceWidgetId: PhiCmsInstanceId;
  targetWidgetId: PhiCmsInstanceId;
}) {
  const sourceExtracted = extractPhiStructureNode(
    childLayouts,
    childWidgets,
    sourceWidgetId,
    "widget",
  );
  const targetExtracted = extractPhiStructureNode(
    sourceExtracted.childLayouts,
    sourceExtracted.childWidgets,
    targetWidgetId,
    "widget",
  );
  if (
    !sourceExtracted.node ||
    !("contentId" in sourceExtracted.node) ||
    !targetExtracted.node ||
    !("contentId" in targetExtracted.node)
  ) {
    return null;
  }

  const withSourceAtTarget = insertWidgetAtStructurePosition(
    targetExtracted.childLayouts,
    targetExtracted.childWidgets,
    rootNodeId,
    sourceExtracted.node,
    targetExtracted.node,
  );
  return insertWidgetAtStructurePosition(
    withSourceAtTarget.childLayouts,
    withSourceAtTarget.childWidgets,
    rootNodeId,
    targetExtracted.node,
    sourceExtracted.node,
  );
}

export function swapPhiStructureWidgetsAcrossTrees({
  source,
  target,
}: {
  source: {
    childLayouts: PhiCmsLayoutRenderNode[];
    childWidgets: PhiCmsContentWidgetNode[];
    rootNodeId: PhiCmsInstanceId;
    widgetId: PhiCmsInstanceId;
  };
  target: {
    childLayouts: PhiCmsLayoutRenderNode[];
    childWidgets: PhiCmsContentWidgetNode[];
    rootNodeId: PhiCmsInstanceId;
    widgetId: PhiCmsInstanceId;
  };
}) {
  const sourceExtracted = extractPhiStructureNode(
    source.childLayouts,
    source.childWidgets,
    source.widgetId,
    "widget",
  );
  const targetExtracted = extractPhiStructureNode(
    target.childLayouts,
    target.childWidgets,
    target.widgetId,
    "widget",
  );
  if (
    !sourceExtracted.node ||
    !("contentId" in sourceExtracted.node) ||
    !targetExtracted.node ||
    !("contentId" in targetExtracted.node)
  ) {
    return null;
  }

  return {
    source: insertWidgetAtStructurePosition(
      sourceExtracted.childLayouts,
      sourceExtracted.childWidgets,
      source.rootNodeId,
      targetExtracted.node,
      sourceExtracted.node,
    ),
    target: insertWidgetAtStructurePosition(
      targetExtracted.childLayouts,
      targetExtracted.childWidgets,
      target.rootNodeId,
      sourceExtracted.node,
      targetExtracted.node,
    ),
  };
}
