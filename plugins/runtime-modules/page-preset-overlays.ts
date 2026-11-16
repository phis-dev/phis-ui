import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiResolvedCmsPageTree,
} from "../../types/cms";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";

/**
 * Lays the Overlays of a Page preset over a stored Page that answers for it (OVERLAYS.md, "Page
 * preset Overlays").
 *
 * A stored Page holds no copy of an Overlay its preset declares, so the preset's are taken from
 * `presetTree`, the same preset instantiated beside the stored tree: each Overlay, every Layout reachable
 * from its Header, Body and Footer roots, and every Widget under those Layouts, in the preset's order. A
 * stored Overlay with the id of a preset Overlay wins and its preset subtree is left out. Regions, the
 * Page row, Controller settings and every stored node stay as stored; with nothing to take the stored
 * tree itself is returned.
 *
 * The Area precedent is `composePhiCmsActiveAreaOverlayPresets` (descriptor-compiler.ts).
 */
export function composePhiCmsPagePresetOverlays({
  tree,
  presetTree,
}: {
  tree: PhiResolvedCmsPageTree;
  presetTree: PhiResolvedCmsPageTree;
}): PhiResolvedCmsPageTree {
  const storedOverlayIds = new Set(tree.overlays.map((node) => node.id));
  const presetOverlays = presetTree.overlays.filter((overlay) => !storedOverlayIds.has(overlay.id));
  if (presetOverlays.length === 0) return tree;

  const childLayoutsByParent = new Map<PhiCmsInstanceId, PhiCmsLayoutNode[]>();
  for (const layout of presetTree.layoutNodes) {
    if (layout.parentLayoutNodeId === null) continue;
    const siblings = childLayoutsByParent.get(layout.parentLayoutNodeId);
    if (siblings) siblings.push(layout);
    else childLayoutsByParent.set(layout.parentLayoutNodeId, [layout]);
  }
  const layoutsById = new Map(presetTree.layoutNodes.map((layout) => [layout.id, layout]));

  const takenLayoutIds = new Set<PhiCmsInstanceId>();
  const visit = (rootId: PhiCmsInstanceId | null) => {
    if (rootId === null) return;
    const stack = [rootId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (takenLayoutIds.has(id)) continue;
      const layout = layoutsById.get(id);
      if (!layout) continue;
      takenLayoutIds.add(id);
      for (const child of childLayoutsByParent.get(id) ?? []) stack.push(child.id);
    }
  };
  for (const overlay of presetOverlays) {
    visit(overlay.headerLayoutNodeId);
    visit(overlay.bodyLayoutNodeId);
    visit(overlay.footerLayoutNodeId);
  }

  const layouts: PhiCmsLayoutNode[] = presetTree.layoutNodes.filter((layout) => takenLayoutIds.has(layout.id));
  const widgets: PhiCmsContentWidgetNode[] = presetTree.contentWidgets.filter(
    (widget) => takenLayoutIds.has(widget.parentLayoutNodeId),
  );

  const occupiedIds = new Set<string>([
    ...tree.layoutNodes.map((node) => node.id),
    ...tree.contentWidgets.map((node) => node.id),
  ]);
  for (const node of [...presetOverlays, ...layouts, ...widgets]) {
    if (occupiedIds.has(node.id)) {
      throw new Error(`Page preset Overlay composition contains duplicate instance id "${node.id}".`);
    }
    occupiedIds.add(node.id);
  }

  return {
    ...tree,
    overlays: [...tree.overlays, ...presetOverlays],
    layoutNodes: [...tree.layoutNodes, ...layouts],
    contentWidgets: [...tree.contentWidgets, ...widgets],
  };
}
