"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import { Flex, Space, Typography, theme as antdTheme } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  buildPhiCmsLayoutNamespacedTypeKey,
  splitPhiCmsLayoutNamespacedTypeKey,
} from "../../../../../constants/cms-layout-types";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../../../helpers/cms-node-factories";
import {
  PHI_CMS_MAX_LAYOUT_SUBLAYOUT_DEPTH,
  resolvePhiCmsRenderLayoutNodeDepth,
} from "../../../../../helpers/cms-layout-depth";
import { resolvePhiBorderWidgetStyle } from "../../../../../helpers/border-widget-style";
import { resolvePhiBackgroundWidgetStyle } from "../../../../../components/widgets/config/background";
import { combinePhiBoxShadows, resolvePhiShadow } from "../../../../../helpers/layout-style";
import { normalizePhiGeometryWidgetConfig } from "../../../../../components/widgets/config/geometry";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../../../types/cms";
import { readPhiCmsInstanceId, type PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiCmsRegionConfig } from "../../../../../types";
import { normalizePhiPaddingWidgetConfig } from "../../../../../types/cms-config";
import { readPhiShadow } from "../../../../../types/layout-style";
import { resolvePhiCssLength } from "../../../../../helpers/css-length";
import {
  extractPhiStructureNode as extractStructureNode,
  swapPhiStructureWidgetsAcrossTrees,
  swapPhiStructureWidgetsInTree,
} from "../../../../../helpers/structure-widget-swap";
import {
  createPhiSignalAddress,
  type PhiSignalAddress,
  type PhiSignalScope,
} from "../../../../../types/signals";
import { resolvePhiShellRegionTypography, resolvePhiShellRegionZIndex } from "../../../../../helpers/shell-region-style";
import { resolvePhiCmsRegionType } from "../../../../../helpers/cms-region-keys";
import { usePhiRuntimeModuleState } from "../../../../../components/runtime/runtime-module-context";
import { renderPhiRootNodeScaffold } from "../../../../../plugins/runtime-modules/builder/render-root-node-scaffold";
import { PhiBuilderInsertPickerControl } from "../../../../../components/controls/phi-builder-insert-picker-control";
import {
  buildPhiBuilderRootNodeRenderConfig,
  normalizePhiBuilderRootNodeDraft,
  resolvePhiBuilderRootNodeDefaults,
} from "../../../../../plugins/runtime-modules/builder/root-node-normalization";
import { compactPhiCmsSequentialChildren, isPhiCmsSequentialLayoutSlots } from "../../../../../plugins/runtime-modules/builder/sequential-slot-helpers";
import { findPhiBuilderLayoutNodeById } from "../../../../../plugins/runtime-modules/builder/node-finders";
import {
  getDefaultRegionDraft,
} from "../../../../../plugins/runtime-modules/builder/developer-region-drafts";
import {
  patchPhiDeveloperBuilderState,
  selectPhiDeveloperBuilderNode,
  getPhiDeveloperRegionDraftsSnapshot,
  setPhiDeveloperRegionDraft,
  setPhiDeveloperRegionDraftAndPruneSignalRoutes,
  setPhiDeveloperRegionDraftsWithHistory,
  usePhiDeveloperBuilderStateValue,
  usePhiDeveloperRegionDraft,
} from "../../../../../plugins/runtime-modules/builder/developer-workspace-store";
import { allocatePhiBuilderCmsInstanceId } from "../../../../../plugins/runtime-modules/builder/cms-instance-allocator";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderRegionDraft,
} from "../../../../../plugins/runtime-modules/builder/developer-workspace-types";
import {
  getPhiBuilderRegionDraftKey,
  isPhiBuilderPageScopedRegion,
} from "../../../../../plugins/runtime-modules/builder/region-keys";
import type { PhiBuilderPageDraftsByScope } from "../../page-presets.server";
import type { PhiStructureRegionPickItem } from "./config";
import type { PhiEffectsWidgetLabels } from "../../../../../components/widgets/label-types/effects";
import type { PhiBuilderChromeWidgetLabels } from "../../../../../components/widgets/label-types/builder-chrome";
import { isPhiAnchorWidgetPlacement } from "../../../../../components/controls/phi-anchor-control-contract";
import { resolvePhiWidgetSignalSubcontrolAddresses } from "../../../../../components/widgets/signals/signal-endpoints";
import { createPhiBuilderRegionHistoryContext } from "../../../../../plugins/runtime-modules/builder/history";
import {
  usePhiStructureDroppable,
  type PhiStructureDragData,
  type PhiStructureDropTargetData,
} from "../../../../../plugins/runtime-modules/builder/structure-dnd";
import { usePhiBuilderModuleMetas } from "../../../../../plugins/runtime-modules/builder/plugin-meta-store";
import type { PhiBuilderContainerMeta, PhiBuilderPluginMeta } from "../../../../../types/builder";
import { resolvePhiPaddingStyle } from "../../../../../components/layouts/phi-layout-contract";
import { usePhiBuilderAuthoringCanvas } from "../../authoring-canvas";

export type PhiStructureRegionWidgetConfig = {
  slotKind?: "structure" | "content";
  origin?: string;
  regionKey: string;
  title: string;
  subtitle?: string | null;
  allowSelect?: boolean;
  allowInsert?: boolean;
  pickItems?: PhiStructureRegionPickItem[];
  fallbackMinHeight?: number;
};

type PhiStructureRegionWidgetProps = {
  config: PhiStructureRegionWidgetConfig;
  serverPreview?: ReactNode;
  structureDraftsByArea?: Partial<Record<PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft | null>>;
  pageDraftsByScope?: PhiBuilderPageDraftsByScope;
  effectsLabels?: PhiEffectsWidgetLabels;
  pickerLabels?: PhiBuilderChromeWidgetLabels["canvas"]["picker"];
  containerStyle?: CSSProperties;
  containerClassName?: string;
};

function buildStructureRootLayoutNode(
  draft: PhiDeveloperBuilderRegionDraft,
  parentLayoutNodeId: PhiCmsInstanceId,
  slotIndex: number,
): PhiCmsLayoutRenderNode | null {
  if (
    draft.rootNodeId == null ||
    !draft.rootNodeTypeKey ||
    draft.rootNodeKind !== "layout"
  ) {
    return null;
  }

  const normalized = normalizePhiBuilderRootNodeDraft({
    id: draft.rootNodeId,
    typeKey: draft.rootNodeTypeKey,
    kind: draft.rootNodeKind,
    title: draft.rootNodeTitle ?? null,
    packageName: draft.rootNodePackageName ?? null,
    rootNodeConfig: draft.rootNodeConfig ?? null,
    rootNodeGeometry: draft.rootNodeGeometry ?? null,
    rootNodeAnchor: draft.rootNodeAnchor ?? null,
    rootNodePadding: draft.rootNodePadding ?? null,
    rootNodeBackground: draft.rootNodeBackground ?? null,
    rootNodeBorder: draft.rootNodeBorder ?? null,
    rootNodeShadow: draft.rootNodeShadow ?? null,
    childLayouts: draft.rootNodeChildLayouts ?? [],
    childWidgets: draft.rootNodeChildWidgets ?? [],
  });
  const config = buildPhiBuilderRootNodeRenderConfig(normalized, "editor");
  delete config.renderMode;

  return {
    id: draft.rootNodeId,
    siteId: -1,
    parentLayoutNodeId,
    widgetType: draft.rootNodeTypeKey,
    slotIndex,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: draft.rootNodeTitle ?? "Root",
    config: {
      ...config,
      builderKind: draft.rootNodeKind,
    },
    childLayouts: draft.rootNodeChildLayouts ?? [],
    childWidgets: draft.rootNodeChildWidgets ?? [],
  };
}

function clearStructureRootNode(
  draft: PhiDeveloperBuilderRegionDraft,
): PhiDeveloperBuilderRegionDraft {
  return {
    ...draft,
    rootNodeId: null,
    rootNodeTypeKey: null,
    rootNodeKind: null,
    rootNodeTitle: null,
    rootNodePackageName: null,
    rootNodeConfig: null,
    rootNodeGeometry: null,
    rootNodeAnchor: null,
    rootNodePadding: null,
    rootNodeBackground: null,
    rootNodeBorder: null,
    rootNodeShadow: null,
    rootNodeChildLayouts: [],
    rootNodeChildWidgets: [],
  };
}

function copyStructureRootNode(
  targetDraft: PhiDeveloperBuilderRegionDraft,
  sourceDraft: PhiDeveloperBuilderRegionDraft,
): PhiDeveloperBuilderRegionDraft {
  return {
    ...targetDraft,
    rootNodeId: sourceDraft.rootNodeId ?? null,
    rootNodeTypeKey: sourceDraft.rootNodeTypeKey ?? null,
    rootNodeKind: sourceDraft.rootNodeKind ?? null,
    rootNodeTitle: sourceDraft.rootNodeTitle ?? null,
    rootNodePackageName: sourceDraft.rootNodePackageName ?? null,
    rootNodeConfig: sourceDraft.rootNodeConfig ?? null,
    rootNodeGeometry: sourceDraft.rootNodeGeometry ?? null,
    rootNodeAnchor: sourceDraft.rootNodeAnchor ?? null,
    rootNodePadding: sourceDraft.rootNodePadding ?? null,
    rootNodeBackground: sourceDraft.rootNodeBackground ?? null,
    rootNodeBorder: sourceDraft.rootNodeBorder ?? null,
    rootNodeShadow: sourceDraft.rootNodeShadow ?? null,
    rootNodeChildLayouts: sourceDraft.rootNodeChildLayouts ?? [],
    rootNodeChildWidgets: sourceDraft.rootNodeChildWidgets ?? [],
  };
}

function promoteStructureLayoutToRoot(
  targetDraft: PhiDeveloperBuilderRegionDraft,
  node: PhiCmsLayoutRenderNode,
): PhiDeveloperBuilderRegionDraft {
  const rootNodeKind = "layout" as const;
  const rootNodeDefaults = resolvePhiBuilderRootNodeDefaults(
    node.config,
  );
  const { pluginKey } = splitPhiCmsLayoutNamespacedTypeKey(node.widgetType);

  return {
    ...targetDraft,
    rootNodeId: node.id,
    rootNodeTypeKey: node.widgetType,
    rootNodeKind,
    rootNodeTitle: node.label ?? null,
    rootNodePackageName: pluginKey,
    rootNodeConfig: node.config,
    rootNodeGeometry: normalizePhiGeometryWidgetConfig(node.config),
    rootNodeAnchor: isPhiAnchorWidgetPlacement(node.config.anchor)
      ? node.config.anchor
      : null,
    rootNodePadding: rootNodeDefaults.rootNodePadding,
    rootNodeBackground: rootNodeDefaults.rootNodeBackground,
    rootNodeBorder: rootNodeDefaults.rootNodeBorder,
    rootNodeShadow: readPhiShadow(node.config.rootNodeShadow) ?? null,
    rootNodeChildLayouts: node.childLayouts ?? [],
    rootNodeChildWidgets: node.childWidgets ?? [],
  };
}

