import type { CSSProperties } from "react";
import type { PhiCmsInstanceId } from "./cms-instance-id";
import type { PhiViewerAccessPolicy, PhiViewportFlags } from "./access";
import type { PhiShadow, PhiLayoutEffectId } from "./layout-style";

export type PhiRenderableBlockRenderMode = "live" | "preview" | "editor";

export type PhiRenderableBlockVisibility = "hidden" | "collapsed" | "visible";

export type PhiRenderableBlockSize = {
  width?: number | string | null;
  height?: number | string | null;
};

export type PhiRenderableBlockAnchorHorizontal = "left" | "center" | "right";

export type PhiRenderableBlockAnchorVertical = "top" | "middle" | "bottom";

export type PhiRenderableBlockAnchor = {
  horizontal?: PhiRenderableBlockAnchorHorizontal;
  vertical?: PhiRenderableBlockAnchorVertical;
};

export type PhiRenderableBlockTransitionType =
  | "fade"
  | "slide"
  | "flip"
  | "rotate"
  | "scale";

export type PhiRenderableBlockTransitionMode = "in" | "out";

export type PhiRenderableBlockTransitionDirection =
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"
  | "top-left";

export type PhiRenderableBlockTransitionEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out";

export type PhiRenderableBlockTransitionAxis = "x" | "y" | "z";

export type PhiRenderableBlockTransitionOrigin =
  | "top left"
  | "top center"
  | "top right"
  | "center left"
  | "center"
  | "center right"
  | "bottom left"
  | "bottom center"
  | "bottom right";

export type PhiRenderableBlockTransitionTrigger =
  | "on_mount"
  | "on_visible"
  | "on_hover"
  | "on_focus"
  | "manual";

export type PhiRenderableBlockViewportEffectAxis = "x" | "y";

export type PhiRenderableBlockViewportEffectProperty =
  | "translate"
  | "opacity"
  | "rotate"
  | "scale";

export type PhiRenderableBlockViewportEffectRangePoint =
  | "enter"
  | "center"
  | "exit";

export type PhiRenderableBlockViewportEffectUnit =
  | "px"
  | "%"
  | "deg"
  | "";

export type PhiRenderableBlockTransition = {
  type?: PhiRenderableBlockTransitionType | null;
  mode?: PhiRenderableBlockTransitionMode | null;
  axis?: PhiRenderableBlockTransitionAxis | null;
  direction?: PhiRenderableBlockTransitionDirection | null;
  distance?: number | string | null;
  angleDeg?: number | null;
  scale?: number | null;
  origin?: PhiRenderableBlockTransitionOrigin | null;
  originOffsetX?: number | string | null;
  originOffsetY?: number | string | null;
  perspectivePx?: number | null;
  durationMs?: number | null;
  delayMs?: number | null;
  easing?: PhiRenderableBlockTransitionEasing | null;
};

export type PhiRenderableBlockViewportEffect = {
  axis?: PhiRenderableBlockViewportEffectAxis | null;
  property?: PhiRenderableBlockViewportEffectProperty | null;
  from?: number | null;
  to?: number | null;
  unit?: PhiRenderableBlockViewportEffectUnit | null;
  rangeStart?: PhiRenderableBlockViewportEffectRangePoint | number | null;
  rangeEnd?: PhiRenderableBlockViewportEffectRangePoint | number | null;
  easing?: PhiRenderableBlockTransitionEasing | null;
  clamp?: boolean | null;
};

export type PhiRenderableBlockEffects = {
  opacity?: number | null;
  transitionTrigger?: PhiRenderableBlockTransitionTrigger | null;
  transitionOnce?: boolean | null;
  transitions?: PhiRenderableBlockTransition[] | null;
  viewportEffects?: PhiRenderableBlockViewportEffect[] | null;
};

export type PhiRenderableBlockCapabilityKey =
  | "selectable"
  | "draggable"
  | "hoverable"
  | "activatable"
  | "focusable"
  | "droppable";

export type PhiRenderableBlockCapabilities = Partial<Record<PhiRenderableBlockCapabilityKey, boolean>>;

export type PhiRenderableBlockRuntimeContext = {
  siteKey?: string | null;
  publicUrl?: string | null;
  defaultLang?: string | null;
  area?: string | null;
  pageKey?: string | null;
  regionKey?: string | null;
  blockId?: PhiCmsInstanceId | null;
};

export type PhiRenderableBlockInteractionState = {
  selected?: boolean;
  hovered?: boolean;
  dragging?: boolean;
  focused?: boolean;
  active?: boolean;
};

export type PhiRenderableBlockRuntime = PhiRenderableBlockRuntimeContext & PhiRenderableBlockInteractionState;

export type PhiRenderableBlockBase = {
  renderMode?: PhiRenderableBlockRenderMode;
  visibility?: PhiRenderableBlockVisibility;
  accessPolicy?: PhiViewerAccessPolicy;
  viewportFlags?: PhiViewportFlags;
  enabled?: boolean;
  debugMode?: boolean;
  anchor?: PhiRenderableBlockAnchor;
  zIndex?: number;
  opacity?: number;
  background?: CSSProperties["background"] | Record<string, unknown> | null;
  border?: CSSProperties["border"] | Record<string, unknown> | null;
  effect?: PhiLayoutEffectId;
  shadow?: PhiShadow;
  className?: string;
  size?: PhiRenderableBlockSize;
  minSize?: PhiRenderableBlockSize;
  maxSize?: PhiRenderableBlockSize;
  collapsedSizeHint?: PhiRenderableBlockSize;
  effects?: PhiRenderableBlockEffects;
};

export type PhiRenderableBlock = PhiRenderableBlockBase & {
  capabilities?: PhiRenderableBlockCapabilities;
  runtime?: PhiRenderableBlockRuntime;
};
