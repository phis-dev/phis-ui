import type { PhiRuntimeModuleId } from "./cms-plugins";
import type { PhiCmsInstanceId } from "./cms-instance-id";
import type { PhiCmsPresetSource } from "./cms-module-descriptors";
import type { PhiViewerAccessPolicy } from "./access";
import type { PhiCmsOverlayType, PhiOverlayFooterPresentation } from "./cms-overlay";

export type PhiCmsNodeBase = {
  id: PhiCmsInstanceId;
  siteId: number;
  widgetType: string;
  slotIndex: number;
  sortOrder: number;
  status: number;
  flags: number;
  visibilityMask: number;
  label: string | null;
  config: Record<string, unknown>;
};

export type PhiCmsPageNode = {
  id: number;
  siteId: number;
  areaMask: number;
  path: string;
  pageType: number;
  status: number;
  flags: number;
  visibilityMask: number;
  accessPolicy: PhiViewerAccessPolicy;
  titleMsgId: number | null;
  descriptionMsgId: number | null;
  heroRootLayoutNodeId: PhiCmsInstanceId | null;
  headerBottomRootLayoutNodeId: PhiCmsInstanceId | null;
  siderRightRootLayoutNodeId: PhiCmsInstanceId | null;
  footerTopRootLayoutNodeId: PhiCmsInstanceId | null;
  drawerRightRootLayoutNodeId: PhiCmsInstanceId | null;
  contentRootLayoutNodeId: PhiCmsInstanceId | null;
  layoutConfig: Record<string, unknown>;
};

export type PhiCmsPageRedirectTarget = {
  area: "public" | "app" | "admin" | "builder" | "editor" | "accounting";
  path: string;
};

export type PhiCmsPageRedirectConfig = {
  target: PhiCmsPageRedirectTarget;
  status?: 301 | 302 | 307 | 308;
};

export type PhiCmsRegionNode = {
  id: number;
  pageId: number;
  areaPresetId?: number | null;
  regionType: number;
  rootLayoutNodeId: PhiCmsInstanceId;
  status: number;
  flags: number;
  visibilityMask: number;
  sortOrder: number;
  config: Record<string, unknown>;
};

type PhiCmsOverlayNodeBase = {
  id: PhiCmsInstanceId;
  overlayType: PhiCmsOverlayType;
  headerLayoutNodeId: PhiCmsInstanceId | null;
  bodyLayoutNodeId: PhiCmsInstanceId;
  status: number;
  flags: number;
  visibilityMask: number;
  sortOrder: number;
  label: string | null;
  config: Record<string, unknown>;
};

export type PhiCmsOverlayNode = PhiCmsOverlayNodeBase & (
  | {
      footerPresentation: Extract<PhiOverlayFooterPresentation, "none">;
      footerLayoutNodeId: null;
    }
  | {
      footerPresentation: Exclude<PhiOverlayFooterPresentation, "none">;
      footerLayoutNodeId: PhiCmsInstanceId;
    }
);

export type PhiCmsLayoutNode = PhiCmsNodeBase & {
  parentLayoutNodeId: PhiCmsInstanceId | null;
};

export type PhiCmsResolvedContentTextField = {
  msgId: number;
  source: string;
  value: string;
};

export type PhiCmsResolvedPageMetaField = {
  msgId: number;
  source: string;
  value: string;
};

export type PhiCmsResolvedPageMeta = {
  title: PhiCmsResolvedPageMetaField | null;
  description: PhiCmsResolvedPageMetaField | null;
};

export type PhiCmsResolvedContent = {
  id: number;
  type: number;
  slug: string;
  assetId: number | null;
  currentVersionId: number | null;
  publishedVersionId: number | null;
  status: number;
  meta: Record<string, unknown>;
  textFields: Record<string, PhiCmsResolvedContentTextField>;
};

export type PhiCmsContentWidgetNode = PhiCmsNodeBase & {
  parentLayoutNodeId: PhiCmsInstanceId;
  contentId: number | null;
  resolvedContent?: PhiCmsResolvedContent | null;
};

export type PhiResolvedCmsPageTree = {
  page: PhiCmsPageNode;
  pageMeta?: PhiCmsResolvedPageMeta | null;
  runtimeModuleIds?: PhiRuntimeModuleId[] | null;
  regions: PhiCmsRegionNode[];
  overlays: PhiCmsOverlayNode[];
  layoutNodes: PhiCmsLayoutNode[];
  contentWidgets: PhiCmsContentWidgetNode[];
};

export type PhiResolvedCmsRenderableTree = Pick<
  PhiResolvedCmsPageTree,
  "regions" | "overlays" | "layoutNodes" | "contentWidgets"
> & {
  page?: PhiCmsPageNode | null;
};

export type PhiResolvedCmsPagePayload = {
  areaMask: number;
  path: string;
  sourcePreset: PhiCmsPresetSource | null;
  page: PhiResolvedCmsPageTree;
};

export type PhiCmsAreaPresetNode = {
  id: number;
  siteId: number;
  areaMask: number;
  status: number;
  flags: number;
  visibilityMask: number;
  config: Record<string, unknown>;
};

export type PhiResolvedCmsAreaPresetTree = {
  preset: PhiCmsAreaPresetNode;
  runtimeModuleIds?: PhiRuntimeModuleId[] | null;
  regions: PhiCmsRegionNode[];
  overlays: PhiCmsOverlayNode[];
  layoutNodes: PhiCmsLayoutNode[];
  contentWidgets: PhiCmsContentWidgetNode[];
};

export type PhiResolvedCmsAreaPresetPayload = {
  areaMask: number;
  sourcePreset: PhiCmsPresetSource;
  preset: PhiResolvedCmsAreaPresetTree;
};

export type PhiCmsLayoutRenderNode = PhiCmsLayoutNode & {
  childLayouts: PhiCmsLayoutRenderNode[];
  childWidgets: PhiCmsContentWidgetNode[];
  resolvedSlotTitles?: string[];
};
