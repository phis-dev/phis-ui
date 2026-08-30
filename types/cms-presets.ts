import type { CSSProperties } from "react";

import type { PhiCmsContentWidgetNode, PhiCmsLayoutNode } from "./cms";
import type { PhiCmsInstanceId } from "./cms-instance-id";
import type { PhiCmsContainerChromeConfig } from "./cms-container";
import type {
  PhiRenderableBlockEffects,
  PhiRenderableBlockSize,
  PhiRenderableBlockVisibility,
} from "./renderable-block";
import type { PhiCssLength } from "./length";
import type { PhiShadow } from "./layout-style";

export type PhiCmsAreaKey =
  | "public"
  | "app"
  | "admin"
  | "builder"
  | "editor"
  | "accounting";

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
  borderRadius?: CSSProperties["borderRadius"];
  visibility?: PhiRenderableBlockVisibility;
  enabled?: boolean;
  mode?: "light" | "dark";
  sticky?: boolean;
  fullHeight?: boolean;
  collapsible?: boolean;
  flags?: number;
  collapsedWidth?: CSSProperties["width"];
  collapseIcon?: string;
  centered?: boolean;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
  size?: PhiRenderableBlockSize;
  minSize?: PhiRenderableBlockSize;
  maxSize?: PhiRenderableBlockSize;
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
  background?: string;
  shadow?: PhiShadow;
  border?: boolean | CSSProperties["border"];
  borderRadius?: number | string;
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
