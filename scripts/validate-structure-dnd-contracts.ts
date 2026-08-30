import assert from "node:assert/strict";

import {
  swapPhiStructureWidgetsAcrossTrees,
  swapPhiStructureWidgetsInTree,
} from "../helpers/structure-widget-swap";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../types/cms";
import type { PhiCmsInstanceId } from "../types/cms-instance-id";

const id = (value: string) => value as PhiCmsInstanceId;

function widget(
  widgetId: string,
  parentLayoutNodeId: string,
  slotIndex: number,
  sortOrder: number,
): PhiCmsContentWidgetNode {
  return {
    id: id(widgetId),
    siteId: -1,
    parentLayoutNodeId: id(parentLayoutNodeId),
    widgetType: "@test/widgets/text",
    slotIndex,
    sortOrder,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: widgetId,
    config: { identity: widgetId },
    contentId: null,
  };
}

function layout(
  layoutId: string,
  parentLayoutNodeId: string,
  childWidgets: PhiCmsContentWidgetNode[],
): PhiCmsLayoutRenderNode {
  return {
    id: id(layoutId),
    siteId: -1,
    parentLayoutNodeId: id(parentLayoutNodeId),
    widgetType: "@test/layouts/content",
    slotIndex: 0,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: layoutId,
    config: {},
    childLayouts: [],
    childWidgets,
  };
}

function findWidget(
  childLayouts: PhiCmsLayoutRenderNode[],
  childWidgets: PhiCmsContentWidgetNode[],
  widgetId: string,
): PhiCmsContentWidgetNode {
  const direct = childWidgets.find((candidate) => candidate.id === widgetId);
  if (direct) return direct;
  for (const childLayout of childLayouts) {
    try {
      return findWidget(
        childLayout.childLayouts ?? [],
        childLayout.childWidgets ?? [],
        widgetId,
      );
    } catch {
      // Continue with the remaining subtrees.
    }
  }
  throw new Error(`Widget ${widgetId} not found.`);
}

const sameTree = swapPhiStructureWidgetsInTree({
  rootNodeId: id("root"),
  childLayouts: [layout("nested", "root", [widget("source", "nested", 2, 7)])],
  childWidgets: [widget("target", "root", 5, 11)],
  sourceWidgetId: id("source"),
  targetWidgetId: id("target"),
});
assert.ok(sameTree);
assert.deepEqual(
  findWidget(sameTree.childLayouts, sameTree.childWidgets, "source"),
  widget("source", "root", 5, 11),
);
assert.deepEqual(
  findWidget(sameTree.childLayouts, sameTree.childWidgets, "target"),
  widget("target", "nested", 2, 7),
);

const reversed = swapPhiStructureWidgetsInTree({
  rootNodeId: id("root"),
  childLayouts: sameTree.childLayouts,
  childWidgets: sameTree.childWidgets,
  sourceWidgetId: id("source"),
  targetWidgetId: id("target"),
});
assert.ok(reversed);
assert.equal(findWidget(reversed.childLayouts, reversed.childWidgets, "source").parentLayoutNodeId, "nested");
assert.equal(findWidget(reversed.childLayouts, reversed.childWidgets, "source").slotIndex, 2);
assert.equal(findWidget(reversed.childLayouts, reversed.childWidgets, "target").parentLayoutNodeId, "root");
assert.equal(findWidget(reversed.childLayouts, reversed.childWidgets, "target").slotIndex, 5);

const acrossTrees = swapPhiStructureWidgetsAcrossTrees({
  source: {
    rootNodeId: id("source-root"),
    childLayouts: [],
    childWidgets: [widget("source", "source-root", 1, 3)],
    widgetId: id("source"),
  },
  target: {
    rootNodeId: id("target-root"),
    childLayouts: [],
    childWidgets: [widget("target", "target-root", 4, 9)],
    widgetId: id("target"),
  },
});
assert.ok(acrossTrees);
assert.equal(findWidget(acrossTrees.source.childLayouts, acrossTrees.source.childWidgets, "target").parentLayoutNodeId, "source-root");
assert.equal(findWidget(acrossTrees.source.childLayouts, acrossTrees.source.childWidgets, "target").slotIndex, 1);
assert.equal(findWidget(acrossTrees.target.childLayouts, acrossTrees.target.childWidgets, "source").parentLayoutNodeId, "target-root");
assert.equal(findWidget(acrossTrees.target.childLayouts, acrossTrees.target.childWidgets, "source").slotIndex, 4);

console.log("Structure DnD contracts valid: same-tree and cross-tree Widget swaps are reversible.");
