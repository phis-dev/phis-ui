import type { CSSProperties } from "react";

import type { PhiCmsContentWidgetNode, PhiCmsLayoutNode } from "./cms";
import type { PhiCmsInstanceId } from "./cms-instance-id";
import type { PhiCmsContainerChromeConfig } from "./cms-container";
import type {
  PhiRenderableBlockEffects,
  PhiRenderableBlockResponsiveSize,
  PhiRenderableBlockSize,
  PhiRenderableBlockVisibility,
} from "./renderable-block";
import type { PhiCssLength } from "./length";

// The Area names are the contract's (`PHI_CMS_AREA_KEYS`); a copy here would be a seventh place to add one.
import type { PhiCmsAreaKey } from "@phis/contracts/cms";

export type { PhiCmsAreaKey };

export type PhiCmsRegionKey =
  | "header_top"
  | "header_main"
  | "header_bottom"
  | "sider_left"
  | "sider_right"
  | "hero"
  | "content"
  | "footer_top"
  | "footer_main"
  | "footer_bottom"
  | "drawer_left"
  | "drawer_right";

export type PhiCmsRegionSource = "preset" | "fallback" | "page_override";

export type PhiCmsLayerConfig = Record<string, unknown> & {
  zIndex?: number;
};

export type PhiCmsRegionConfig = Record<string, unknown> & PhiCmsContainerChromeConfig & {
  visibility?: PhiRenderableBlockVisibility;
  /**
   * The block runtime's live answer, merged in by the client renderer for the shell resolver; a stored
   * config never states it (BUILDER.md, renderable blocks).
   */
  enabled?: boolean;
  mode?: "light" | "dark";
  /**
   * The Region's behaviour as `PhiCmsFlags` bits: `Sticky`, `FullHeight`, `Collapsible`, and `Collapsed`
   * for the Builder preview. Read with `hasPhiFlag`; a Region stored on a Page has no row of its own, so
   * its behaviour lives here and not on a row's `flags`.
   */
  flags?: number;
  collapsedWidth?: CSSProperties["width"];
  collapseIcon?: string;
  size?: PhiRenderableBlockResponsiveSize;
  minSize?: PhiRenderableBlockResponsiveSize;
  maxSize?: PhiRenderableBlockResponsiveSize;
  collapsedSizeHint?: PhiRenderableBlockSize;
  opacity?: number;
  effects?: PhiRenderableBlockEffects;
  fontSize?: CSSProperties["fontSize"];
  lineHeight?: CSSProperties["lineHeight"];
  offsetTop?: PhiCssLength;
  zIndex?: number;
};

export type PhiCmsLayoutConfig = PhiCmsLayerConfig & {
  gap?: number | string;
  padding?: number | string;
  paddingInline?: number | string;
  paddingBlock?: number | string;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean | CSSProperties["flexWrap"];
};

export type PhiCmsRegionSlotDefinition = {
  key: string;
  label?: string;
  multiple?: boolean;
  required?: boolean;
  maxItems?: number;
};

export type PhiCmsRegionSlotInjection = {
  regionKey: PhiCmsRegionKey;
  slotKey: string;
  layoutNodes: PhiCmsLayoutNode[];
  contentWidgets: PhiCmsContentWidgetNode[];
};

export type PhiCmsResolvedRegion = {
  key: PhiCmsRegionKey;
  status: number;
  flags: number;
  visibilityMask: number;
  sortOrder: number;
  config: PhiCmsRegionConfig;
  rootLayoutNodeId: PhiCmsInstanceId | null;
  rootLayoutNode?: PhiCmsLayoutNode | null;
  source: PhiCmsRegionSource;
  allowedPageSlotInjections: PhiCmsRegionSlotDefinition[];
};

export type PhiCmsAreaPreset = {
  area: PhiCmsAreaKey;
  label?: string;
  flags?: number;
  visibilityMask?: number;
  config?: Record<string, unknown>;
  regions: PhiCmsResolvedRegion[];
};
