import { normalizePhiGeometryWidgetConfig } from "../../../components/widgets/config/geometry";
import { stripPhiResolvedAssetProjections } from "../../../components/media/image-presentation";
import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiCmsLayoutRenderNode,
  PhiResolvedCmsPageTree,
} from "../../../types/cms";
import { comparePhiCmsInstanceIds, type PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { resolvePhiCmsRegionKey } from "../../../helpers/cms-region-keys";
import {
  type PhiDeveloperBuilderArea,
  type PhiDeveloperBuilderRegionDraft,
} from "./developer-workspace-types";
import type {
  PhiRenderableBlockResponsiveSize,
  PhiRenderableBlockSize,
} from "../../../types/renderable-block";
import { readPhiLengthValue, type PhiCssLength } from "../../../types/length";
import { getPhiBuilderDefaultRegionDraft } from "./region-defaults";
import { resolvePhiBuilderRootNodeDefaults } from "./root-node-normalization";
import {
  getPhiBuilderRegionDraftKey,
  PHI_BUILDER_PAGE_REGION_KEYS,
  PHI_BUILDER_SHELL_REGION_KEYS,
  type PhiBuilderRegionKey,
} from "./region-keys";
import { resolvePhiAnchorPlacement } from "../../../components/layouts/phi-layout-contract";
import { splitPhiCmsLayoutNamespacedTypeKey } from "../../../constants/cms-layout-types";
import { isPhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";
import { readPhiSurface } from "../../../types/surface";

type JsonRecord = Record<string, unknown>;

type BuilderPersistedRegionConfig = {
  fullHeight?: boolean;
  sticky?: boolean;
  offsetTop?: PhiCssLength;
  size?: PhiRenderableBlockResponsiveSize;
  minSize?: PhiRenderableBlockResponsiveSize;
  maxSize?: PhiRenderableBlockResponsiveSize;
  /*
   * Not an offer, an inventory. Geometry is stated in the three above; these are what older stored
   * configs still carry, and they are declared here so that the sweep further down -- which deletes
   * every one of them on each save -- can name them. They go when no stored config has them left.
   */
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  zIndex?: number;
  surface?: unknown;
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
};

const BUILDER_REGION_KEYS = [...PHI_BUILDER_SHELL_REGION_KEYS, ...PHI_BUILDER_PAGE_REGION_KEYS] as const;
type PhiBuilderHydrationTree = Pick<PhiResolvedCmsPageTree, "regions" | "layoutNodes" | "contentWidgets">;

function toJsonRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function readGeometrySize(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function readRenderableBlockSize(value: unknown): PhiRenderableBlockSize | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const width = readGeometrySize(raw.width);
  const height = readGeometrySize(raw.height);

  if (width == null && height == null) {
    return null;
  }

  return {
    ...(width == null ? {} : { width }),
    ...(height == null ? {} : { height }),
  };
}

function isPhiBuilderRegionKey(value: string): value is PhiBuilderRegionKey {
  return BUILDER_REGION_KEYS.includes(value as PhiBuilderRegionKey);
}

function buildLayoutRenderTree(tree: PhiBuilderHydrationTree, rootLayoutNodeId: PhiCmsInstanceId) {
  const layoutById = new Map<PhiCmsInstanceId, PhiCmsLayoutNode>(tree.layoutNodes.map((node) => [node.id, node]));
  const childLayoutsByParent = new Map<PhiCmsInstanceId, PhiCmsLayoutNode[]>();
  const childWidgetsByParent = new Map<PhiCmsInstanceId, PhiCmsContentWidgetNode[]>();

  for (const layoutNode of tree.layoutNodes) {
    if (layoutNode.parentLayoutNodeId == null) {
      continue;
    }
    const current = childLayoutsByParent.get(layoutNode.parentLayoutNodeId) ?? [];
    current.push(layoutNode);
    childLayoutsByParent.set(layoutNode.parentLayoutNodeId, current);
  }

  for (const widget of tree.contentWidgets) {
    const current = childWidgetsByParent.get(widget.parentLayoutNodeId) ?? [];
    current.push(widget);
    childWidgetsByParent.set(widget.parentLayoutNodeId, current);
  }

  function createNode(layoutNodeId: PhiCmsInstanceId): PhiCmsLayoutRenderNode | null {
    const node = layoutById.get(layoutNodeId);
    if (!node) {
      return null;
    }

    const childLayouts = (childLayoutsByParent.get(layoutNodeId) ?? [])
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder || comparePhiCmsInstanceIds(left.id, right.id))
      .map((child) => createNode(child.id))
      .filter((child): child is PhiCmsLayoutRenderNode => child !== null);
    const childWidgets = (childWidgetsByParent.get(layoutNodeId) ?? [])
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder || comparePhiCmsInstanceIds(left.id, right.id));

    return {
      ...node,
      childLayouts,
      childWidgets,
    };
  }

  return createNode(rootLayoutNodeId);
}

