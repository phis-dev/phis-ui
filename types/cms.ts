import type { PhiRuntimeControllerSetting, PhiRuntimeModuleId } from "./cms-plugins";
import type { PhiCmsAreaKey } from "@phis/contracts/cms";
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
  area: PhiCmsAreaKey;
  path: string;
};

export type PhiCmsPageRedirectConfig = {
  target: PhiCmsPageRedirectTarget;
  status: 301 | 302 | 307 | 308;
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
  /** The version read -- published or current, as the tree was read; `assetId`, `meta` and `textFields` are its. */
  versionId: number;
  assetId: number | null;
  status: number;
  meta: Record<string, unknown>;
  textFields: Record<string, PhiCmsResolvedContentTextField>;
};

export type PhiCmsContentWidgetNode = PhiCmsNodeBase & {
  parentLayoutNodeId: PhiCmsInstanceId;
  /**
   * The current version of the Widget's bound content, as the tree was read: the base a structure save
   * hands back, so that phi-server can tell an edit from a stale copy (phis-server CONTENT.md). `null`
   * for a Widget without content. Its presence is also what tells a Widget node from a Layout node.
   */
  contentVersionId: number | null;
  /**
   * The field of the Widget's config that is its content, as the tree was stored or read. A save in a
   * Canvas derives it afresh from the Widget's definition; a save outside one carries this.
   */
  contentBinding?: import("./cms-plugins").PhiCmsWidgetContentBinding | null;
  /**
   * The bound content in the stage the tree was read for: published on the live Site, current in the
   * Builder, the Editor and previews. A Widget the Site created whose content was never published has
   * none, and shows nothing there.
   */
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
  controllerSettings?: PhiCmsTreeControllerSettings | null;
};

/**
 * The Controllers a tree configures, and what it tells them -- the same field on a Page and on an Area.
 *
 * A Controller's receivers are the tree's to name, as every Widget's are, so the tree says them here
 * beside the routes it writes for its nodes; a Controller that held Widget ids instead (a preset id
 * map) only worked while one piece of code owned both ends. Each setting carries the tree's own scope
 * as `mountScope` and is keyed by type and instance.
 *
 * Who runs the Controller is still its mount policy's answer
 * (`components/runtime/runtime-controller-materialization.ts`): a setting for a `demand` Controller
 * mounts it in the tree's scope; one for a Controller the Area already runs configures that one while
 * the Page is shown; and one whose only asker is a deferred Area Overlay arrives with that Overlay.
 * phis-server stores the field on every Page and Area revision (DB.md) and refuses `enabled`: a
 * setting a tree stores is one it means.
 */
export type PhiCmsTreeControllerSettings = readonly PhiRuntimeControllerSetting[];

export type PhiResolvedCmsRenderableTree = Pick<
  PhiResolvedCmsPageTree,
  "regions" | "overlays" | "layoutNodes" | "contentWidgets" | "controllerSettings"
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
  controllerSettings?: PhiCmsTreeControllerSettings | null;
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
