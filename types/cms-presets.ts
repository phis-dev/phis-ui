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
import type { PhiLinkTarget } from "./references";

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
  /** Which of the Area's Pages show this Shell Region (`helpers/region-page-scope.ts`). */
  pageScope?: PhiCmsRegionPageScope;
  /** How `header_top` comes into view (`helpers/region-page-scope.ts`); every other Region ignores it. */
  reveal?: PhiCmsRegionReveal;
};

/**
 * Which Pages a Shell Region stands on (SHELL.md "Region visibility per Page").
 *
 * `all` is every Page of the Area, `root` the Area's own `/`. `include` and `exclude` name `entries`:
 *
 * - a Page, by its reference under `pageLinkTarget` -- never by its path, which an author may change at
 *   any time. The `*LinkTarget` key is what lets the reference index see it (REFERENCES.md). With
 *   `PhiCmsRegionPageScopeEntryFlag.Subtree` it stands for the Pages below it as well, which only a
 *   Module Page can have.
 * - a folder, by its path inside the Area. A folder is not a Page and has no identity of its own -- it is
 *   the shared start of its Pages' paths -- so the path is all there is to name it by, and it takes
 *   everything below it, including Pages added later.
 */
export const PHI_CMS_REGION_PAGE_SCOPE_MODES = ["all", "root", "include", "exclude"] as const;
export type PhiCmsRegionPageScopeMode = (typeof PHI_CMS_REGION_PAGE_SCOPE_MODES)[number];

export const PhiCmsRegionPageScopeEntryFlag = {
  Subtree: 1 << 0,
} as const;

export type PhiCmsRegionPageScopeEntry =
  | { pageLinkTarget: PhiLinkTarget; flags?: number }
  | { folder: string };

export type PhiCmsRegionPageScope = {
  mode: PhiCmsRegionPageScopeMode;
  entries?: PhiCmsRegionPageScopeEntry[];
};

/**
 * A Page scope as the browser asks it: every entry turned into an address inside the Area. The server
 * resolves the references for each render; the browser compares the visitor's path against the result.
 */
export type PhiCmsResolvedRegionPageScope =
  | { mode: "root" }
  | { mode: "include" | "exclude"; paths: string[]; prefixes: string[] };

/**
 * How a Region comes into view: `always` stands where it is, `hover` stays out of sight until the pointer
 * reaches the top edge, `scroll-up` leaves while the visitor reads down and returns as soon as they
 * scroll back.
 */
export const PHI_CMS_REGION_REVEAL_MODES = ["always", "hover", "scroll-up"] as const;
export type PhiCmsRegionReveal = (typeof PHI_CMS_REGION_REVEAL_MODES)[number];

export type PhiCmsLayoutConfig = PhiCmsLayerConfig & {
  gap?: number | string;
  padding?: number | string;
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
