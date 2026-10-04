import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiCmsPaddingWidgetConfig } from "../../../types/cms-config";
import { normalizePhiPaddingWidgetConfig } from "../../../types/cms-config";
import {
  normalizePhiGeometryWidgetConfig,
  type PhiCmsGeometryWidgetConfig,
} from "../../../components/widgets/config/geometry";
import {
  isPhiAnchorWidgetPlacement,
  type PhiAnchorWidgetPlacement,
} from "../../../components/controls/phi-anchor-control-contract";
import { resolvePhiAnchorPlacement } from "../../../components/layouts/phi-layout-contract";
import type { PhiRenderableBlockRenderMode } from "../../../types";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiBuilderRootNodeKind } from "./preview-transport";
import { readPhiSurface, type PhiSurface } from "../../../types/surface";

/**
 * A Layout node as the Canvas renders it at the top of a scaffold: the Region's root Layout and every
 * Layout nested in it alike.
 *
 * It carries what the node is -- its id, type, label, config and children -- and nothing else. Its
 * anchor, inset, Surface and geometry live in `rootNodeConfig`, as they do in every node, and are read
 * from there (`normalizePhiBuilderRootNodeDraft`); nothing keeps a second copy that could disagree.
 */
export type PhiBuilderRootNodeDraft = {
  id?: PhiCmsInstanceId | null;
  typeKey: string;
  kind: PhiBuilderRootNodeKind;
  title?: string | null;
  packageName?: string | null;
  rootNodeConfig?: Record<string, unknown> | null;
  childLayouts?: PhiCmsLayoutRenderNode[];
  childWidgets?: PhiCmsContentWidgetNode[];
};

/** The scaffold's input for one Layout node: the node itself, nothing derived. */
export function readPhiBuilderRootNodeDraft(node: PhiCmsLayoutRenderNode): PhiBuilderRootNodeDraft {
  const segments = node.widgetType.split("/").filter(Boolean);
  return {
    id: node.id,
    typeKey: node.widgetType,
    kind: "layout",
    title: node.label ?? null,
    packageName: segments.length < 2 ? null : segments.slice(0, -1).join("/"),
    rootNodeConfig: node.config ?? null,
    childLayouts: node.childLayouts ?? [],
    childWidgets: node.childWidgets ?? [],
  };
}

/** What the scaffold reads off a node's config, read once and never stored. */
export type PhiBuilderRootNodeView = PhiBuilderRootNodeDraft & {
  rootNodeGeometry: PhiCmsGeometryWidgetConfig | null;
  rootNodeAnchor: PhiAnchorWidgetPlacement | null;
  rootNodePadding: PhiCmsPaddingWidgetConfig | null;
  rootNodeSurface: PhiSurface | null;
};

export function normalizePhiBuilderRootNodeDraft(rootNode: PhiBuilderRootNodeDraft): PhiBuilderRootNodeView {
  const config = rootNode.rootNodeConfig ?? {};
  const anchor = config.anchor;

  return {
    ...rootNode,
    rootNodeConfig: config,
    rootNodeGeometry: normalizePhiGeometryWidgetConfig(config),
    rootNodeAnchor: (isPhiAnchorWidgetPlacement(anchor)
      ? anchor
      : resolvePhiAnchorPlacement(anchor as Parameters<typeof resolvePhiAnchorPlacement>[0])) ?? null,
    rootNodePadding: normalizePhiPaddingWidgetConfig(config),
    rootNodeSurface: readPhiSurface(config.surface),
    childLayouts: rootNode.childLayouts ?? [],
    childWidgets: rootNode.childWidgets ?? [],
  };
}

/** The node's config as its Layout plugin parses it: the stored config, in the render mode asked for. */
export function buildPhiBuilderRootNodeRenderConfig(
  rootNode: PhiBuilderRootNodeDraft,
  renderMode: PhiRenderableBlockRenderMode,
): Record<string, unknown> {
  const config = { ...(rootNode.rootNodeConfig ?? {}) };
  delete config.renderMode;
  return { ...config, renderMode };
}
