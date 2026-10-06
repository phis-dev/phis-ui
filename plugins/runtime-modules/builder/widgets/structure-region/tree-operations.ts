import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../../../types/cms";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiBuilderContainerMeta } from "../../../../../types/builder";
import {
  compactPhiCmsSequentialChildren,
  compactsPhiCmsSequentialSlots,
} from "../../sequential-slot-helpers";

/*
 * What the Structure Region does to a Region's tree when a node is added or deleted, as functions of
 * the tree alone.
 *
 * They used to be written inline in the Region Widget against the children it had read at render, and
 * each of the four ways of doing it -- add or delete, under the root or under a Layout -- had grown its
 * own rule: an add waited for the server and then wrote the tree it had read before waiting, an add
 * under the root went behind what stood in the slot and one under a Layout in front of it, and a delete
 * tidied the root's slots but left the gaps it made inside a Layout. Here there is one rule for each,
 * and the caller hands in the tree as it stands now.
 */

export type PhiStructureChildren = {
  childLayouts: PhiCmsLayoutRenderNode[];
  childWidgets: PhiCmsContentWidgetNode[];
};

/**
 * A Region tree whose sequential Layouts hold their children in slots 0, 1, 2, ... without gaps, at
 * every depth. A Layout whose slots are positions (a grid, two columns) keeps its slot numbers: there
 * an empty slot is a place, not a gap.
 */
export function compactPhiStructureSequentialLayouts(
  nodes: readonly PhiCmsLayoutRenderNode[],
  layoutMetasByType: ReadonlyMap<string, PhiBuilderContainerMeta>,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => {
    const nestedLayouts = compactPhiStructureSequentialLayouts(node.childLayouts ?? [], layoutMetasByType);
    if (!compactsPhiCmsSequentialSlots(layoutMetasByType.get(node.widgetType))) {
      return { ...node, childLayouts: nestedLayouts };
    }
    const compacted = compactPhiCmsSequentialChildren({
      childLayouts: nestedLayouts,
      childWidgets: node.childWidgets ?? [],
    });
    return { ...node, childLayouts: compacted.childLayouts, childWidgets: compacted.childWidgets };
  });
}

function compactChildrenOf(
  children: PhiStructureChildren,
  definition: PhiBuilderContainerMeta | null | undefined,
): PhiStructureChildren {
  return compactsPhiCmsSequentialSlots(definition)
    ? compactPhiCmsSequentialChildren(children)
    : children;
}

/**
 * The sort order a node added to `slotIndex` takes among the children already there: after the last of
 * them. Read from the children of the Layout it goes into -- reading the root's children for a slot
 * inside a nested Layout put it in front of whatever that slot held.
 */
export function resolvePhiStructureNextSortOrder(children: PhiStructureChildren, slotIndex: number) {
  return [...children.childLayouts, ...children.childWidgets]
    .filter((child) => child.slotIndex === slotIndex)
    .reduce((maxSortOrder, child) => Math.max(maxSortOrder, child.sortOrder), -1) + 1;
}

function mapLayoutById(
  nodes: readonly PhiCmsLayoutRenderNode[],
  layoutId: PhiCmsInstanceId,
  map: (node: PhiCmsLayoutRenderNode) => PhiCmsLayoutRenderNode,
): { nodes: PhiCmsLayoutRenderNode[]; found: boolean } {
  let found = false;
  const next = nodes.map((node) => {
    if (found) return node;
    if (node.id === layoutId) {
      found = true;
      return map(node);
    }
    const nested = mapLayoutById(node.childLayouts ?? [], layoutId, map);
    if (!nested.found) return node;
    found = true;
    return { ...node, childLayouts: nested.nodes };
  });
  return { nodes: next, found };
}

function findLayoutById(
  nodes: readonly PhiCmsLayoutRenderNode[],
  layoutId: PhiCmsInstanceId,
): PhiCmsLayoutRenderNode | null {
  for (const node of nodes) {
    if (node.id === layoutId) return node;
    const nested = findLayoutById(node.childLayouts ?? [], layoutId);
    if (nested) return nested;
  }
  return null;
}

