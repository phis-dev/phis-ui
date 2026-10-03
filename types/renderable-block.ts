import type { PhiMotionEasing } from "../helpers/motion";
import type { CSSProperties } from "react";
import type { PhiCmsInstanceId } from "./cms-instance-id";
import type { PhiViewerAccessPolicy, PhiViewportFlags } from "./access";
import type { PhiShadow, PhiLayoutEffectId } from "./layout-style";
import type { PhiResponsiveValue } from "./responsive";
import type { PhiSurface } from "./surface";

export type PhiRenderableBlockRenderMode = "live" | "preview" | "editor";

export type PhiRenderableBlockVisibility = "hidden" | "collapsed" | "visible";

/**
 * A pair of lengths, plain: what a Signal sets and what the dimension Control edits.
 *
 * It stays plain on purpose. A Signal names a length, not a profile, and setting one replaces that axis
 * wherever the block stated it.
 */
export type PhiRenderableBlockSize = {
  width?: number | string | null;
  height?: number | string | null;
};

/**
 * One length, at one profile or at all of them.
 *
 * The profile sits on the leaf rather than on the field. The alternative --
 * `PhiResponsiveValue<PhiRenderableBlockSize>` -- makes an author restate a height that never changes
 * and turns the field into a union of two object shapes that have to be told apart by their keys. On
 * the leaf, every stored config stays valid and means "the same at every profile", and the axis stays
 * the unit an author thinks in: usually exactly one of the two varies.
 *
 * `PhiResponsiveValue` is the house form, the one the Grid already uses for `span` and `offset`, with
 * the same smaller-to-larger cascade: `compact` is the base, `medium` falls back to it, `wide` to
 * `medium`. Designed in design/RESPONSIVE_BLOCK_GEOMETRY.md.
 */
export type PhiResponsiveLength = number | string | PhiResponsiveValue<number | string> | null;

/** The same pair as a block stores it, where each axis may name a value per profile. */
export type PhiRenderableBlockResponsiveSize = {
  width?: PhiResponsiveLength;
  height?: PhiResponsiveLength;
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

/** Kept as a name because the effects vocabulary is written in it; the list itself is motion's. */
export type PhiRenderableBlockTransitionEasing = PhiMotionEasing;

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
  /*
   * When the page has finished arriving: the document is parsed, so every Widget whose content the
   * server streamed in its own segment stands where it belongs. A Block waiting for this is held at the
   * start of its entrance until then, and what settles into place while it waits settles unseen.
   */
  | "on_ready"
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
  /** What the block's box looks like: ground, edge, depth, and the mode its content takes. */
  surface?: PhiSurface;
  className?: string;
  size?: PhiRenderableBlockResponsiveSize;
  minSize?: PhiRenderableBlockResponsiveSize;
  maxSize?: PhiRenderableBlockResponsiveSize;
  /** Plain: a collapsed block is not laid out, so one substitute measurement is enough. */
  collapsedSizeHint?: PhiRenderableBlockSize;
  effects?: PhiRenderableBlockEffects;
};

export type PhiRenderableBlock = PhiRenderableBlockBase & {
  capabilities?: PhiRenderableBlockCapabilities;
  runtime?: PhiRenderableBlockRuntime;
};