function resolveStructureLayoutSubtreeDepth(
  node: PhiCmsLayoutRenderNode,
): number {
  return (node.childLayouts ?? []).reduce(
    (maxDepth, child) =>
      Math.max(maxDepth, 1 + resolveStructureLayoutSubtreeDepth(child)),
    0,
  );
}

function canMoveStructureLayoutToTarget(
  node: PhiCmsLayoutRenderNode | PhiCmsContentWidgetNode,
  targetParentLayoutNodeId: PhiCmsInstanceId,
  targetRootNodeId: PhiCmsInstanceId,
  targetChildLayouts: readonly PhiCmsLayoutRenderNode[],
) {
  if ("contentId" in node) {
    return true;
  }

  const targetDepth =
    targetParentLayoutNodeId === targetRootNodeId
      ? 0
      : resolvePhiCmsRenderLayoutNodeDepth(
          targetChildLayouts,
          targetParentLayoutNodeId,
        );
  return targetDepth != null &&
    targetDepth + 1 + resolveStructureLayoutSubtreeDepth(node) <=
      PHI_CMS_MAX_LAYOUT_SUBLAYOUT_DEPTH;
}

function buildPhiBuilderContainerMetaMap(
  pluginMetas: readonly PhiBuilderPluginMeta[],
): ReadonlyMap<string, PhiBuilderContainerMeta> {
  return new Map(
    pluginMetas
      .filter((meta): meta is PhiBuilderContainerMeta => meta.kind !== "widget")
      .map((meta) => [
        buildPhiCmsLayoutNamespacedTypeKey(meta.pluginKey, meta.typeKey),
        meta,
      ]),
  );
}

function compactStructureSequentialLayouts(
  nodes: readonly PhiCmsLayoutRenderNode[],
  layoutMetasByType: ReadonlyMap<string, PhiBuilderContainerMeta>,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => {
    const nestedLayouts = compactStructureSequentialLayouts(
      node.childLayouts ?? [],
      layoutMetasByType,
    );
    const definition = layoutMetasByType.get(node.widgetType);
    if (
      !isPhiCmsSequentialLayoutSlots(definition?.slots) ||
      definition?.layoutKind === "collapsible"
    ) {
      return {
        ...node,
        childLayouts: nestedLayouts,
      };
    }
    const compacted = compactPhiCmsSequentialChildren({
      childLayouts: nestedLayouts,
      childWidgets: node.childWidgets ?? [],
    });
    return {
      ...node,
      childLayouts: compacted.childLayouts,
      childWidgets: compacted.childWidgets,
    };
  });
}

function resolvePickItemPackageName(item: PhiStructureRegionPickItem) {
  const raw = item.packageName ?? item.origin ?? "";

  if (!raw) {
    return null;
  }

  const parts = raw.split("/");
  if (raw.startsWith("@") && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[0] ?? raw;
}

function resolveSlotBodyMinHeight(
  draft: PhiDeveloperBuilderRegionDraft | null,
  fallbackMinHeight: number,
  fillAvailableHeight = false,
) {
  const baseMinHeight = draft?.minSize?.height ?? draft?.size?.height ?? (fillAvailableHeight ? fallbackMinHeight : null);

  if (baseMinHeight == null) {
    return undefined;
  }

  return `${baseMinHeight}px`;
}

function buildInsertedLayoutNode(
  item: PhiStructureRegionPickItem,
  id: PhiCmsInstanceId,
  parentLayoutNodeId: PhiCmsInstanceId | null,
  slotIndex: number,
  sortOrder: number,
): PhiCmsLayoutRenderNode {
  const { pluginKey, typeKey } = splitPhiCmsLayoutNamespacedTypeKey(item.key);
  const resolvedDefaultConfig = resolveInsertedItemDefaultConfig(item) ?? {};

  return {
    ...buildPhiCmsLayoutNode({
      id,
      pluginKey: item.origin ?? pluginKey,
      typeKey,
      siteId: -1,
      parentLayoutNodeId,
      slotIndex,
      sortOrder,
      status: 0,
      flags: 0,
      visibilityMask: 0,
      label: item.title,
      config: {
        ...resolvedDefaultConfig,
      },
    }),
    childLayouts: [],
    childWidgets: [],
  };
}

function buildInsertedWidgetNode(
  item: PhiStructureRegionPickItem,
  id: PhiCmsInstanceId,
  parentLayoutNodeId: PhiCmsInstanceId,
  slotIndex: number,
  sortOrder: number,
): PhiCmsContentWidgetNode {
  const splitIndex = item.key.lastIndexOf("/");
  const pluginKey = item.origin ?? item.key.slice(0, splitIndex);
  const typeKey = splitIndex >= 0 ? item.key.slice(splitIndex + 1) : item.key;
  const resolvedDefaultConfig = resolveInsertedItemDefaultConfig(item) ?? {};

  return buildPhiCmsWidgetNode({
    id,
    pluginKey,
    typeKey,
    siteId: -1,
    parentLayoutNodeId,
    slotIndex,
    sortOrder,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: item.title,
    config: resolvedDefaultConfig,
    contentId: null,
  });
}

function resolveInsertedItemDefaultConfig(
  item: PhiStructureRegionPickItem,
): Record<string, unknown> | null {
  return item.defaultConfig ? { ...item.defaultConfig } : null;
}

function appendLayoutChildById(
  nodes: PhiCmsLayoutRenderNode[],
  targetNodeId: PhiCmsInstanceId,
  nextChild: PhiCmsLayoutRenderNode,
  compactSequential = false,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => {
    if (node.id === targetNodeId) {
      const nextChildren = compactSequential
        ? insertPhiCmsSequentialChild(
            node.childLayouts ?? [],
            node.childWidgets ?? [],
            nextChild,
          )
        : null;
      return {
        ...node,
        childLayouts: nextChildren?.childLayouts ?? [...(node.childLayouts ?? []), nextChild],
        childWidgets: nextChildren?.childWidgets ?? node.childWidgets,
      };
    }

    if ((node.childLayouts?.length ?? 0) === 0) {
      return node;
    }

    return {
      ...node,
      childLayouts: appendLayoutChildById(node.childLayouts, targetNodeId, nextChild, compactSequential),
    };
  });
}

function appendWidgetChildById(
  nodes: PhiCmsLayoutRenderNode[],
  targetNodeId: PhiCmsInstanceId,
  nextChild: PhiCmsContentWidgetNode,
  compactSequential = false,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => {
    if (node.id === targetNodeId) {
      const nextChildren = compactSequential
        ? insertPhiCmsSequentialChild(
            node.childLayouts ?? [],
            node.childWidgets ?? [],
            nextChild,
          )
        : null;
      return {
        ...node,
        childLayouts: nextChildren?.childLayouts ?? node.childLayouts,
        childWidgets: nextChildren?.childWidgets ?? [...(node.childWidgets ?? []), nextChild],
      };
    }

    if ((node.childLayouts?.length ?? 0) === 0) {
      return node;
    }

    return {
      ...node,
      childLayouts: appendWidgetChildById(node.childLayouts, targetNodeId, nextChild, compactSequential),
    };
  });
}

function insertPhiCmsSequentialChild(
  childLayouts: PhiCmsLayoutRenderNode[],
  childWidgets: PhiCmsContentWidgetNode[],
  child: PhiCmsLayoutRenderNode | PhiCmsContentWidgetNode,
) {
  const compacted = compactPhiCmsSequentialChildren({
    childLayouts,
    childWidgets,
  });
  const childCount =
    compacted.childLayouts.length + compacted.childWidgets.length;
  const insertionIndex = Math.min(
    Math.max(0, child.slotIndex),
    childCount,
  );
  const shiftedLayouts = compacted.childLayouts.map((node) => ({
    ...node,
    slotIndex:
      node.slotIndex >= insertionIndex ? node.slotIndex + 1 : node.slotIndex,
  }));
  const shiftedWidgets = compacted.childWidgets.map((node) => ({
    ...node,
    slotIndex:
      node.slotIndex >= insertionIndex ? node.slotIndex + 1 : node.slotIndex,
  }));
  const insertedChild = {
    ...child,
    slotIndex: insertionIndex,
    sortOrder: Math.max(0, child.sortOrder),
  };

  return "contentId" in insertedChild
    ? {
        childLayouts: shiftedLayouts,
        childWidgets: [...shiftedWidgets, insertedChild],
      }
    : {
        childLayouts: [...shiftedLayouts, insertedChild],
        childWidgets: shiftedWidgets,
      };
}

function removeLayoutChildById(nodes: PhiCmsLayoutRenderNode[], targetNodeId: PhiCmsInstanceId): PhiCmsLayoutRenderNode[] {
  return nodes
    .filter((node) => node.id !== targetNodeId)
    .map((node) => ({
      ...node,
      childLayouts: (node.childLayouts ?? []).length > 0 ? removeLayoutChildById(node.childLayouts, targetNodeId) : [],
    }));
}

function removeWidgetChildById(nodes: PhiCmsLayoutRenderNode[], targetNodeId: PhiCmsInstanceId): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => ({
    ...node,
    childLayouts: (node.childLayouts ?? []).length > 0 ? removeWidgetChildById(node.childLayouts, targetNodeId) : [],
    childWidgets: (node.childWidgets ?? []).filter((child) => child.id !== targetNodeId),
  }));
}

function removeContentWidgetById(nodes: PhiCmsContentWidgetNode[], targetNodeId: PhiCmsInstanceId): PhiCmsContentWidgetNode[] {
  return nodes.filter((child) => child.id !== targetNodeId);
}

function resolveLayoutNodeSignalAddress(node: PhiCmsLayoutRenderNode) {
  return createPhiSignalAddress("cms", node.id);
}

function collectLayoutNodeSignalAddresses(
  node: PhiCmsLayoutRenderNode,
  addresses: PhiSignalAddress[],
) {
  addresses.push(resolveLayoutNodeSignalAddress(node));
  for (const widget of node.childWidgets ?? []) {
    addresses.push(createPhiSignalAddress("cms", widget.id));
  }
  for (const childLayout of node.childLayouts ?? []) {
    collectLayoutNodeSignalAddresses(childLayout, addresses);
  }
}

function findLayoutNodeById(
  nodes: readonly PhiCmsLayoutRenderNode[],
  targetNodeId: PhiCmsInstanceId,
): PhiCmsLayoutRenderNode | null {
  for (const node of nodes) {
    if (node.id === targetNodeId) {
      return node;
    }
    const child = findLayoutNodeById(node.childLayouts ?? [], targetNodeId);
    if (child) {
      return child;
    }
  }

  return null;
}