/**
 * The root's children with one node added into `slotIndex` of `parentLayoutNodeId` -- the root itself
 * when it is the root's id. The node goes behind what the slot already holds, under the root and under
 * a Layout alike, and the Layout it went into is compacted if it is sequential.
 *
 * `null` when the parent is not in the tree: the caller read its target before waiting for the new
 * node's id, and the Layout may have been deleted meanwhile. Nothing is added then, and the caller
 * says so rather than writing the tree back unchanged.
 */
export function insertPhiStructureNode({
  children,
  rootNodeId,
  rootDefinition,
  layoutMetasByType,
  parentLayoutNodeId,
  slotIndex,
  buildNode,
}: {
  children: PhiStructureChildren;
  rootNodeId: PhiCmsInstanceId;
  rootDefinition: PhiBuilderContainerMeta | null | undefined;
  layoutMetasByType: ReadonlyMap<string, PhiBuilderContainerMeta>;
  parentLayoutNodeId: PhiCmsInstanceId;
  slotIndex: number;
  buildNode: (sortOrder: number) => PhiCmsLayoutRenderNode | PhiCmsContentWidgetNode;
}): PhiStructureChildren | null {
  const addTo = (parentChildren: PhiStructureChildren, definition: PhiBuilderContainerMeta | null | undefined) => {
    const node = buildNode(resolvePhiStructureNextSortOrder(parentChildren, slotIndex));
    return compactChildrenOf(
      "contentId" in node
        ? { childLayouts: parentChildren.childLayouts, childWidgets: [...parentChildren.childWidgets, node] }
        : { childLayouts: [...parentChildren.childLayouts, node], childWidgets: parentChildren.childWidgets },
      definition,
    );
  };

  if (parentLayoutNodeId === rootNodeId) {
    return addTo(children, rootDefinition);
  }
  const parent = findLayoutById(children.childLayouts, parentLayoutNodeId);
  if (!parent) {
    return null;
  }
  const mapped = mapLayoutById(children.childLayouts, parentLayoutNodeId, (node) => ({
    ...node,
    ...addTo(
      { childLayouts: node.childLayouts ?? [], childWidgets: node.childWidgets ?? [] },
      layoutMetasByType.get(node.widgetType),
    ),
  }));
  return { childLayouts: mapped.nodes, childWidgets: children.childWidgets };
}

function removeLayout(nodes: readonly PhiCmsLayoutRenderNode[], nodeId: PhiCmsInstanceId): PhiCmsLayoutRenderNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => ({ ...node, childLayouts: removeLayout(node.childLayouts ?? [], nodeId) }));
}

function removeWidget(nodes: readonly PhiCmsLayoutRenderNode[], nodeId: PhiCmsInstanceId): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => ({
    ...node,
    childLayouts: removeWidget(node.childLayouts ?? [], nodeId),
    childWidgets: (node.childWidgets ?? []).filter((child) => child.id !== nodeId),
  }));
}

/**
 * The root's children without one node, at whatever depth it stood, and with every sequential Layout
 * compacted again -- the root and the Layouts below it alike, so a delete inside a Stack leaves no gap
 * in its slots to be stored and drawn as an empty place.
 */
export function removePhiStructureNode({
  children,
  nodeId,
  nodeKind,
  rootDefinition,
  layoutMetasByType,
}: {
  children: PhiStructureChildren;
  nodeId: PhiCmsInstanceId;
  nodeKind: "layout" | "widget";
  rootDefinition: PhiBuilderContainerMeta | null | undefined;
  layoutMetasByType: ReadonlyMap<string, PhiBuilderContainerMeta>;
}): PhiStructureChildren {
  const childLayouts = compactPhiStructureSequentialLayouts(
    nodeKind === "widget" ? removeWidget(children.childLayouts, nodeId) : removeLayout(children.childLayouts, nodeId),
    layoutMetasByType,
  );
  const childWidgets = nodeKind === "widget"
    ? children.childWidgets.filter((child) => child.id !== nodeId)
    : children.childWidgets;
  return compactChildrenOf({ childLayouts, childWidgets }, rootDefinition);
}
