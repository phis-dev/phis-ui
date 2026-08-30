import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type {
  PhiCmsBorderWidgetConfig,
  PhiCmsPaddingWidgetConfig,
} from "../../../types/cms-config";
import { mergePhiCmsConfigValues, normalizePhiPaddingWidgetConfig } from "../../../types/cms-config";
import type { PhiCmsBackgroundWidgetConfig } from "../../../components/widgets/config/background";
import type { PhiCmsGeometryWidgetConfig } from "../../../components/widgets/config/geometry";
import {
  resolvePhiRenderableBlockAnchor,
  type PhiAnchorWidgetPlacement,
} from "../../../components/controls/phi-anchor-control-contract";
import type { PhiRenderableBlockRenderMode } from "../../../types";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiBuilderRootNodeKind } from "./preview-transport";
import { readPhiShadow, type PhiShadow } from "../../../types/layout-style";

type JsonRecord = Record<string, unknown>;

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
  rootNodeBackground?: PhiCmsBackgroundWidgetConfig | null;
  rootNodeBorder?: PhiCmsBorderWidgetConfig | null;
  rootNodeShadow?: PhiShadow | null;
  childLayouts?: PhiCmsLayoutRenderNode[];
  childWidgets?: PhiCmsContentWidgetNode[];
};

export type PhiBuilderRootNodeDefaults = {
  rootNodePadding: PhiCmsPaddingWidgetConfig | null;
  rootNodeBackground: PhiCmsBackgroundWidgetConfig | null;
  rootNodeBorder: PhiCmsBorderWidgetConfig | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function resolvePhiBuilderRootNodeDefaults(
  resolvedConfig?: Record<string, unknown> | null,
): PhiBuilderRootNodeDefaults {
  return resolvePhiBuilderRootNodeDefaultsFromConfig(resolvedConfig ?? {});
}

export function resolvePhiBuilderRootNodeDefaultsFromConfig(
  resolvedConfig: Record<string, unknown>,
): PhiBuilderRootNodeDefaults {
  const backgroundConfig =
    isRecord(resolvedConfig.background) && !Array.isArray(resolvedConfig.background)
      ? resolvedConfig.background
      : isRecord(resolvedConfig.rootNodeBackground) && !Array.isArray(resolvedConfig.rootNodeBackground)
        ? resolvedConfig.rootNodeBackground
        : null;
  const borderConfig =
    isRecord(resolvedConfig.border) && !Array.isArray(resolvedConfig.border)
      ? resolvedConfig.border
      : isRecord(resolvedConfig.rootNodeBorder) && !Array.isArray(resolvedConfig.rootNodeBorder)
        ? resolvedConfig.rootNodeBorder
        : null;

  return {
    rootNodePadding: normalizePhiPaddingWidgetConfig(resolvedConfig),
    rootNodeBackground: backgroundConfig as PhiCmsBackgroundWidgetConfig | null,
    rootNodeBorder: borderConfig as PhiCmsBorderWidgetConfig | null,
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
    rootNodeBackground: rootNode.rootNodeBackground ?? defaults.rootNodeBackground,
    rootNodeBorder: rootNode.rootNodeBorder ?? defaults.rootNodeBorder,
    rootNodeShadow: readPhiShadow(rootNode.rootNodeShadow) ?? null,
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
  delete parsedRootNodeConfig.shadow;
  const geometry = normalizedRootNode.rootNodeGeometry;
  const padding = normalizedRootNode.rootNodePadding;
  const anchor = resolvePhiRenderableBlockAnchor(normalizedRootNode.rootNodeAnchor);

  return {
    ...parsedRootNodeConfig,
    renderMode,
    ...(anchor == null ? {} : { anchor }),
    ...(normalizedRootNode.rootNodeBackground == null ? {} : { rootNodeBackground: normalizedRootNode.rootNodeBackground }),
    ...(normalizedRootNode.rootNodeBorder == null ? {} : { rootNodeBorder: normalizedRootNode.rootNodeBorder }),
    ...(normalizedRootNode.rootNodeShadow == null ? {} : { rootNodeShadow: normalizedRootNode.rootNodeShadow }),
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