function collectDeletedNodeSignalAddresses({
  targetNodeId,
  targetNodeKind,
  rootNodeId,
  rootNodeKind,
  childLayouts,
  childWidgets,
}: {
  targetNodeId: PhiCmsInstanceId;
  targetNodeKind: "layout" | "widget" | null;
  rootNodeId: PhiCmsInstanceId | null;
  rootNodeKind: "layout" | "widget" | null;
  childLayouts: readonly PhiCmsLayoutRenderNode[];
  childWidgets: readonly PhiCmsContentWidgetNode[];
}) {
  const addresses: PhiSignalAddress[] = [];

  if (targetNodeId === rootNodeId) {
    if (rootNodeKind) {
      addresses.push(createPhiSignalAddress("cms", targetNodeId));
    }
    for (const layout of childLayouts) {
      collectLayoutNodeSignalAddresses(layout, addresses);
    }
    for (const widget of childWidgets) {
      addresses.push(createPhiSignalAddress("cms", widget.id));
    }
    return addresses;
  }

  if (targetNodeKind === "widget") {
    return [createPhiSignalAddress("cms", targetNodeId)];
  }

  const targetLayout = findLayoutNodeById(childLayouts, targetNodeId);
  if (targetLayout) {
    collectLayoutNodeSignalAddresses(targetLayout, addresses);
  } else if (targetNodeKind) {
    addresses.push(createPhiSignalAddress("cms", targetNodeId));
  }

  return addresses;
}

function updateLayoutChildConfigById(
  nodes: PhiCmsLayoutRenderNode[],
  targetNodeId: PhiCmsInstanceId,
  configPatch: Record<string, unknown>,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => {
    if (node.id === targetNodeId) {
      return {
        ...node,
        config: {
          ...(node.config ?? {}),
          ...configPatch,
        },
      };
    }

    if ((node.childLayouts?.length ?? 0) === 0) {
      return node;
    }

    return {
      ...node,
      childLayouts: updateLayoutChildConfigById(node.childLayouts, targetNodeId, configPatch),
    };
  });
}

function updateWidgetChildConfigById(
  nodes: PhiCmsLayoutRenderNode[],
  targetNodeId: PhiCmsInstanceId,
  nextConfig: Record<string, unknown>,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => {
    const childWidgets = (node.childWidgets ?? []).map((widget) =>
      widget.id === targetNodeId
        ? { ...widget, config: nextConfig }
        : widget
    );
    const childLayouts = (node.childLayouts?.length ?? 0) > 0
      ? updateWidgetChildConfigById(node.childLayouts, targetNodeId, nextConfig)
      : node.childLayouts ?? [];
    const changed = childWidgets.some((widget, index) => widget !== node.childWidgets?.[index]) ||
      childLayouts.some((layout, index) => layout !== node.childLayouts?.[index]);

    return changed ? { ...node, childWidgets, childLayouts } : node;
  });
}