function resolveRootNodeKind(widgetType: string) {
  splitPhiCmsLayoutNamespacedTypeKey(widgetType);
  return "layout" as const;
}

function resolveRootNodePackageName(widgetType: string) {
  const segments = widgetType.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  return segments.slice(0, -1).join("/");
}

function normalizeHydratedChildLayouts(nodes: PhiCmsLayoutRenderNode[]): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => ({
    ...node,
    childLayouts: normalizeHydratedChildLayouts(node.childLayouts ?? []),
    childWidgets: normalizeHydratedChildWidgets(node.childWidgets ?? []),
  }));
}

function normalizeHydratedChildWidgets(widgets: PhiCmsContentWidgetNode[]): PhiCmsContentWidgetNode[] {
  return widgets.map((widget) => ({ ...widget }));
}

function buildRegionDraft(
  regionKey: string,
  regionConfig: BuilderPersistedRegionConfig,
  rootNode: PhiCmsLayoutRenderNode | null,
): PhiDeveloperBuilderRegionDraft {
  const fallback = getPhiBuilderDefaultRegionDraft(regionKey);
  const resolvedRootNodeKind = rootNode ? resolveRootNodeKind(rootNode.widgetType) : null;
  const rootNodeDefaults =
    rootNode && resolvedRootNodeKind
      ? resolvePhiBuilderRootNodeDefaults(rootNode.config ?? null)
      : { rootNodePadding: null, rootNodeSurface: null };

  return {
    ...fallback,
    regionConfig: toJsonRecord(regionConfig),
    sticky: typeof regionConfig.sticky === "boolean" ? regionConfig.sticky : fallback.sticky,
    offsetTop: readPhiLengthValue(regionConfig.offsetTop) ?? fallback.offsetTop,
    size: readRenderableBlockSize(regionConfig.size) ?? fallback.size,
    minSize: readRenderableBlockSize(regionConfig.minSize) ?? fallback.minSize,
    maxSize: readRenderableBlockSize(regionConfig.maxSize) ?? fallback.maxSize,
    zIndex: typeof regionConfig.zIndex === "number" && Number.isInteger(regionConfig.zIndex)
      ? regionConfig.zIndex
      : fallback.zIndex,
    surface: readPhiSurface(regionConfig.surface),
    rootNodeId: rootNode?.id ?? null,
    rootNodeTypeKey: rootNode?.widgetType ?? null,
    rootNodeKind: resolvedRootNodeKind,
    rootNodeTitle: rootNode?.label ?? null,
    rootNodePackageName: rootNode ? resolveRootNodePackageName(rootNode.widgetType) : null,
    rootNodeConfig: rootNode?.config ?? null,
    rootNodeGeometry: rootNode ? normalizePhiGeometryWidgetConfig(rootNode.config) : null,
    rootNodeAnchor:
      (isPhiAnchorWidgetPlacement(rootNode?.config?.anchor)
        ? rootNode.config.anchor
        : resolvePhiAnchorPlacement(rootNode?.config?.anchor as Parameters<typeof resolvePhiAnchorPlacement>[0])) ?? null,
    rootNodePadding: rootNodeDefaults.rootNodePadding,
    rootNodeSurface: rootNodeDefaults.rootNodeSurface,
    rootNodeChildLayouts: rootNode ? normalizeHydratedChildLayouts(rootNode.childLayouts ?? []) : [],
    rootNodeChildWidgets: rootNode ? normalizeHydratedChildWidgets(rootNode.childWidgets ?? []) : [],
  };
}

