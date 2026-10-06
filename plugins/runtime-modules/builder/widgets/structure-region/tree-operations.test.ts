import { describe, expect, it } from "vitest";

import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../../../types/cms";
import type { PhiBuilderContainerMeta } from "../../../../../types/builder";
import { createPhiDraftCmsInstanceId, type PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { insertPhiStructureNode, removePhiStructureNode } from "./tree-operations";

const STACK = "@phis/ui/modules/core/layouts/flex-vertical";
const GRID = "@phis/ui/modules/core/layouts/grid";
const id = (sequence: number) => createPhiDraftCmsInstanceId({ domain: "page", draftRevisionId: 1, sequence });
const ROOT = id(1);

const sequentialMeta = {
  kind: "layout",
  slots: [{ sequential: true }],
  slotPositions: "compact",
} as unknown as PhiBuilderContainerMeta;
const positionedMeta = {
  kind: "layout",
  slots: [{ sequential: false }, { sequential: false }],
  slotPositions: "fixed",
} as unknown as PhiBuilderContainerMeta;
const metas = new Map<string, PhiBuilderContainerMeta>([[STACK, sequentialMeta], [GRID, positionedMeta]]);

function widget(nodeId: PhiCmsInstanceId, parent: PhiCmsInstanceId, slotIndex: number, sortOrder = 0): PhiCmsContentWidgetNode {
  return {
    id: nodeId,
    siteId: -1,
    parentLayoutNodeId: parent,
    widgetType: "@phis/ui/modules/core/widgets/text",
    slotIndex,
    sortOrder,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: null,
    config: {},
    contentId: null,
  } as PhiCmsContentWidgetNode;
}

function layout(
  nodeId: PhiCmsInstanceId,
  parent: PhiCmsInstanceId,
  widgetType: string,
  slotIndex: number,
  children: { childLayouts?: PhiCmsLayoutRenderNode[]; childWidgets?: PhiCmsContentWidgetNode[] } = {},
): PhiCmsLayoutRenderNode {
  return {
    id: nodeId,
    siteId: -1,
    parentLayoutNodeId: parent,
    widgetType,
    slotIndex,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: null,
    config: {},
    childLayouts: children.childLayouts ?? [],
    childWidgets: children.childWidgets ?? [],
  } as PhiCmsLayoutRenderNode;
}

const order = (nodes: readonly { id: PhiCmsInstanceId; slotIndex: number; sortOrder: number }[]) =>
  [...nodes].sort((left, right) => left.slotIndex - right.slotIndex || left.sortOrder - right.sortOrder).map((node) => node.id);

/**
 * The plus button adds behind what its slot holds, under the root and inside a Layout alike. Inside a
 * Layout it used to read the root's children for the sort order and go in front.
 */
describe("adding a picked node", () => {
  it("goes behind what the slot holds, in a nested sequential Layout as under the root", () => {
    const stack = layout(id(2), ROOT, STACK, 0, { childWidgets: [widget(id(3), id(2), 0), widget(id(4), id(2), 1)] });
    const children = { childLayouts: [stack], childWidgets: [widget(id(5), ROOT, 0)] };

    const nested = insertPhiStructureNode({
      children,
      rootNodeId: ROOT,
      rootDefinition: sequentialMeta,
      layoutMetasByType: metas,
      parentLayoutNodeId: id(2),
      slotIndex: 1,
      buildNode: (sortOrder) => widget(id(9), id(2), 1, sortOrder),
    });
    expect(order(nested!.childLayouts[0]!.childWidgets!)).toEqual([id(3), id(4), id(9)]);

    const root = insertPhiStructureNode({
      children,
      rootNodeId: ROOT,
      rootDefinition: sequentialMeta,
      layoutMetasByType: metas,
      parentLayoutNodeId: ROOT,
      slotIndex: 0,
      buildNode: (sortOrder) => widget(id(9), ROOT, 0, sortOrder),
    });
    expect(order([...root!.childLayouts, ...root!.childWidgets])).toEqual([id(2), id(5), id(9)]);
  });

  it("takes its sort order from the Layout it goes into, not from the root", () => {
    const grid = layout(id(2), ROOT, GRID, 0, { childWidgets: [widget(id(3), id(2), 1, 4)] });
    const inserted = insertPhiStructureNode({
      children: { childLayouts: [grid], childWidgets: [widget(id(5), ROOT, 1, 0)] },
      rootNodeId: ROOT,
      rootDefinition: positionedMeta,
      layoutMetasByType: metas,
      parentLayoutNodeId: id(2),
      slotIndex: 1,
      buildNode: (sortOrder) => widget(id(9), id(2), 1, sortOrder),
    });
    const added = inserted!.childLayouts[0]!.childWidgets!.find((node) => node.id === id(9));
    expect(added?.sortOrder).toBe(5);
  });

  it("adds nothing when the Layout it was meant for is gone", () => {
    expect(insertPhiStructureNode({
      children: { childLayouts: [], childWidgets: [] },
      rootNodeId: ROOT,
      rootDefinition: sequentialMeta,
      layoutMetasByType: metas,
      parentLayoutNodeId: id(2),
      slotIndex: 0,
      buildNode: (sortOrder) => widget(id(9), id(2), 0, sortOrder),
    })).toBeNull();
  });
});

/**
 * A delete leaves no gap in a sequential Layout's slots, at any depth. Only the root was tidied, so a
 * delete inside a Stack stored a hole that the Canvas then drew as an empty place.
 */
describe("deleting a node", () => {
  it("compacts the sequential Layout it stood in, however deep", () => {
    const stack = layout(id(2), ROOT, STACK, 0, {
      childWidgets: [widget(id(3), id(2), 0), widget(id(4), id(2), 1), widget(id(5), id(2), 2)],
    });
    const remaining = removePhiStructureNode({
      children: { childLayouts: [stack], childWidgets: [] },
      nodeId: id(4),
      nodeKind: "widget",
      rootDefinition: sequentialMeta,
      layoutMetasByType: metas,
    });
    expect(remaining.childLayouts[0]!.childWidgets!.map((node) => [node.id, node.slotIndex])).toEqual([
      [id(3), 0],
      [id(5), 1],
    ]);
  });

  it("keeps the slot numbers of a Layout whose slots are positions", () => {
    const grid = layout(id(2), ROOT, GRID, 0, { childWidgets: [widget(id(3), id(2), 0), widget(id(4), id(2), 1)] });
    const remaining = removePhiStructureNode({
      children: { childLayouts: [grid], childWidgets: [] },
      nodeId: id(3),
      nodeKind: "widget",
      rootDefinition: sequentialMeta,
      layoutMetasByType: metas,
    });
    expect(remaining.childLayouts[0]!.childWidgets!.map((node) => node.slotIndex)).toEqual([1]);
  });
});
