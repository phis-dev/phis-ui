import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiCmsPaddingWidgetConfig } from "../../../types/cms-config";
import { mergePhiCmsConfigValues, normalizePhiPaddingWidgetConfig } from "../../../types/cms-config";
import type { PhiCmsGeometryWidgetConfig } from "../../../components/widgets/config/geometry";
import {
  resolvePhiRenderableBlockAnchor,
  type PhiAnchorWidgetPlacement,
} from "../../../components/controls/phi-anchor-control-contract";
import type { PhiRenderableBlockRenderMode } from "../../../types";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiBuilderPreviewRegionDraft, PhiBuilderRootNodeKind } from "./preview-transport";
import { readPhiSurface, type PhiSurface } from "../../../types/surface";

export type PhiBuilderRootNodeDraft = {
  id?: PhiCmsInstanceId | null;
  typeKey: string;
  kind: PhiBuilderRootNodeKind;
  title?: string | null;
  packageName?: string | null;
  rootNodeConfig?: Record<string, unknown> | null;
  rootNodeGeometry?: PhiCmsGeometryWidgetConfig | null;
  rootNodeAnchor?: PhiAnchorWidgetPlacement | null;
  rootNodePadding?: PhiCmsPaddingWidgetConfig | null;
  rootNodeSurface?: PhiSurface | null;
  childLayouts?: PhiCmsLayoutRenderNode[];
  childWidgets?: PhiCmsContentWidgetNode[];
};

/**
 * What a region draft says about its root node, as a root node draft reads it: every field but the ones
 * that name the node (`id`, `typeKey`, `kind`, `packageName`), which each caller answers for itself.
 */
export function readPhiBuilderRootNodeDraftFields(
  draft: Pick<
    PhiBuilderPreviewRegionDraft,
    | "rootNodeTitle"
    | "rootNodeConfig"
    | "rootNodeGeometry"
    | "rootNodeAnchor"
    | "rootNodePadding"
    | "rootNodeSurface"
    | "rootNodeChildLayouts"
    | "rootNodeChildWidgets"
  >,
): Omit<PhiBuilderRootNodeDraft, "id" | "typeKey" | "kind" | "packageName"> {
  return {
    title: draft.rootNodeTitle ?? null,
    rootNodeConfig: draft.rootNodeConfig ?? null,
    rootNodeGeometry: draft.rootNodeGeometry ?? null,
    rootNodeAnchor: draft.rootNodeAnchor ?? null,
    rootNodePadding: draft.rootNodePadding ?? null,
    rootNodeSurface: draft.rootNodeSurface ?? null,
    childLayouts: draft.rootNodeChildLayouts ?? [],
    childWidgets: draft.rootNodeChildWidgets ?? [],
  };
}

export type PhiBuilderRootNodeDefaults = {
  rootNodePadding: PhiCmsPaddingWidgetConfig | null;
  rootNodeSurface: PhiSurface | null;
};

export function resolvePhiBuilderRootNodeDefaults(
  resolvedConfig?: Record<string, unknown> | null,
): PhiBuilderRootNodeDefaults {
  return resolvePhiBuilderRootNodeDefaultsFromConfig(resolvedConfig ?? {});
}

export function resolvePhiBuilderRootNodeDefaultsFromConfig(
  resolvedConfig: Record<string, unknown>,
): PhiBuilderRootNodeDefaults {
  return {
    rootNodePadding: normalizePhiPaddingWidgetConfig(resolvedConfig),
    rootNodeSurface: readPhiSurface(resolvedConfig.surface),
  };
}

export function normalizePhiBuilderRootNodeDraft(rootNode: PhiBuilderRootNodeDraft): PhiBuilderRootNodeDraft {
  const defaults = resolvePhiBuilderRootNodeDefaults(rootNode.rootNodeConfig ?? null);

  return {
    ...rootNode,
    rootNodeGeometry: rootNode.rootNodeGeometry ?? null,
    rootNodeAnchor: rootNode.rootNodeAnchor ?? null,
    rootNodePadding: mergePhiCmsConfigValues<PhiCmsPaddingWidgetConfig>(
      defaults.rootNodePadding,
      rootNode.rootNodePadding,
    ),
    rootNodeSurface: rootNode.rootNodeSurface ?? defaults.rootNodeSurface,
    childLayouts: rootNode.childLayouts ?? [],
    childWidgets: rootNode.childWidgets ?? [],
  };
}

export function buildPhiBuilderRootNodeRenderConfig(
  rootNode: PhiBuilderRootNodeDraft,
  renderMode: PhiRenderableBlockRenderMode,
): Record<string, unknown> {
  const normalizedRootNode = normalizePhiBuilderRootNodeDraft(rootNode);
  const parsedRootNodeConfig = { ...(normalizedRootNode.rootNodeConfig ?? {}) };
  delete parsedRootNodeConfig.renderMode;
  // The Surface is stated once, by the draft; the root config may carry the draft's copy of it.
  delete parsedRootNodeConfig.surface;
  delete parsedRootNodeConfig.rootNodeSurface;
  const geometry = normalizedRootNode.rootNodeGeometry;
  const padding = normalizedRootNode.rootNodePadding;
  const anchor = resolvePhiRenderableBlockAnchor(normalizedRootNode.rootNodeAnchor);

  return {
    ...parsedRootNodeConfig,
    renderMode,
    ...(anchor == null ? {} : { anchor }),
    ...(normalizedRootNode.rootNodeSurface == null ? {} : { surface: normalizedRootNode.rootNodeSurface }),
    ...(geometry?.zIndex == null ? {} : { zIndex: geometry.zIndex }),
    ...(geometry?.size == null ? {} : { size: geometry.size }),
    ...(geometry?.minSize == null ? {} : { minSize: geometry.minSize }),
    ...(geometry?.maxSize == null ? {} : { maxSize: geometry.maxSize }),
    ...(padding?.padding == null ? {} : { padding: padding.padding }),
    ...(padding?.gap == null ? {} : { gap: padding.gap }),
    ...(padding?.paddingTop == null ? {} : { paddingTop: padding.paddingTop }),
    ...(padding?.paddingRight == null ? {} : { paddingRight: padding.paddingRight }),
    ...(padding?.paddingBottom == null ? {} : { paddingBottom: padding.paddingBottom }),
    ...(padding?.paddingLeft == null ? {} : { paddingLeft: padding.paddingLeft }),
  };
}