export function buildPhiDeveloperBuilderRegionDraftsFromTree(
  tree: PhiBuilderHydrationTree,
  area: PhiDeveloperBuilderArea,
  /** Null for the Area shell, whose regions are Area-scoped and name no Page. */
  pageKey: string | null,
  regionKeys: readonly PhiBuilderRegionKey[] = BUILDER_REGION_KEYS,
) {
  const drafts: Record<string, PhiDeveloperBuilderRegionDraft> = {};
  const regionEntries: Array<readonly [PhiBuilderRegionKey, (typeof tree.regions)[number]]> = [];

  for (const region of tree.regions) {
    const key = resolvePhiCmsRegionKey(region.regionType);
    if (key && isPhiBuilderRegionKey(key)) {
      regionEntries.push([key, region] as const);
    }
  }

  const regionByKey = new Map<PhiBuilderRegionKey, (typeof tree.regions)[number]>(regionEntries);

  for (const regionKey of regionKeys) {
    const region = regionByKey.get(regionKey) ?? null;
    const rootNode = region ? buildLayoutRenderTree(tree, region.rootLayoutNodeId) : null;
    drafts[getPhiBuilderRegionDraftKey(area, regionKey, pageKey)] = buildRegionDraft(
      regionKey,
      toJsonRecord(region?.config) as BuilderPersistedRegionConfig,
      rootNode,
    );
  }

  return drafts;
}

export function serializePhiDeveloperBuilderRegionConfig(
  _regionKey: string,
  draft: PhiDeveloperBuilderRegionDraft,
) {
  const base = {
    ...toJsonRecord(draft.regionConfig),
  } as BuilderPersistedRegionConfig;

  base.sticky = draft.sticky ?? false;
  base.offsetTop = draft.offsetTop ?? 0;

  if (draft.size?.width != null || draft.size?.height != null) {
    base.size = {
      ...(draft.size?.width == null ? {} : { width: draft.size.width }),
      ...(draft.size?.height == null ? {} : { height: draft.size.height }),
    };
  } else {
    delete base.size;
  }

  if (draft.maxSize?.width != null || draft.maxSize?.height != null) {
    base.maxSize = {
      ...(draft.maxSize?.width == null ? {} : { width: draft.maxSize.width }),
      ...(draft.maxSize?.height == null ? {} : { height: draft.maxSize.height }),
    };
  } else {
    delete base.maxSize;
  }

  if (draft.minSize?.width != null || draft.minSize?.height != null) {
    base.minSize = {
      ...(draft.minSize?.width == null ? {} : { width: draft.minSize.width }),
      ...(draft.minSize?.height == null ? {} : { height: draft.minSize.height }),
    };
  } else {
    delete base.minSize;
  }

  delete base.width;
  delete base.height;
  delete base.minWidth;
  delete base.maxWidth;
  delete base.minHeight;
  delete base.maxHeight;

  if (draft.zIndex != null) {
    base.zIndex = draft.zIndex;
  } else {
    delete base.zIndex;
  }

  // The draft Background carries the Picker's delivery projection so the Editor can draw the current
  // crop; stored content must not, or a focal change would leave a stale revision behind.
  const surface = readPhiSurface(draft.surface);
  if (surface != null) {
    base.surface = stripPhiResolvedAssetProjections(surface);
  } else {
    delete base.surface;
  }

  return base;
}