export function PhiStructureRegionScaffold({
  config,
  serverPreview,
  structureDraftsByArea,
  pageDraftsByScope,
  effectsLabels,
  pickerLabels,
  containerStyle,
  containerClassName,
}: PhiStructureRegionWidgetProps) {
  const { token } = antdTheme.useToken();
  const activeModules = usePhiRuntimeModuleState();
  const authoringCanvas = usePhiBuilderAuthoringCanvas();
  const builderState = {
    area: usePhiDeveloperBuilderStateValue("public", (state) => state.area),
    pageKey: usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey),
    builderMode: usePhiDeveloperBuilderStateValue("public", (state) => state.builderMode),
    debugScaffold: usePhiDeveloperBuilderStateValue("public", (state) => state.debugScaffold),
    pickerWidgetCategoryFilters: usePhiDeveloperBuilderStateValue(
      "public",
      (state) => state.pickerWidgetCategoryFilters,
    ),
    selectedLayoutAnchor: usePhiDeveloperBuilderStateValue(
      "public",
      (state) => state.selectedRootRegionKey === config.regionKey ? state.selectedLayoutAnchor : null,
    ),
    regionSelected: usePhiDeveloperBuilderStateValue(
      "public",
      (state) => state.nodeKind === "region" && state.selectedRegionKey === config.regionKey,
    ),
    regionDrafts: usePhiDeveloperBuilderStateValue("public", (state) => state.regionDrafts),
  };
  const builderModuleMetas = usePhiBuilderModuleMetas(builderState.area);
  const layoutMetasByType = useMemo(
    () => buildPhiBuilderContainerMetaMap(builderModuleMetas.plugins),
    [builderModuleMetas.plugins],
  );
  const draftKey = getPhiBuilderRegionDraftKey(builderState.area, config.regionKey, builderState.pageKey);
  const historyContext = createPhiBuilderRegionHistoryContext({
    area: builderState.area,
    pageKey: builderState.pageKey,
    pageScoped: isPhiBuilderPageScopedRegion(config.regionKey),
  });
  const regionDraft = usePhiDeveloperRegionDraft(draftKey);
  const isSelected = builderState.regionSelected;
  const [isPicking, setIsPicking] = useState(false);
  const [pickPackageFilters, setPickPackageFilters] = useState<string[]>([]);
  const [pickSection, setPickSection] = useState<"layout" | "widget">("layout");
  const [slotPickerContext, setSlotPickerContext] = useState<{
    defaultPickSection: "layout" | "widget";
    allowLayoutSection: boolean;
    allowWidgetSection: boolean;
    slotIndex: number | null;
    targetNodeId: PhiCmsInstanceId | null;
  } | null>(null);
  const builderMode = builderState.builderMode;
  const slotKind = config.slotKind ?? "structure";
  const regionType = resolvePhiCmsRegionType(config.regionKey);
  const isPreviewMode = builderMode === "preview";
  /*
   * `undefined` rather than "off": the attribute is inherited-variable driven, and the "off" block
   * resets every debug variable to transparent. Writing the literal here made a Region blank the whole
   * subtree below it whenever an ancestor -- the Canvas, say -- had turned the scaffold on. Absence
   * says "this element has nothing to add", which is what a nested writer means. The "off" value stays
   * in the stylesheet as the way to blank a subtree deliberately.
   */
  const resolvedDebugScaffold = builderState.debugScaffold ? "on" : undefined;
  const isFullHeightRegion = config.regionKey === "sider_left" || config.regionKey === "sider_right";
  const shouldStretchContentRegion = config.regionKey === "content";
  const resolvedFallbackMinHeight = typeof config.fallbackMinHeight === "number" ? config.fallbackMinHeight : 84;
  const widgetCategoryFilters = Array.isArray(builderState.pickerWidgetCategoryFilters)
    ? builderState.pickerWidgetCategoryFilters
    : ["basic"];
  const fallbackPageDraft = pageDraftsByScope?.[builderState.area]?.[builderState.pageKey] ?? null;
  const effectiveDraft =
    regionDraft ??
    fallbackPageDraft ??
    getDefaultRegionDraft(config.regionKey);
  const draftSize = effectiveDraft?.size ?? null;
  const draftMinSize = effectiveDraft?.minSize ?? null;
  const draftMaxSize = effectiveDraft?.maxSize ?? null;
  const rootNodeDefinition = effectiveDraft?.rootNodeKind == null || !effectiveDraft.rootNodeTypeKey
    ? null
    : layoutMetasByType.get(effectiveDraft.rootNodeTypeKey) ?? null;
  const offsetTop = effectiveDraft?.offsetTop ?? 0;
  const shouldFillAvailableHeight =
    isFullHeightRegion &&
    effectiveDraft?.regionConfig?.fullHeight !== false &&
    draftSize?.height == null &&
    draftMinSize?.height == null &&
    draftMaxSize?.height == null;
  const shouldStretchAvailableHeight = shouldFillAvailableHeight || shouldStretchContentRegion;
  const hasExplicitSidebarWidth = isFullHeightRegion && draftSize?.width != null;
  const slotBackgroundStyle = effectiveDraft?.background
    ? resolvePhiBackgroundWidgetStyle({
        ...effectiveDraft.background,
        effect: effectiveDraft.effect ?? null,
      })
    : {};
  const slotBorderStyle = effectiveDraft?.border ? resolvePhiBorderWidgetStyle(effectiveDraft.border) : {};
  const regionConfig = (effectiveDraft?.regionConfig ?? null) as PhiCmsRegionConfig | null;
  const regionPaddingStyle = resolvePhiPaddingStyle(
    normalizePhiPaddingWidgetConfig(effectiveDraft?.regionConfig) ?? {},
  );
  const resolvedRegionZIndex =
    effectiveDraft?.zIndex ??
    resolvePhiShellRegionZIndex(config.regionKey as never, shouldFillAvailableHeight);
  const resolvedRegionTypography = resolvePhiShellRegionTypography(config.regionKey as never, undefined, {
    fontSize: regionConfig?.fontSize,
    lineHeight: regionConfig?.lineHeight,
  });
  const outerWidth = hasExplicitSidebarWidth ? resolvePhiCssLength(draftSize?.width) : "100%";
  const outerMinWidth = hasExplicitSidebarWidth
    ? resolvePhiCssLength(draftMinSize?.width) ?? resolvePhiCssLength(draftSize?.width)
    : 0;
  const outerMaxWidth = hasExplicitSidebarWidth
    ? resolvePhiCssLength(draftMaxSize?.width) ?? resolvePhiCssLength(draftSize?.width)
    : undefined;
  const slotWidth = hasExplicitSidebarWidth ? "100%" : resolvePhiCssLength(draftSize?.width) ?? "100%";
  const slotMinWidth = hasExplicitSidebarWidth
    ? "0px"
    : resolvePhiCssLength(draftMinSize?.width) ?? resolvePhiCssLength(draftSize?.width);
  const slotMaxWidth = hasExplicitSidebarWidth
    ? "100%"
    : resolvePhiCssLength(draftMaxSize?.width) ?? resolvePhiCssLength(draftSize?.width);
  const slotHeight = shouldStretchAvailableHeight
    ? undefined
    : shouldFillAvailableHeight
      ? `calc(100% - ${resolvePhiCssLength(offsetTop) ?? "0px"})`
      : draftSize?.height != null
        ? resolvePhiCssLength(draftSize.height)
        : undefined;
  const slotMinHeight =
      shouldStretchAvailableHeight
      ? 0
      : shouldFillAvailableHeight
      ? `calc(100% - ${resolvePhiCssLength(offsetTop) ?? "0px"})`
      : draftMinSize?.height != null
        ? resolvePhiCssLength(draftMinSize.height)
        : draftSize?.height != null
          ? resolvePhiCssLength(draftSize.height)
          : shouldStretchAvailableHeight
            ? 0
            : resolvedFallbackMinHeight;
  const slotMaxHeight =
    shouldStretchAvailableHeight
      ? undefined
      : shouldFillAvailableHeight
      ? `calc(100% - ${resolvePhiCssLength(offsetTop) ?? "0px"})`
      : draftMaxSize?.height != null
        ? resolvePhiCssLength(draftMaxSize.height)
        : draftSize?.height != null
          ? resolvePhiCssLength(draftSize.height)
          : undefined;
  const slotBodyMinHeight = resolveSlotBodyMinHeight(
    effectiveDraft,
    shouldFillAvailableHeight ? 0 : resolvedFallbackMinHeight,
    slotKind === "structure",
  );
  const slotBodyFallbackHeight = slotBodyMinHeight ?? resolvePhiCssLength(resolvedFallbackMinHeight);
  const hasRootNode = effectiveDraft?.rootNodeTypeKey != null;
  const shouldUseFallbackBodyHeightForRoot =
    shouldFillAvailableHeight;
  const shouldUseFallbackBodyMinHeightForRoot =
    !shouldUseFallbackBodyHeightForRoot && slotKind === "content";
  const resolvedRootBodyHeight =
    hasRootNode
      ? (
          slotHeight ??
          (shouldUseFallbackBodyHeightForRoot ? slotBodyFallbackHeight : undefined) ??
          (shouldStretchAvailableHeight ? "100%" : undefined)
        )
      : undefined;
  const resolvedRootBodyMinHeight =
    hasRootNode && shouldUseFallbackBodyMinHeightForRoot
      ? slotBodyFallbackHeight
      : undefined;
  const rootNodeId = effectiveDraft?.rootNodeId ?? null;
  const rootNodeKind = effectiveDraft?.rootNodeKind ?? null;
  const rootNodeTypeKey = effectiveDraft?.rootNodeTypeKey ?? "";
  const rootNodeChildLayouts = effectiveDraft?.rootNodeChildLayouts ?? [];
  const rootNodeChildWidgets = effectiveDraft?.rootNodeChildWidgets ?? [];
  const resolvedRootNodeAnchor = effectiveDraft?.rootNodeAnchor ?? builderState.selectedLayoutAnchor;
  const resolveNextSlotSortOrder = (slotIndex: number) => {
    const slotChildren = [
      ...rootNodeChildLayouts.filter((layout) => layout.slotIndex === slotIndex),
      ...rootNodeChildWidgets.filter((widget) => widget.slotIndex === slotIndex),
    ];

    return slotChildren.reduce((maxSortOrder, child) => Math.max(maxSortOrder, child.sortOrder), -1) + 1;
  };
  const openRootInspector = (options?: {
    nodeId?: PhiCmsInstanceId | null;
    nodeKey?: string | null;
    nodeKind?: "layout" | "widget" | null;
    openWiring?: boolean;
  }) => {
    if (!hasRootNode || isPreviewMode || !rootNodeKind) {
      return;
    }

    selectPhiDeveloperBuilderNode("public", {
      area: builderState.area,
      pageKey: builderState.pageKey,
      regionKey: config.regionKey,
      nodeId: options?.nodeId ?? rootNodeId,
      nodeKey: options?.nodeKey ?? rootNodeTypeKey,
      nodeKind: options?.nodeKind ?? rootNodeKind,
      regionType,
      selectedLayoutAnchor: resolvedRootNodeAnchor,
      openWiring: options?.openWiring === true,
    });
  };
  const deleteRootNode = (options?: { nodeId?: PhiCmsInstanceId | null; nodeKey?: string | null; nodeKind?: "layout" | "widget" | null }) => {
    if (isPreviewMode || !hasRootNode) {
      return;
    }

    const targetNodeId = options?.nodeId ?? rootNodeId;
    const targetNodeKind = options?.nodeKind ?? rootNodeKind;

    if (targetNodeId == null) {
      return;
    }

    const deletedAddresses = collectDeletedNodeSignalAddresses({
      targetNodeId,
      targetNodeKind,
      rootNodeId,
      rootNodeKind,
      childLayouts: rootNodeChildLayouts,
      childWidgets: rootNodeChildWidgets,
    });

    if (targetNodeId === rootNodeId) {
      updateDraftAndPruneSignalRoutes({
        rootNodeId: null,
        rootNodeTypeKey: null,
        rootNodeKind: null,
      rootNodeTitle: null,
      rootNodePackageName: null,
      rootNodeGeometry: null,
      rootNodePadding: null,
      rootNodeAnchor: null,
      rootNodeBackground: null,
      rootNodeBorder: null,
      rootNodeShadow: null,
      shadow: null,
        rootNodeChildLayouts: [],
        rootNodeChildWidgets: [],
      }, deletedAddresses);
      return;
    }

    const nextChildLayouts =
      targetNodeKind === "widget"
        ? removeWidgetChildById(rootNodeChildLayouts, targetNodeId)
        : removeLayoutChildById(rootNodeChildLayouts, targetNodeId);
    const nextChildWidgets =
      targetNodeKind === "widget"
        ? removeContentWidgetById(rootNodeChildWidgets, targetNodeId)
        : rootNodeChildWidgets;
    const compactedChildren =
      isPhiCmsSequentialLayoutSlots(rootNodeDefinition?.slots) && rootNodeDefinition?.layoutKind !== "collapsible"
      ? compactPhiCmsSequentialChildren({
          childLayouts: nextChildLayouts,
          childWidgets: nextChildWidgets,
        })
      : {
          childLayouts: nextChildLayouts,
          childWidgets: nextChildWidgets,
        };

    updateDraftAndPruneSignalRoutes({
      rootNodeChildLayouts: compactedChildren.childLayouts,
      rootNodeChildWidgets: compactedChildren.childWidgets,
    }, deletedAddresses);
  };
  const updateWidgetNodeConfig = (node: PhiCmsContentWidgetNode, configPatch: Record<string, unknown>) => {
    if (isPreviewMode || !hasRootNode) {
      return;
    }

    const currentConfig = node.config ?? {};
    const nextConfig = {
      ...currentConfig,
      ...configPatch,
    };
    const signalSubcontrols = activeModules.widgetDefinitionsByType.get(node.widgetType)?.signalSubcontrols;
    const nextSubcontrolAddresses = new Set(resolvePhiWidgetSignalSubcontrolAddresses({
      blockId: node.id,
      config: nextConfig,
      signalSubcontrols,
    }));
    const removedSubcontrolAddresses = resolvePhiWidgetSignalSubcontrolAddresses({
      blockId: node.id,
      config: currentConfig,
      signalSubcontrols,
    }).filter((address) => !nextSubcontrolAddresses.has(address));
    const nextChildWidgets = rootNodeChildWidgets.map((widget) =>
        widget.id === node.id
          ? {
              ...widget,
              config: nextConfig,
            }
          : widget,
      );
    const nextChildLayouts = updateWidgetChildConfigById(
      rootNodeChildLayouts,
      node.id,
      nextConfig,
    );

    if (removedSubcontrolAddresses.length > 0) {
      updateDraftAndPruneSignalRoutes(
        {
          rootNodeChildLayouts: nextChildLayouts,
          rootNodeChildWidgets: nextChildWidgets,
        },
        removedSubcontrolAddresses,
      );
      return;
    }

    updateDraft({
      rootNodeChildLayouts: nextChildLayouts,
      rootNodeChildWidgets: nextChildWidgets,
    });
  };
  const updateLayoutNodeConfig = (node: PhiCmsLayoutRenderNode, configPatch: Record<string, unknown>) => {
    if (isPreviewMode || !hasRootNode) {
      return;
    }

    if (node.id === rootNodeId) {
      updateDraft({
        rootNodeConfig: {
          ...(effectiveDraft?.rootNodeConfig ?? {}),
          ...configPatch,
        },
      });
      return;
    }

    updateDraft({
      rootNodeChildLayouts: updateLayoutChildConfigById(rootNodeChildLayouts, node.id, configPatch),
    });
  };
  const resolveStructureDragData = (
    node: {
      nodeId: PhiCmsInstanceId;
      nodeKind: "layout" | "widget";
    },
    title: string,
  ): Omit<PhiStructureDragData, "getPreviewElement"> => ({
      area: builderState.area,
      pageKey: builderState.pageKey,
      pageScoped: isPhiBuilderPageScopedRegion(config.regionKey),
      regionKey: config.regionKey,
      nodeId: node.nodeId,
      nodeKind: node.nodeKind,
      title,
    });
  const canDropStructureNode = (
    target: {
      parentLayoutNodeId: PhiCmsInstanceId;
      slotIndex: number;
    },
    payload: PhiStructureDragData,
  ) => {
    if (isPreviewMode || !hasRootNode || rootNodeId == null) {
      return false;
    }

    if (
      payload.area !== builderState.area ||
      payload.pageKey !== builderState.pageKey ||
      payload.nodeId === rootNodeId
    ) {
      return false;
    }

    let draggedNode: PhiCmsLayoutRenderNode | PhiCmsContentWidgetNode | null;
    let targetTreeLayouts: PhiCmsLayoutRenderNode[];
    let targetTreeWidgets: PhiCmsContentWidgetNode[];
    if (payload.regionKey === config.regionKey) {
      const extracted = extractStructureNode(
        rootNodeChildLayouts,
        rootNodeChildWidgets,
        payload.nodeId,
        payload.nodeKind,
      );
      draggedNode = extracted.node;
      targetTreeLayouts = extracted.childLayouts;
      targetTreeWidgets = extracted.childWidgets;
    } else {
      if (
        isPhiBuilderPageScopedRegion(payload.regionKey) !==
        isPhiBuilderPageScopedRegion(config.regionKey)
      ) {
        return false;
      }
      const sourceDraft =
        getPhiDeveloperRegionDraftsSnapshot()[
          getPhiBuilderRegionDraftKey(
            payload.area,
            payload.regionKey,
            payload.pageKey,
          )
        ] ?? null;
      if (!sourceDraft?.rootNodeId || !sourceDraft.rootNodeTypeKey) {
        return false;
      }
      draggedNode =
        payload.nodeId === sourceDraft.rootNodeId
          ? buildStructureRootLayoutNode(
              sourceDraft,
              target.parentLayoutNodeId,
              target.slotIndex,
            )
          : extractStructureNode(
              sourceDraft.rootNodeChildLayouts ?? [],
              sourceDraft.rootNodeChildWidgets ?? [],
              payload.nodeId,
              payload.nodeKind,
            ).node;
      targetTreeLayouts = rootNodeChildLayouts;
      targetTreeWidgets = rootNodeChildWidgets;
    }
    if (!draggedNode) {
      return false;
    }

    const targetsRoot = target.parentLayoutNodeId === rootNodeId;
    const targetLayout = targetsRoot
      ? null
      : findPhiBuilderLayoutNodeById(
          targetTreeLayouts,
          target.parentLayoutNodeId,
        );
    if (!targetsRoot && !targetLayout) {
      return false;
    }
    if (
      !canMoveStructureLayoutToTarget(
        draggedNode,
        target.parentLayoutNodeId,
        rootNodeId,
        targetTreeLayouts,
      )
    ) {
      return false;
    }

    const targetDefinition = targetsRoot
      ? rootNodeDefinition
      : layoutMetasByType.get(targetLayout!.widgetType) ?? null;
    const compactTarget =
      isPhiCmsSequentialLayoutSlots(targetDefinition?.slots) &&
      targetDefinition?.layoutKind !== "collapsible";
    if (compactTarget) {
      return true;
    }
    const targetLayouts = targetsRoot
      ? targetTreeLayouts
      : targetLayout?.childLayouts ?? [];
    const targetWidgets = targetsRoot
      ? targetTreeWidgets
      : targetLayout?.childWidgets ?? [];
    return !targetLayouts.some(
      (node) => node.slotIndex === target.slotIndex,
    ) && !targetWidgets.some(
      (node) => node.slotIndex === target.slotIndex,
    );
  };
  const resolveStructureDropTarget = (
    target: {
      parentLayoutNodeId: PhiCmsInstanceId;
      slotIndex: number;
    },
  ): PhiStructureDropTargetData => ({
    id: [
      "structure-drop",
      builderState.area,
      builderState.pageKey,
      config.regionKey,
      target.parentLayoutNodeId,
      target.slotIndex,
    ].join(":"),
    area: builderState.area,
    pageKey: builderState.pageKey,
    regionKey: config.regionKey,
    dropMode: "child",
    title: `${config.title} slot ${target.slotIndex + 1}`,
    accepts: (source) => canDropStructureNode(target, source),
    drop: (source) => dropStructureNode(target, source),
  });
  const resolveWidgetSwapSourceDraft = (payload: PhiStructureDragData) => {
    const sourceDraftKey = getPhiBuilderRegionDraftKey(
      payload.area,
      payload.regionKey,
      payload.pageKey,
    );
    return {
      sourceDraftKey,
      sourceDraft:
        payload.regionKey === config.regionKey
          ? effectiveDraft
          : getPhiDeveloperRegionDraftsSnapshot()[sourceDraftKey] ?? null,
    };
  };
  const canSwapStructureWidgets = (
    targetWidget: PhiCmsContentWidgetNode,
    payload: PhiStructureDragData,
  ) => {
    if (
      isPreviewMode ||
      payload.nodeKind !== "widget" ||
      payload.nodeId === targetWidget.id ||
      payload.area !== builderState.area ||
      payload.pageKey !== builderState.pageKey ||
      isPhiBuilderPageScopedRegion(payload.regionKey) !==
        isPhiBuilderPageScopedRegion(config.regionKey)
    ) {
      return false;
    }

    const { sourceDraft } = resolveWidgetSwapSourceDraft(payload);
    if (!sourceDraft?.rootNodeId || !sourceDraft.rootNodeTypeKey) {
      return false;
    }

    return extractStructureNode(
      sourceDraft.rootNodeChildLayouts ?? [],
      sourceDraft.rootNodeChildWidgets ?? [],
      payload.nodeId,
      "widget",
    ).node != null;
  };
  const swapStructureWidgets = (
    targetWidget: PhiCmsContentWidgetNode,
    payload: PhiStructureDragData,
  ) => {
    if (!canSwapStructureWidgets(targetWidget, payload) || !rootNodeId) {
      return;
    }

    const { sourceDraftKey, sourceDraft } = resolveWidgetSwapSourceDraft(payload);
    if (!sourceDraft?.rootNodeId) {
      return;
    }

    if (payload.regionKey === config.regionKey) {
      const swapped = swapPhiStructureWidgetsInTree({
        childLayouts: rootNodeChildLayouts,
        childWidgets: rootNodeChildWidgets,
        rootNodeId,
        sourceWidgetId: payload.nodeId,
        targetWidgetId: targetWidget.id,
      });
      if (!swapped) {
        return;
      }
      setPhiDeveloperRegionDraft(
        draftKey,
        {
          ...effectiveDraft,
          rootNodeChildLayouts: swapped.childLayouts,
          rootNodeChildWidgets: swapped.childWidgets,
        },
        {
          historyContext,
          historyLabel: "Swap widgets",
        },
      );
      return;
    }

    const swapped = swapPhiStructureWidgetsAcrossTrees({
      source: {
        childLayouts: sourceDraft.rootNodeChildLayouts ?? [],
        childWidgets: sourceDraft.rootNodeChildWidgets ?? [],
        rootNodeId: sourceDraft.rootNodeId,
        widgetId: payload.nodeId,
      },
      target: {
        childLayouts: rootNodeChildLayouts,
        childWidgets: rootNodeChildWidgets,
        rootNodeId,
        widgetId: targetWidget.id,
      },
    });
    if (!swapped) {
      return;
    }
    setPhiDeveloperRegionDraftsWithHistory(
      {
        [sourceDraftKey]: {
          ...sourceDraft,
          rootNodeChildLayouts: swapped.source.childLayouts,
          rootNodeChildWidgets: swapped.source.childWidgets,
        },
        [draftKey]: {
          ...effectiveDraft,
          rootNodeChildLayouts: swapped.target.childLayouts,
          rootNodeChildWidgets: swapped.target.childWidgets,
        },
      },
      {
        historyContext,
        historyLabel: "Swap widgets",
      },
    );
  };
  const resolveWidgetSwapDropTarget = (
    targetWidget: PhiCmsContentWidgetNode,
  ): PhiStructureDropTargetData => ({
    id: [
      "structure-widget-swap",
      builderState.area,
      builderState.pageKey,
      config.regionKey,
      targetWidget.id,
    ].join(":"),
    area: builderState.area,
    pageKey: builderState.pageKey,
    regionKey: config.regionKey,
    dropMode: "swap",
    targetNodeId: targetWidget.id,
    title: `Swap with ${targetWidget.label ?? targetWidget.widgetType}`,
    accepts: (source) => canSwapStructureWidgets(targetWidget, source),
    drop: (source) => swapStructureWidgets(targetWidget, source),
  });
  const dropStructureNode = (
    target: {
      parentLayoutNodeId: PhiCmsInstanceId;
      slotIndex: number;
    },
    payload: PhiStructureDragData,
  ) => {
    if (isPreviewMode || !hasRootNode || rootNodeId == null) {
      return;
    }

    if (
      payload.area !== builderState.area ||
      payload.pageKey !== builderState.pageKey ||
      payload.nodeId === rootNodeId
    ) {
      return;
    }

    if (payload.regionKey !== config.regionKey) {
      if (
        isPhiBuilderPageScopedRegion(payload.regionKey) !==
        isPhiBuilderPageScopedRegion(config.regionKey)
      ) {
        return;
      }
      const sourceDraftKey = getPhiBuilderRegionDraftKey(
        payload.area,
        payload.regionKey,
        payload.pageKey,
      );
      const sourceDraft =
        getPhiDeveloperRegionDraftsSnapshot()[sourceDraftKey] ?? null;
      if (!sourceDraft?.rootNodeId || !sourceDraft.rootNodeTypeKey) {
        return;
      }
      const movingSourceRoot =
        payload.nodeId === sourceDraft.rootNodeId &&
        (payload.nodeKind === "layout");
      const sourceRootNode = movingSourceRoot
        ? buildStructureRootLayoutNode(
            sourceDraft,
            target.parentLayoutNodeId,
            target.slotIndex,
          )
        : null;
      const extractedSource = sourceRootNode
        ? {
            childLayouts: [] as PhiCmsLayoutRenderNode[],
            childWidgets: [] as PhiCmsContentWidgetNode[],
            node: sourceRootNode,
          }
        : extractStructureNode(
            sourceDraft.rootNodeChildLayouts ?? [],
            sourceDraft.rootNodeChildWidgets ?? [],
            payload.nodeId,
            payload.nodeKind,
          );
      if (!extractedSource.node) {
        return;
      }

      const targetLayout =
        target.parentLayoutNodeId === rootNodeId
          ? null
          : findPhiBuilderLayoutNodeById(
              rootNodeChildLayouts,
              target.parentLayoutNodeId,
            );
      if (
        target.parentLayoutNodeId !== rootNodeId &&
        !targetLayout
      ) {
        return;
      }
      if (
        !canMoveStructureLayoutToTarget(
          extractedSource.node,
          target.parentLayoutNodeId,
          rootNodeId,
          rootNodeChildLayouts,
        )
      ) {
        return;
      }
      const targetDefinition =
        target.parentLayoutNodeId === rootNodeId
          ? rootNodeDefinition
          : layoutMetasByType.get(targetLayout!.widgetType) ?? null;
      const compactTarget =
        isPhiCmsSequentialLayoutSlots(targetDefinition?.slots) &&
        targetDefinition?.layoutKind !== "collapsible";
      const targetLayouts =
        target.parentLayoutNodeId === rootNodeId
          ? rootNodeChildLayouts
          : targetLayout?.childLayouts ?? [];
      const targetWidgets =
        target.parentLayoutNodeId === rootNodeId
          ? rootNodeChildWidgets
          : targetLayout?.childWidgets ?? [];
      if (
        !compactTarget &&
        (
          targetLayouts.some((node) => node.slotIndex === target.slotIndex) ||
          targetWidgets.some((node) => node.slotIndex === target.slotIndex)
        )
      ) {
        return;
      }

      const movedNode = {
        ...extractedSource.node,
        parentLayoutNodeId: target.parentLayoutNodeId,
        slotIndex: target.slotIndex,
        sortOrder: Math.max(0, extractedSource.node.sortOrder),
      };
      let nextTargetLayouts = rootNodeChildLayouts;
      let nextTargetWidgets = rootNodeChildWidgets;
      const targetsRoot = target.parentLayoutNodeId === rootNodeId;
      if ("contentId" in movedNode) {
        if (targetsRoot) {
          if (compactTarget) {
            const inserted = insertPhiCmsSequentialChild(
              nextTargetLayouts,
              nextTargetWidgets,
              movedNode,
            );
            nextTargetLayouts = inserted.childLayouts;
            nextTargetWidgets = inserted.childWidgets;
          } else {
            nextTargetWidgets = [...nextTargetWidgets, movedNode];
          }
        } else {
          nextTargetLayouts = appendWidgetChildById(
            nextTargetLayouts,
            target.parentLayoutNodeId,
            movedNode,
            compactTarget,
          );
        }
      } else if (targetsRoot) {
        if (compactTarget) {
          const inserted = insertPhiCmsSequentialChild(
            nextTargetLayouts,
            nextTargetWidgets,
            movedNode,
          );
          nextTargetLayouts = inserted.childLayouts;
          nextTargetWidgets = inserted.childWidgets;
        } else {
          nextTargetLayouts = [...nextTargetLayouts, movedNode];
        }
      } else {
        nextTargetLayouts = appendLayoutChildById(
          nextTargetLayouts,
          target.parentLayoutNodeId,
          movedNode,
          compactTarget,
        );
      }
      if (targetsRoot && compactTarget) {
        const compactedTarget = compactPhiCmsSequentialChildren({
          childLayouts: nextTargetLayouts,
          childWidgets: nextTargetWidgets,
        });
        nextTargetLayouts = compactedTarget.childLayouts;
        nextTargetWidgets = compactedTarget.childWidgets;
      }

      const sourceRootDefinition = layoutMetasByType.get(sourceDraft.rootNodeTypeKey!) ?? null;
      let nextSourceLayouts = compactStructureSequentialLayouts(
        extractedSource.childLayouts,
        layoutMetasByType,
      );
      let nextSourceWidgets = extractedSource.childWidgets;
      if (
        isPhiCmsSequentialLayoutSlots(sourceRootDefinition?.slots) &&
        sourceRootDefinition?.layoutKind !== "collapsible"
      ) {
        const compactedSource = compactPhiCmsSequentialChildren({
          childLayouts: nextSourceLayouts,
          childWidgets: nextSourceWidgets,
        });
        nextSourceLayouts = compactedSource.childLayouts;
        nextSourceWidgets = compactedSource.childWidgets;
      }

      setPhiDeveloperRegionDraftsWithHistory(
        {
          [sourceDraftKey]: movingSourceRoot
            ? clearStructureRootNode(sourceDraft)
            : {
                ...sourceDraft,
                rootNodeChildLayouts: nextSourceLayouts,
                rootNodeChildWidgets: nextSourceWidgets,
              },
          [draftKey]: {
            ...(effectiveDraft ?? getDefaultRegionDraft(config.regionKey)),
            rootNodeChildLayouts:
              compactStructureSequentialLayouts(nextTargetLayouts, layoutMetasByType),
            rootNodeChildWidgets: nextTargetWidgets,
          },
        },
        {
          historyContext,
          historyLabel: "Move structure node",
        },
      );
      return;
    }

    const extracted = extractStructureNode(
      rootNodeChildLayouts,
      rootNodeChildWidgets,
      payload.nodeId,
      payload.nodeKind,
    );
    if (!extracted.node) {
      return;
    }

    const targetsRoot = target.parentLayoutNodeId === rootNodeId;
    const targetLayout = targetsRoot
      ? null
      : findPhiBuilderLayoutNodeById(
          extracted.childLayouts,
          target.parentLayoutNodeId,
        );
    if (!targetsRoot && !targetLayout) {
      return;
    }
    if (
      !canMoveStructureLayoutToTarget(
        extracted.node,
        target.parentLayoutNodeId,
        rootNodeId,
        extracted.childLayouts,
      )
    ) {
      return;
    }

    const targetDefinition = targetsRoot
      ? rootNodeDefinition
      : layoutMetasByType.get(targetLayout!.widgetType) ?? null;
    const compactSequential =
      isPhiCmsSequentialLayoutSlots(targetDefinition?.slots) &&
      targetDefinition?.layoutKind !== "collapsible";
    const targetLayouts = targetsRoot
      ? extracted.childLayouts
      : targetLayout?.childLayouts ?? [];
    const targetWidgets = targetsRoot
      ? extracted.childWidgets
      : targetLayout?.childWidgets ?? [];
    const targetOccupied =
      targetLayouts.some((node) => node.slotIndex === target.slotIndex) ||
      targetWidgets.some((node) => node.slotIndex === target.slotIndex);
    if (!compactSequential && targetOccupied) {
      return;
    }

    const insertionSlotIndex =
      compactSequential &&
      extracted.node.parentLayoutNodeId === target.parentLayoutNodeId &&
      extracted.node.slotIndex < target.slotIndex
        ? target.slotIndex - 1
        : target.slotIndex;
    const movedNode = {
      ...extracted.node,
      parentLayoutNodeId: target.parentLayoutNodeId,
      slotIndex: insertionSlotIndex,
      sortOrder: Math.max(0, extracted.node.sortOrder),
    };
    let nextChildLayouts = extracted.childLayouts;
    let nextChildWidgets = extracted.childWidgets;

    if ("contentId" in movedNode) {
      if (targetsRoot) {
        if (compactSequential) {
          const inserted = insertPhiCmsSequentialChild(
            nextChildLayouts,
            nextChildWidgets,
            movedNode,
          );
          nextChildLayouts = inserted.childLayouts;
          nextChildWidgets = inserted.childWidgets;
        } else {
          nextChildWidgets = [...nextChildWidgets, movedNode];
        }
      } else {
        nextChildLayouts = appendWidgetChildById(
          nextChildLayouts,
          target.parentLayoutNodeId,
          movedNode,
          compactSequential,
        );
      }
    } else if (targetsRoot) {
      if (compactSequential) {
        const inserted = insertPhiCmsSequentialChild(
          nextChildLayouts,
          nextChildWidgets,
          movedNode,
        );
        nextChildLayouts = inserted.childLayouts;
        nextChildWidgets = inserted.childWidgets;
      } else {
        nextChildLayouts = [...nextChildLayouts, movedNode];
      }
    } else {
      nextChildLayouts = appendLayoutChildById(
        nextChildLayouts,
        target.parentLayoutNodeId,
        movedNode,
        compactSequential,
      );
    }

    if (targetsRoot && compactSequential) {
      const compacted = compactPhiCmsSequentialChildren({
        childLayouts: nextChildLayouts,
        childWidgets: nextChildWidgets,
      });
      nextChildLayouts = compacted.childLayouts;
      nextChildWidgets = compacted.childWidgets;
    }

    setPhiDeveloperRegionDraft(
      draftKey,
      {
        ...(effectiveDraft ?? getDefaultRegionDraft(config.regionKey)),
        rootNodeChildLayouts:
          compactStructureSequentialLayouts(nextChildLayouts, layoutMetasByType),
        rootNodeChildWidgets: nextChildWidgets,
      },
      {
        historyContext,
        historyLabel: "Move structure node",
      },
    );
  };
  const canDropStructureNodeAsRoot = (
    payload: PhiStructureDragData,
  ) => {
    if (isPreviewMode || hasRootNode) {
      return false;
    }

    if (
      payload.area !== builderState.area ||
      payload.pageKey !== builderState.pageKey ||
      payload.regionKey === config.regionKey ||
      payload.nodeKind === "widget" ||
      isPhiBuilderPageScopedRegion(payload.regionKey) !==
        isPhiBuilderPageScopedRegion(config.regionKey)
    ) {
      return false;
    }

    const sourceDraft =
      getPhiDeveloperRegionDraftsSnapshot()[
        getPhiBuilderRegionDraftKey(
          payload.area,
          payload.regionKey,
          payload.pageKey,
        )
      ] ?? null;
    if (
      !sourceDraft?.rootNodeId ||
      !sourceDraft.rootNodeTypeKey ||
      !sourceDraft.rootNodeKind
    ) {
      return false;
    }

    const movingSourceRoot = payload.nodeId === sourceDraft.rootNodeId;
    if (
      movingSourceRoot &&
      sourceDraft.rootNodeKind !== "layout"
    ) {
      return false;
    }
    const extractedSource = movingSourceRoot
      ? null
      : extractStructureNode(
          sourceDraft.rootNodeChildLayouts ?? [],
          sourceDraft.rootNodeChildWidgets ?? [],
          payload.nodeId,
          payload.nodeKind,
        );
    if (
      !movingSourceRoot &&
      (!extractedSource?.node || "contentId" in extractedSource.node)
    ) {
      return false;
    }
    return true;
  };
  const dropStructureNodeAsRoot = (
    payload: PhiStructureDragData,
  ) => {
    if (!canDropStructureNodeAsRoot(payload)) {
      return;
    }

    const sourceDraftKey = getPhiBuilderRegionDraftKey(
      payload.area,
      payload.regionKey,
      payload.pageKey,
    );
    const sourceDraft =
      getPhiDeveloperRegionDraftsSnapshot()[sourceDraftKey]!;
    const movingSourceRoot = payload.nodeId === sourceDraft.rootNodeId;
    const extractedSource = movingSourceRoot
      ? null
      : extractStructureNode(
          sourceDraft.rootNodeChildLayouts ?? [],
          sourceDraft.rootNodeChildWidgets ?? [],
          payload.nodeId,
          payload.nodeKind,
        );

    let nextSourceDraft: PhiDeveloperBuilderRegionDraft;
    let nextTargetDraft: PhiDeveloperBuilderRegionDraft;
    const targetBase =
      effectiveDraft ?? getDefaultRegionDraft(config.regionKey);
    if (movingSourceRoot) {
      nextSourceDraft = clearStructureRootNode(sourceDraft);
      nextTargetDraft = copyStructureRootNode(targetBase, sourceDraft);
    } else {
      const sourceRootDefinition = layoutMetasByType.get(sourceDraft.rootNodeTypeKey!) ?? null;
      let nextSourceLayouts = compactStructureSequentialLayouts(
        extractedSource!.childLayouts,
        layoutMetasByType,
      );
      let nextSourceWidgets = extractedSource!.childWidgets;
      if (
        isPhiCmsSequentialLayoutSlots(sourceRootDefinition?.slots) &&
        sourceRootDefinition?.layoutKind !== "collapsible"
      ) {
        const compactedSource = compactPhiCmsSequentialChildren({
          childLayouts: nextSourceLayouts,
          childWidgets: nextSourceWidgets,
        });
        nextSourceLayouts = compactedSource.childLayouts;
        nextSourceWidgets = compactedSource.childWidgets;
      }
      nextSourceDraft = {
        ...sourceDraft,
        rootNodeChildLayouts: nextSourceLayouts,
        rootNodeChildWidgets: nextSourceWidgets,
      };
      nextTargetDraft = promoteStructureLayoutToRoot(
        targetBase,
        extractedSource!.node as PhiCmsLayoutRenderNode,
      );
    }

    setPhiDeveloperRegionDraftsWithHistory(
      {
        [sourceDraftKey]: nextSourceDraft,
        [draftKey]: nextTargetDraft,
      },
      {
        historyContext,
        historyLabel: "Move layout to region root",
      },
    );
  };
  const rootDropTarget: PhiStructureDropTargetData | null =
    !isPreviewMode && !hasRootNode
      ? {
          id: [
            "structure-root-drop",
            builderState.area,
            builderState.pageKey,
            config.regionKey,
          ].join(":"),
          area: builderState.area,
          pageKey: builderState.pageKey,
          regionKey: config.regionKey,
          dropMode: "child",
          title: `${config.title} root`,
          accepts: canDropStructureNodeAsRoot,
          drop: dropStructureNodeAsRoot,
        }
      : null;
  const {
    accepted: rootDropAccepted,
    isOver: rootDropIsOver,
    setNodeRef: setRootDropNodeRef,
  } = usePhiStructureDroppable(rootDropTarget);
  const availablePickItems = (config.pickItems ?? []).filter((item) => {
    if (item.kind === "widget") {
      return activeModules.widgetTypes.has(item.key);
    }

    const { pluginKey, typeKey } = splitPhiCmsLayoutNamespacedTypeKey(item.key);
    return activeModules.layoutTypes.has(`${pluginKey}/${typeKey}`);
  });
  const pickerPlacement = config.regionKey === "sider_left" ? "right" : "top";
  const rootNodeScaffold = hasRootNode
    ? renderPhiRootNodeScaffold({
      regionKey: config.regionKey,
      id: rootNodeId,
      typeKey: rootNodeTypeKey,
      kind: rootNodeKind,
      title: effectiveDraft?.rootNodeTitle ?? null,
      packageName: effectiveDraft?.rootNodePackageName ?? null,
      editSlotAnchor: resolvedRootNodeAnchor,
      rootNodeConfig: effectiveDraft?.rootNodeConfig ?? null,
      rootNodeGeometry: effectiveDraft?.rootNodeGeometry ?? null,
      rootNodePadding: effectiveDraft?.rootNodePadding ?? null,
      rootNodeBackground: effectiveDraft?.rootNodeBackground ?? null,
      rootNodeBorder: effectiveDraft?.rootNodeBorder ?? null,
      rootNodeShadow: effectiveDraft?.rootNodeShadow ?? null,
      childLayouts: rootNodeChildLayouts,
      childWidgets: rootNodeChildWidgets,
    }, openSlot, openRootInspector, deleteRootNode, updateWidgetNodeConfig, updateLayoutNodeConfig, {
      fallbackBlockSize: resolvedRootBodyHeight ?? null,
      fallbackMinBlockSize: resolvedRootBodyMinHeight ?? null,
      effectsLabels,
      authoringCanvas,
      demandControllerContext: {
        area: builderState.area,
        ownerKey: getPhiBuilderRegionDraftKey(
          builderState.area,
          config.regionKey,
          builderState.pageKey,
        ),
        ownerMountScope: isPhiBuilderPageScopedRegion(config.regionKey) ? "page" : "area",
        pageKey: isPhiBuilderPageScopedRegion(config.regionKey) ? builderState.pageKey : null,
        regionType: resolvePhiCmsRegionType(config.regionKey),
      },
      draggable:
        rootNodeKind === "layout",
      resolveDragData: resolveStructureDragData,
      resolveDropTarget: resolveStructureDropTarget,
      resolveWidgetDropTarget: resolveWidgetSwapDropTarget,
      renderInsertPicker,
    })
    : null;

  async function insertPickedItem(item: PhiStructureRegionPickItem) {
    const currentSlotPickerContext = slotPickerContext;
    const instanceId = await allocatePhiBuilderCmsInstanceId({
      area: builderState.area,
      pageKey: builderState.pageKey,
      regionKey: config.regionKey,
      builderPlugins: builderModuleMetas.plugins,
    });
    const targetLayoutNodeId = currentSlotPickerContext?.targetNodeId ?? rootNodeId;
    const targetsRootLayout = targetLayoutNodeId === rootNodeId;
    const parentLayoutNodeId = targetLayoutNodeId;
    const insertionSlotIndex = currentSlotPickerContext?.slotIndex ?? null;
    const parentLayoutNode = targetsRootLayout || targetLayoutNodeId == null
      ? null
      : findPhiBuilderLayoutNodeById(rootNodeChildLayouts, targetLayoutNodeId);
    const parentLayoutDefinition = parentLayoutNode == null
      ? rootNodeDefinition
      : layoutMetasByType.get(parentLayoutNode.widgetType) ?? null;
    const compactSequential =
      isPhiCmsSequentialLayoutSlots(parentLayoutDefinition?.slots) &&
      parentLayoutDefinition?.layoutKind !== "collapsible";
    const isSlotInsertion =
      hasRootNode &&
      insertionSlotIndex != null &&
      parentLayoutNodeId != null;

    if (
      isSlotInsertion
      && item.kind === "widget"
      && currentSlotPickerContext?.allowWidgetSection
      && insertionSlotIndex != null
      && parentLayoutNodeId != null
    ) {
      const nextWidget = buildInsertedWidgetNode(
        item,
        instanceId,
        parentLayoutNodeId,
        insertionSlotIndex,
        resolveNextSlotSortOrder(insertionSlotIndex),
      );
      updateDraft(
        !targetsRootLayout
          ? {
              rootNodeChildLayouts: appendWidgetChildById(
                rootNodeChildLayouts,
                parentLayoutNodeId,
                nextWidget,
                compactSequential,
              ),
            }
          : compactSequential
            ? (() => {
                const nextChildren = compactPhiCmsSequentialChildren({
                  childLayouts: rootNodeChildLayouts,
                  childWidgets: [...rootNodeChildWidgets, nextWidget],
                });
                return {
                  rootNodeChildLayouts: nextChildren.childLayouts,
                  rootNodeChildWidgets: nextChildren.childWidgets,
                };
              })()
            : { rootNodeChildWidgets: [...rootNodeChildWidgets, nextWidget] },
      );
    } else if (
      isSlotInsertion
      && item.kind !== "widget"
      && currentSlotPickerContext?.allowLayoutSection
      && insertionSlotIndex != null
      && parentLayoutNodeId != null
    ) {
      const nextLayout = buildInsertedLayoutNode(
        item,
        instanceId,
        parentLayoutNodeId,
        insertionSlotIndex,
        resolveNextSlotSortOrder(insertionSlotIndex),
      );
      updateDraft(
        !targetsRootLayout
          ? {
              rootNodeChildLayouts: appendLayoutChildById(
                rootNodeChildLayouts,
                parentLayoutNodeId,
                nextLayout,
                compactSequential,
              ),
            }
          : compactSequential
            ? (() => {
                const nextChildren = compactPhiCmsSequentialChildren({
                  childLayouts: [...rootNodeChildLayouts, nextLayout],
                  childWidgets: rootNodeChildWidgets,
                });
                return {
                  rootNodeChildLayouts: nextChildren.childLayouts,
                  rootNodeChildWidgets: nextChildren.childWidgets,
                };
              })()
            : { rootNodeChildLayouts: [...rootNodeChildLayouts, nextLayout] },
      );
    } else if (!hasRootNode) {
      const resolvedDefaultConfig = resolveInsertedItemDefaultConfig(item);
      const rootNodeDefaults = resolvePhiBuilderRootNodeDefaults(resolvedDefaultConfig);
      updateDraft({
        rootNodeId: instanceId,
        rootNodeTypeKey: item.key,
        rootNodeKind: item.kind,
        rootNodeTitle: item.title,
        rootNodePackageName: resolvePickItemPackageName(item),
        rootNodeConfig: resolvedDefaultConfig,
        rootNodeGeometry: null,
        rootNodeAnchor: item.defaultAnchor ?? null,
        rootNodePadding: rootNodeDefaults.rootNodePadding,
        rootNodeBackground: rootNodeDefaults.rootNodeBackground,
        rootNodeBorder: rootNodeDefaults.rootNodeBorder,
        rootNodeShadow: readPhiShadow(resolvedDefaultConfig?.shadow) ?? null,
        rootNodeChildLayouts: [],
        rootNodeChildWidgets: [],
      });
    } else {
      return;
    }
  }
  const pickerActionIconFrameSize = token.controlHeight;
  const pickerActionIconSize = token.fontSizeHeading4;

  useEffect(() => {
    if (builderMode !== "preview" || !isPicking) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsPicking(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [builderMode, isPicking]);

  useEffect(() => {
    if (!Array.isArray(builderState.pickerWidgetCategoryFilters)) {
      patchPhiDeveloperBuilderState("public", { pickerWidgetCategoryFilters: [] });
    }
  }, [builderState.pickerWidgetCategoryFilters]);

  useEffect(() => {
    if (slotKind !== "structure") {
      return;
    }

    const nextDraft = structureDraftsByArea?.[builderState.area] ?? null;
    if (!nextDraft) {
      return;
    }

    // Seed the structure workspace exactly once per draft key.
    // An empty draft with `rootNodeTypeKey: null` is still a valid loaded state,
    // for example after deleting the region root layout or after loading a
    // persisted empty shell region from the server.
    if (regionDraft != null) {
      return;
    }

    setPhiDeveloperRegionDraft(draftKey, nextDraft);
  }, [builderState.area, builderState.pageKey, config.regionKey, draftKey, regionDraft, slotKind, structureDraftsByArea]);

  useEffect(() => {
    if (slotKind === "structure") {
      return;
    }

    if (!fallbackPageDraft || fallbackPageDraft.rootNodeTypeKey == null) {
      return;
    }

    // Seed the page workspace exactly once per draft key.
    // An empty draft with `rootNodeTypeKey: null` is still a valid loaded state,
    // for example after deleting the page root layout or after loading a
    // persisted empty page region from the server.
    if (regionDraft != null) {
      return;
    }

    setPhiDeveloperRegionDraft(draftKey, fallbackPageDraft);
  }, [
    builderState.area,
    builderState.pageKey,
    config.regionKey,
    draftKey,
    fallbackPageDraft,
    regionDraft,
    slotKind,
  ]);

  function selectRegion() {
    if (!config.allowSelect || isPreviewMode) {
      return;
    }

    selectPhiDeveloperBuilderNode("public", {
      area: builderState.area,
      pageKey: builderState.pageKey,
      nodeKind: "region",
      nodeKey: `region:${config.regionKey}`,
      regionKey: config.regionKey,
      regionType: resolvePhiCmsRegionType(config.regionKey),
    });
  }

  function openSlot(options?: {
    defaultPickSection?: "layout" | "widget";
    allowWidgetSection?: boolean;
    slotIndex?: number;
    targetNodeId?: PhiCmsInstanceId | null;
  }) {
    if (!config.allowInsert || isPreviewMode) {
      return;
    }

    const nextSlotIndex = typeof options?.slotIndex === "number" ? options.slotIndex : null;
    const nextTargetNodeId = readPhiCmsInstanceId(options?.targetNodeId);
    if (
      isPicking
      && slotPickerContext?.slotIndex === nextSlotIndex
      && slotPickerContext.targetNodeId === nextTargetNodeId
    ) {
      closePicker();
      return;
    }
    const targetDepth = nextTargetNodeId == null
      ? 0
      : resolvePhiCmsRenderLayoutNodeDepth(rootNodeChildLayouts, nextTargetNodeId) ?? 0;
    const nextAllowLayoutSection = targetDepth < PHI_CMS_MAX_LAYOUT_SUBLAYOUT_DEPTH;
    const requestedDefaultPickSection = options?.defaultPickSection ?? "layout";
    const nextDefaultPickSection = nextAllowLayoutSection ? requestedDefaultPickSection : "widget";
    const nextAllowWidgetSection = options?.allowWidgetSection ?? false;
    const nextSlotPickerContext = {
      defaultPickSection: nextDefaultPickSection,
      allowLayoutSection: nextAllowLayoutSection,
      allowWidgetSection: nextAllowWidgetSection,
      slotIndex: nextSlotIndex,
      targetNodeId: nextTargetNodeId,
    };
    setSlotPickerContext(nextSlotPickerContext);
    setPickSection(nextDefaultPickSection);
    setIsPicking(true);

    selectPhiDeveloperBuilderNode("public", {
      area: builderState.area,
      pageKey: builderState.pageKey,
      regionKey: config.regionKey,
      nodeKey: `slot:${config.regionKey}`,
      nodeKind: "slot",
      regionType: resolvePhiCmsRegionType(config.regionKey),
    });
  }

  function closePicker() {
    setIsPicking(false);
    setSlotPickerContext(null);
  }

  function renderInsertPicker({
    trigger,
    slotIndex,
    targetNodeId,
  }: {
    trigger: ReactElement;
    slotIndex: number;
    targetNodeId: PhiCmsInstanceId;
  }) {
    const isActiveTarget = isPicking
      && slotPickerContext?.slotIndex === slotIndex
      && slotPickerContext.targetNodeId === targetNodeId;
    return (
      <PhiBuilderInsertPickerControl
        key={`insert-picker:${targetNodeId}:${slotIndex}`}
        open={isActiveTarget}
        trigger={trigger}
        items={availablePickItems}
        section={pickSection}
        packageFilters={pickPackageFilters}
        widgetCategoryFilters={widgetCategoryFilters}
        allowLayoutSection={slotPickerContext?.allowLayoutSection ?? true}
        allowWidgetSection={slotPickerContext?.allowWidgetSection ?? false}
        placement={pickerPlacement}
        labels={pickerLabels}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && isActiveTarget) closePicker();
        }}
        onSectionChange={setPickSection}
        onPackageFiltersChange={setPickPackageFilters}
        onWidgetCategoryFiltersChange={(filters) => {
          patchPhiDeveloperBuilderState("public", { pickerWidgetCategoryFilters: filters });
        }}
        onChange={(item) => void insertPickedItem(item)}
      />
    );
  }

  function renderRegionPicker(trigger: ReactElement) {
    if (hasRootNode) return trigger;

    const isActiveTarget = isPicking
      && slotPickerContext?.slotIndex == null
      && slotPickerContext?.targetNodeId == null;
    return (
      <PhiBuilderInsertPickerControl
        key={`insert-picker:region:${config.regionKey}`}
        open={isActiveTarget}
        trigger={trigger}
        items={availablePickItems}
        section={pickSection}
        packageFilters={pickPackageFilters}
        widgetCategoryFilters={widgetCategoryFilters}
        allowLayoutSection={slotPickerContext?.allowLayoutSection ?? true}
        allowWidgetSection={slotPickerContext?.allowWidgetSection ?? false}
        placement={pickerPlacement}
        labels={pickerLabels}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && isActiveTarget) closePicker();
        }}
        onSectionChange={setPickSection}
        onPackageFiltersChange={setPickPackageFilters}
        onWidgetCategoryFiltersChange={(filters) => {
          patchPhiDeveloperBuilderState("public", { pickerWidgetCategoryFilters: filters });
        }}
        onChange={(item) => void insertPickedItem(item)}
      />
    );
  }

  function updateDraft(nextDraft: Partial<PhiDeveloperBuilderRegionDraft>) {
    const baseDraft = effectiveDraft ?? getDefaultRegionDraft(config.regionKey);

    setPhiDeveloperRegionDraft(
      draftKey,
      {
        ...baseDraft,
        ...nextDraft,
      },
      {
        historyContext,
        historyLabel: "Update structure",
      },
    );
  }

  function updateDraftAndPruneSignalRoutes(
    nextDraft: Partial<PhiDeveloperBuilderRegionDraft>,
    addresses: readonly PhiSignalAddress[],
  ) {
    const baseDraft = effectiveDraft ?? getDefaultRegionDraft(config.regionKey);
    const routeScope: PhiSignalScope = isPhiBuilderPageScopedRegion(config.regionKey) ? "page" : "area";

    setPhiDeveloperRegionDraftAndPruneSignalRoutes({
      draftKey,
      draft: {
        ...baseDraft,
        ...nextDraft,
      },
      area: builderState.area,
      pageKey: builderState.pageKey,
      targets: addresses.map((address) => ({ address, scope: routeScope })),
      historyContext,
      historyLabel: "Update structure",
    });
  }

  if (isPreviewMode) {
    if (!hasRootNode) {
      return null;
    }

    const previewRoot = hasRootNode ? serverPreview ?? null : null;
    const previewSlotHeight = shouldUseFallbackBodyHeightForRoot
      ? slotHeight ?? slotBodyFallbackHeight
      : slotHeight;
    const previewRootBodyHeight = shouldUseFallbackBodyHeightForRoot
      ? resolvedRootBodyHeight
      : shouldStretchAvailableHeight
        ? "100%"
        : undefined;

    return (
      <div
        data-phi-region-slot={config.regionKey}
        className="phi-builder-structure-region__slot"
        data-phi-builder-region-mode="preview"
        data-phi-builder-region-has-root-node={hasRootNode ? "true" : "false"}
        data-phi-builder-region-selected="false"
        data-phi-builder-region-picking="false"
        style={{
          width: slotWidth,
          minWidth: slotMinWidth,
          maxWidth: slotMaxWidth,
          height: previewSlotHeight,
          minHeight: slotMinHeight,
          maxHeight: slotMaxHeight,
          marginTop: resolvePhiCssLength(offsetTop),
          ...slotBackgroundStyle,
          ...slotBorderStyle,
          boxShadow: combinePhiBoxShadows(slotBackgroundStyle.boxShadow, resolvePhiShadow(effectiveDraft?.shadow)),
          zIndex: resolvedRegionZIndex,
          position: resolvedRegionZIndex != null ? "relative" : undefined,
          flex: shouldStretchAvailableHeight ? "1 1 auto" : undefined,
          ...(resolvedRegionTypography.fontSize ? { fontSize: resolvedRegionTypography.fontSize } : {}),
          ...(resolvedRegionTypography.lineHeight ? { lineHeight: resolvedRegionTypography.lineHeight } : {}),
        }}
      >
        <div
          data-phi-debug-scaffold={resolvedDebugScaffold}
          style={{
            flex: "1 1 auto",
            height: previewRootBodyHeight,
            minHeight: shouldStretchAvailableHeight ? 0 : slotBodyMinHeight,
            display: "flex",
            flexDirection: "column",
            justifyContent: "stretch",
            alignItems: "stretch",
            minWidth: 0,
          }}
        >
          {previewRoot}
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "phi-builder-structure-region",
        shouldFillAvailableHeight ? "phi-builder-structure-region--full-height" : null,
        !shouldFillAvailableHeight ? "phi-builder-structure-region--compact" : null,
        containerClassName,
      ].filter(Boolean).join(" ")}
      data-phi-builder-region-mode={isPreviewMode ? "preview" : "editor"}
      data-phi-builder-region-has-root-node={hasRootNode ? "true" : "false"}
      data-phi-builder-region-selected={isSelected ? "true" : "false"}
      data-phi-builder-region-picking={isPicking ? "true" : "false"}
      role={config.allowSelect && !isPreviewMode ? "button" : undefined}
      tabIndex={config.allowSelect && !isPreviewMode ? 0 : undefined}
      style={{
        border: `1px dashed ${token.colorBorderSecondary}`,
        backgroundColor: token.colorFillTertiary,
        boxShadow: `inset 0 0 0 1px ${token.colorBorderSecondary}`,
        width: outerWidth,
        minWidth: outerMinWidth,
        maxWidth: outerMaxWidth,
        ...(shouldFillAvailableHeight
          ? {
              height: "100%",
              minHeight: "100%",
              flex: "1 1 auto",
            }
          : {}),
        ...(shouldStretchAvailableHeight && !shouldFillAvailableHeight
          ? {
              flex: "1 1 auto",
              minHeight: 0,
            }
          : {}),
        ...containerStyle,
      } satisfies CSSProperties}
      onClick={isPreviewMode ? undefined : selectRegion}
      onKeyDown={(event) => {
        if (!config.allowSelect || isPreviewMode) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRegion();
        }
      }}
    >
      {isPreviewMode ? null : (
        <Space orientation="vertical" size={0} style={{ minWidth: 0, width: "100%" }}>
          <Flex align="center" gap={6} wrap={false} style={{ minWidth: 0, width: "100%", whiteSpace: "nowrap" }}>
            <Typography.Text strong style={{ minWidth: 0, whiteSpace: "nowrap" }}>
              {config.title}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ minWidth: 0, whiteSpace: "nowrap" }}>
              · {config.regionKey}
            </Typography.Text>
          </Flex>
          {config.subtitle ? (
            <Typography.Text type="secondary" style={{ display: "block", whiteSpace: "normal", overflowWrap: "anywhere" }}>
              {config.subtitle}
            </Typography.Text>
          ) : null}
        </Space>
      )}

      {renderRegionPicker(
        <div
              ref={setRootDropNodeRef}
              data-phi-region-slot={config.regionKey}
              className="phi-builder-structure-region__slot"
              data-phi-builder-region-mode="editor"
              data-phi-structure-drop-state={
                rootDropAccepted
                  ? "accepted"
                  : rootDropIsOver
                    ? "rejected"
                    : undefined
              }
          data-phi-builder-region-has-root-node={hasRootNode ? "true" : "false"}
          data-phi-builder-region-selected={isSelected ? "true" : "false"}
          data-phi-builder-region-picking={isPicking ? "true" : "false"}
          role={config.allowInsert && !hasRootNode ? "button" : undefined}
          tabIndex={config.allowInsert && !hasRootNode ? 0 : undefined}
          style={{
            border: isPicking
              ? `1px dashed ${token.colorPrimary}`
              : `1px dashed ${token.colorBorderSecondary}`,
            backgroundColor: isSelected
              ? token.colorFillQuaternary
              : token.colorBgContainer,
            boxShadow: combinePhiBoxShadows(
              slotBackgroundStyle.boxShadow,
              resolvePhiShadow(effectiveDraft?.shadow) ??
                `inset 0 0 0 1px ${isPicking || isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
            ),
            width: slotWidth,
            minWidth: slotMinWidth,
            maxWidth: slotMaxWidth,
            height: slotHeight,
            minHeight: slotMinHeight,
            maxHeight: slotMaxHeight,
            marginTop: resolvePhiCssLength(offsetTop),
            ...slotBackgroundStyle,
            ...slotBorderStyle,
            zIndex: resolvedRegionZIndex,
            position: resolvedRegionZIndex != null ? "relative" : undefined,
            flex: shouldStretchAvailableHeight ? "1 1 auto" : undefined,
            ...(resolvedRegionTypography.fontSize ? { fontSize: resolvedRegionTypography.fontSize } : {}),
            ...(resolvedRegionTypography.lineHeight ? { lineHeight: resolvedRegionTypography.lineHeight } : {}),
          }}
            onClick={(event) => {
              event.stopPropagation();
              if (hasRootNode) {
                const target = event.target;
                if (
                  target instanceof Element &&
                  target.closest(".phi-builder-root-scaffold")
                ) {
                  return;
                }
                selectRegion();
                return;
              }

              openSlot();
            }}
            onKeyDown={(event) => {
              if (!config.allowInsert || hasRootNode) {
                return;
              }

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openSlot();
              }
            }}
          >
            <div
              data-phi-debug-scaffold={resolvedDebugScaffold}
              style={{
                flex: "1 1 auto",
                minHeight: shouldStretchAvailableHeight ? 0 : slotBodyMinHeight,
                height: resolvedRootBodyHeight,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: hasRootNode ? "stretch" : "center",
                alignItems: hasRootNode ? "stretch" : "center",
                ...regionPaddingStyle,
                gap: 0,
                minWidth: 0,
              }}
            >
              {hasRootNode ? (
                rootNodeScaffold ? (
                  rootNodeScaffold
                ) : null
              ) : (
                <span
                  aria-hidden
                  style={{
                    width: pickerActionIconFrameSize,
                    height: pickerActionIconFrameSize,
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: pickerActionIconSize,
                    color: isPicking ? token.colorPrimary : token.colorTextSecondary,
                  }}
                >
                  <PlusOutlined />
                </span>
              )}
            </div>
        </div>,
      )}
    </div>
  );
}

export function PhiStructureRegionWidget(props: PhiStructureRegionWidgetProps) {
  return <PhiStructureRegionScaffold {...props} />;
}
