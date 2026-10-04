import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";

/**
 * The Region's root Layout, read and written as the one node it is.
 *
 * A Region draft holds its root Layout as `rootNode`, a Layout node like every node nested in it, so
 * the Inspector, the Canvas and persistence treat the two alike. These helpers are for the many places
 * that only touch the root's children; whatever touches the root's config goes through the node.
 */
type PhiBuilderRegionRootHolder = { rootNode?: PhiCmsLayoutRenderNode | null };

const PHI_BUILDER_NO_CHILD_LAYOUTS: readonly PhiCmsLayoutRenderNode[] = [];
const PHI_BUILDER_NO_CHILD_WIDGETS: readonly PhiCmsContentWidgetNode[] = [];

export function readPhiBuilderRegionRootChildLayouts(
  draft: PhiBuilderRegionRootHolder | null | undefined,
): PhiCmsLayoutRenderNode[] {
  return draft?.rootNode?.childLayouts ?? (PHI_BUILDER_NO_CHILD_LAYOUTS as PhiCmsLayoutRenderNode[]);
}

export function readPhiBuilderRegionRootChildWidgets(
  draft: PhiBuilderRegionRootHolder | null | undefined,
): PhiCmsContentWidgetNode[] {
  return draft?.rootNode?.childWidgets ?? (PHI_BUILDER_NO_CHILD_WIDGETS as PhiCmsContentWidgetNode[]);
}

/**
 * The draft with its root's children replaced; a side left out stays as it is. A draft without a root
 * has no children to replace and comes back unchanged.
 */
export function withPhiBuilderRegionRootChildren<TDraft extends PhiBuilderRegionRootHolder>(
  draft: TDraft,
  children: { childLayouts?: PhiCmsLayoutRenderNode[]; childWidgets?: PhiCmsContentWidgetNode[] },
): TDraft {
  if (!draft.rootNode) {
    return draft;
  }
  return {
    ...draft,
    rootNode: {
      ...draft.rootNode,
      ...(children.childLayouts ? { childLayouts: children.childLayouts } : {}),
      ...(children.childWidgets ? { childWidgets: children.childWidgets } : {}),
    },
  };
}
