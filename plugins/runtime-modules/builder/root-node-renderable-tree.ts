import { PhiCmsFlags, PhiCmsRegionType } from "../../../constants/phi-cms";
import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiCmsLayoutRenderNode,
  PhiResolvedCmsPageTree,
} from "../../../types/cms";
import type { PhiCmsRegionConfig } from "../../../types";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { readPhiSurface } from "../../../types/surface";
import { normalizePhiPaddingWidgetConfig } from "../../../types/cms-config";
import {
  type PhiBuilderRootNodeDraft,
  buildPhiBuilderPreviewPageNode,
  buildPhiBuilderRootLayoutRenderNode,
  buildPhiBuilderRootNodeRenderConfig,
  normalizePhiBuilderRootNodeDraft,
} from "./root-node-normalization";

function collectLayoutNodes(
  node: PhiCmsLayoutRenderNode,
  nodes: PhiCmsLayoutNode[],
  parentLayoutNodeId: PhiCmsInstanceId | null,
) {
  nodes.push({
    id: node.id,
    siteId: node.siteId,
    parentLayoutNodeId,
    widgetType: node.widgetType,
    slotIndex: node.slotIndex,
    sortOrder: node.sortOrder,
    status: node.status,
    flags: node.flags,
    visibilityMask: node.visibilityMask,
    label: node.label,
    config: node.config,
  });

  for (const child of node.childLayouts ?? []) {
    collectLayoutNodes(child, nodes, node.id);
  }
}

function collectWidgetNodes(
  node: PhiCmsLayoutRenderNode,
  widgets: PhiCmsContentWidgetNode[],
  renderMode: "editor" | "preview",
) {
  widgets.push(
    ...(node.childWidgets ?? []).map((widget) => ({
      ...widget,
      parentLayoutNodeId: node.id,
      config: {
        ...(widget.config ?? {}),
        renderMode,
      },
    })),
  );

  for (const child of node.childLayouts ?? []) {
    collectWidgetNodes(child, widgets, renderMode);
  }
}

function resolveRegionConfig(
  regionType: number,
  regionConfig?: Record<string, unknown> | null,
): PhiCmsRegionConfig {
  const surface = readPhiSurface(regionConfig?.surface);
  const padding = normalizePhiPaddingWidgetConfig(regionConfig);
  const paddingConfig = padding == null
    ? {}
    : {
        ...(padding.padding == null ? {} : { padding: padding.padding }),
        ...(padding.paddingTop == null ? {} : { paddingTop: padding.paddingTop }),
        ...(padding.paddingRight == null ? {} : { paddingRight: padding.paddingRight }),
        ...(padding.paddingBottom == null ? {} : { paddingBottom: padding.paddingBottom }),
        ...(padding.paddingLeft == null ? {} : { paddingLeft: padding.paddingLeft }),
      };
  const surfaceConfig = surface == null ? {} : { surface };
  if (regionType === PhiCmsRegionType.SiderLeft || regionType === PhiCmsRegionType.SiderRight) {
    return {
      flags: PhiCmsFlags.FullHeight,
      size: {
        width: "100%",
        height: "100%",
      },
      ...surfaceConfig,
      ...paddingConfig,
    };
  }

  return {
    ...surfaceConfig,
    ...paddingConfig,
  };
}

export function buildPhiBuilderRootNodeRenderableTree({
  rootNode,
  regionType,
  renderMode,
  regionConfig,
}: {
  rootNode: PhiBuilderRootNodeDraft;
  regionType: number;
  renderMode: "editor" | "preview";
  regionConfig?: Record<string, unknown> | null;
}): PhiResolvedCmsPageTree | null {
  if (rootNode.kind === null || rootNode.kind === "widget") {
    return null;
  }

  const normalizedRootNode = normalizePhiBuilderRootNodeDraft(rootNode);
  if (normalizedRootNode.id == null) {
    return null;
  }
  const rootLayout = buildPhiBuilderRootLayoutRenderNode(
    { ...normalizedRootNode, id: normalizedRootNode.id },
    buildPhiBuilderRootNodeRenderConfig(normalizedRootNode, renderMode),
  );
  const layoutNodes: PhiCmsLayoutNode[] = [];
  const contentWidgets: PhiCmsContentWidgetNode[] = [];

  collectLayoutNodes(rootLayout, layoutNodes, null);
  collectWidgetNodes(rootLayout, contentWidgets, renderMode);

  return {
    page: buildPhiBuilderPreviewPageNode(rootLayout.id),
    regions: [
      {
        id: -1,
        pageId: -1,
        regionType,
        rootLayoutNodeId: rootLayout.id,
        status: 0,
        flags: 0,
        visibilityMask: 0,
        sortOrder: 0,
        config: {
          ...resolveRegionConfig(regionType, regionConfig),
        },
      },
    ],
    overlays: [],
    layoutNodes,
    contentWidgets,
  };
}
