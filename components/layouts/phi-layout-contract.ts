import type { CSSProperties, ReactNode } from "react";

import { PhiCmsFlags } from "../../constants/phi-cms";
import {
  resolvePhiAnchorWidgetPlacement,
  type PhiAnchorWidgetPlacement,
} from "../controls/phi-anchor-control-contract";
import type {
  PhiRenderableBlockRenderMode,
  PhiRenderableBlockAnchor,
  PhiRenderableBlockResponsiveSize,
  PhiRenderableBlockSize,
} from "../../types";
import type { PhiShadow, PhiLayoutEffectId } from "../../types/layout-style";
import { resolvePhiCmsBorderSource, type PhiCmsBorderSource } from "../../types/cms-config";
import {
  resolvePhiRenderableBlockGeometry,
  type PhiRenderableBlockGeometryInput,
} from "../../types/renderable-block-geometry";
import { PHI_THEME_BORDER_LINE } from "../../helpers/border-widget-style";

export type PhiLayoutProps = {
  size?: PhiRenderableBlockResponsiveSize;
  minSize?: PhiRenderableBlockResponsiveSize;
  maxSize?: PhiRenderableBlockResponsiveSize;
  collapsedSizeHint?: PhiRenderableBlockSize;
  renderMode?: PhiRenderableBlockRenderMode;
  layoutKind?: PhiLayoutKind;
  enabled?: boolean;
  zIndex?: number;
  opacity?: number;
  effect?: PhiLayoutEffectId;
  shadow?: PhiShadow | null;
  flags?: number;
  initialSlotStates?: PhiBaseLayoutSlotStates;
  editRenderInsertControl?: PhiLayoutEditRenderInsertControl;
  editRenderTitleControl?: PhiLayoutEditRenderTitleControl;
  padding?: CSSProperties["padding"];
  paddingTop?: CSSProperties["paddingTop"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingBottom?: CSSProperties["paddingBottom"];
  paddingLeft?: CSSProperties["paddingLeft"];
  background?: CSSProperties["background"];
  backgroundLayer?: ReactNode;
  borderSource?: PhiCmsBorderSource;
  border?: CSSProperties["border"];
  borderRadius?: CSSProperties["borderRadius"];
};

export type PhiLayoutEditInsertControl = {
  key?: string;
  presentation: "inline" | "overlay";
  slotIndex: number;
  label?: ReactNode;
  ariaLabel?: string;
  anchor?: PhiAnchorWidgetPlacement | null;
  slotRole?: "left" | "middle" | "right";
  inset?: {
    top?: CSSProperties["top"];
    right?: CSSProperties["right"];
    bottom?: CSSProperties["bottom"];
    left?: CSSProperties["left"];
  };
  onInsert: (slotIndex: number) => void;
};

export type PhiLayoutEditRenderInsertControl = (
  control: PhiLayoutEditInsertControl,
) => ReactNode;

export type PhiLayoutEditTitleControl = {
  value: string;
  ariaLabel?: string;
  style?: CSSProperties;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

export type PhiLayoutEditRenderTitleControl = (
  control: PhiLayoutEditTitleControl,
) => ReactNode;

export type PhiLayoutKind =
  | "flex"
  | "stack"
  | "carousel"
  | "grid"
  | "split"
  | "threecol"
  | "masonry"
  | "content"
  | "verticalflex"
  | "collapsible";
export type PhiLayoutSlotPolicy = "fill" | "hug" | "fill-inline" | "fill-block" | "fixed" | "intrinsic";

export const PhiLayoutFlags = PhiCmsFlags;

export type PhiLayoutFlag = (typeof PhiLayoutFlags)[keyof typeof PhiLayoutFlags];

export type PhiBaseLayoutSlotState = "expanded" | "collapsed" | "hidden";

export type PhiBaseLayoutSlotStates =
  | Array<PhiBaseLayoutSlotState | null | undefined>
  | Record<number, PhiBaseLayoutSlotState | null | undefined>;

export function hasPhiLayoutFlag(flags: number | null | undefined, flag: PhiLayoutFlag) {
  return ((flags ?? 0) & flag) === flag;
}

export function normalizePhiCssSize(value: number | string | undefined) {
  if (typeof value === "number") {
    return `${value}px`;
  }

  return value;
}

/**
 * A Layout's own inner box: what the block states, and nothing else.
 *
 * An absent size is not this box's question. The box stands inside the slot child frame, the frame
 * carries the child's size policy, and `styles/layout.css` fills this box from there -- width through
 * `.phi-slot-child--inline-fill > *`, height through `.phi-slot-child--block-fill > .phi-layout`. A
 * `100%` written here as well said the same thing a second time in the common case and the wrong thing
 * in the others: under `fill-inline` the frame is `height: fit-content`, and a percentage height
 * against it is dropped by the browser rather than obeyed. Whoever renders a Layout outside a frame
 * states the fill in CSS where that frame's job is being done instead (the Builder's edit scaffold
 * drawer, `styles/layout-authoring-scaffold.css`).
 */
export function resolvePhiLayoutBoxStyle({
  size,
  minSize,
  maxSize,
  collapsedSizeHint,
  visibility,
}: PhiRenderableBlockGeometryInput): CSSProperties {
  const geometry = resolvePhiRenderableBlockGeometry({ size, minSize, maxSize, collapsedSizeHint, visibility });

  return {
    ...(geometry.inline.size == null ? {} : { width: geometry.inline.size.css }),
    ...(geometry.block.size == null ? {} : { height: geometry.block.size.css }),
    ...(geometry.inline.min == null ? {} : { minWidth: geometry.inline.min.css }),
    ...(geometry.inline.max == null ? {} : { maxWidth: geometry.inline.max.css }),
    ...(geometry.block.min == null ? {} : { minHeight: geometry.block.min.css }),
    ...(geometry.block.max == null ? {} : { maxHeight: geometry.block.max.css }),
  };
}

/**
 * The Site's answer for a Layout that states no corner of its own; see `resolvePhiLayoutStyle`.
 *
 * Exported because a Layout's box is not the only surface a Layout draws: the Split Card draws two, one
 * per slot, and they answer the same question with the same value.
 */
export const PHI_LAYOUT_SURFACE_RADIUS = "var(--phi-surface-radius, 0)";

export function resolvePhiLayoutStyle({
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  background,
  borderSource,
  border,
  borderRadius,
}: Pick<
  PhiLayoutProps,
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "background"
  | "borderSource"
  | "border"
  | "borderRadius"
>): CSSProperties {

  /*
   * Where the outline comes from, asked before anything about what it looks like.
   *
   * `theme` is the Site's own line -- the border colour and the line width it already states -- so a
   * Layout can take the house style without anybody typing a colour into it, and it moves when the
   * Theme moves. `custom` is the configured line, and the one source that reads a configured corner.
   * `none` draws nothing, and is what a Layout that was never asked says now that "no line" and
   * "nobody said" are two different answers.
   */
  const resolvedBorderSource = resolvePhiCmsBorderSource(borderSource, border);
  const resolvedBorderRadius = resolvedBorderSource === "custom"
    ? normalizePhiCssSize(borderRadius)
    : null;

  return {
    ...(background == null ? {} : { background }),
    ...(resolvedBorderSource === "theme"
      ? { border: PHI_THEME_BORDER_LINE }
      : resolvedBorderSource === "custom" && border != null
        ? { border }
        : {}),
    /*
     * A Layout is a surface, so an author who said nothing about its corner gets the Site's answer to
     * that question -- and so does one who said something but is no longer asking for it: a corner is
     * the author's only under `custom`, which is the one state where the fields that set it are even
     * shown. Switching to `theme` or `none` therefore shows the shape at once, square or capsule,
     * instead of keeping the radii of a border that is no longer being drawn.
     *
     * The rest of that question -- the same step a Table and a Tree take, carried on the root as
     * `--phi-surface-radius` (THEME.md, "Control shape"). An author who did say something keeps it: the
     * step answers silence, it does not cap anybody.
     *
     * The fallback is `0` rather than a token, because that is what this returned before there was a
     * step to take, and a Layout rendered outside the Provider should not start rounding on its own.
     *
     * Four corners rather than the shorthand, and only in this branch. A Widget states a single corner
     * as a longhand (`borderTopLeftRadius`), and React refuses to have a shorthand standing beside a
     * longhand it may have to remove on the next render -- which is what a shorthand written on every
     * Layout, configured or not, created. Where the author DID state a radius the shorthand stays: it
     * is their one value, and it was already the only thing on the box.
     */
    ...(resolvedBorderRadius == null
      ? {
        borderTopLeftRadius: PHI_LAYOUT_SURFACE_RADIUS,
        borderTopRightRadius: PHI_LAYOUT_SURFACE_RADIUS,
        borderBottomRightRadius: PHI_LAYOUT_SURFACE_RADIUS,
        borderBottomLeftRadius: PHI_LAYOUT_SURFACE_RADIUS,
      }
      : { borderRadius: resolvedBorderRadius }),
    ...resolvePhiPaddingStyle({ padding, paddingTop, paddingRight, paddingBottom, paddingLeft }),
  };
}

export function resolvePhiPaddingStyle({
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
}: Pick<
  PhiLayoutProps,
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
>): CSSProperties {
  const resolvedPadding = normalizePhiCssSize(padding);

  return {
    ...(resolvedPadding == null
      ? {}
      : {
          paddingTop: resolvedPadding,
          paddingRight: resolvedPadding,
          paddingBottom: resolvedPadding,
          paddingLeft: resolvedPadding,
        }),
    ...(paddingTop == null ? {} : { paddingTop: normalizePhiCssSize(paddingTop) }),
    ...(paddingRight == null ? {} : { paddingRight: normalizePhiCssSize(paddingRight) }),
    ...(paddingBottom == null ? {} : { paddingBottom: normalizePhiCssSize(paddingBottom) }),
    ...(paddingLeft == null ? {} : { paddingLeft: normalizePhiCssSize(paddingLeft) }),
  };
}

export function resolvePhiLayoutInset({
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
}: Pick<
  PhiLayoutProps,
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
>): Pick<CSSProperties, "top" | "right" | "bottom" | "left"> {
  const resolvedPadding = normalizePhiCssSize(padding);

  return {
    top: paddingTop == null ? resolvedPadding ?? 0 : normalizePhiCssSize(paddingTop) ?? 0,
    right: paddingRight == null ? resolvedPadding ?? 0 : normalizePhiCssSize(paddingRight) ?? 0,
    bottom: paddingBottom == null ? resolvedPadding ?? 0 : normalizePhiCssSize(paddingBottom) ?? 0,
    left: paddingLeft == null ? resolvedPadding ?? 0 : normalizePhiCssSize(paddingLeft) ?? 0,
  };
}

export function resolvePhiAnchorPlacement(
  anchor?: PhiRenderableBlockAnchor | null,
): PhiAnchorWidgetPlacement | null {
  return resolvePhiAnchorWidgetPlacement(anchor);
}

/**
 * The anchor a Layout draws with: the one it was given, else the one its kind declares.
 *
 * A Layout kind states how its slots sit when nobody has said otherwise -- a Flex Vertical centres its
 * column and starts at the top, a Flex runs from the left at middle height. That declaration reached
 * the picker and the Inspector and stopped there: the drawing asked the config alone, found nothing,
 * and fell to "no anchor", which stretches. So the default a kind announced was never the default it
 * drew with.
 *
 * A kind that declares none keeps "no anchor", rather than being given the centre by a resolver that
 * treats missing parts as centred. Not stating a default and defaulting to the middle are different
 * things, and eight of the twelve kinds state none.
 */
export function resolvePhiLayoutAnchor(
  anchor?: PhiRenderableBlockAnchor | null,
  defaultAnchor?: PhiRenderableBlockAnchor | null,
): PhiAnchorWidgetPlacement | null {
  const effective = anchor ?? defaultAnchor;
  return effective ? resolvePhiAnchorWidgetPlacement(effective) : null;
}

/**
 * Where an anchor puts a child, on one axis, before anybody has spelled it.
 *
 * Every Layout asked this question in its own words -- Flex in `flex-start`, Grid in `start`, the
 * three-column client and the anchored overlay each with a hand-written ladder of the nine placements
 * -- and the four answers differed in three ways that are real (the spelling, which axis is the main
 * one, and a slot role that overrides or mirrors an axis) and in one that is not: what an unstated
 * axis means. `null` is that case, kept apart from `center` so a caller can answer it for itself
 * rather than be handed a middle it never asked for.
 */
export type PhiAxisPlacement = "start" | "center" | "end";

export type PhiPlacement = {
  inline: PhiAxisPlacement | null;
  block: PhiAxisPlacement | null;
};

/**
 * What a slot role does to the inline axis.
 *
 * The outer columns of a three-column Layout do not listen to the anchor at all, and an overlay in the
 * right-hand role reads the anchor mirrored -- its "left" is the row's right. Both were written out as
 * a second ladder beside the first; here they are what they are, a modifier on one axis.
 */
export type PhiPlacementRole = "mirrorInline" | "pinInlineStart" | "pinInlineEnd";

const PHI_PLACEMENT_BY_ANCHOR: Record<PhiAnchorWidgetPlacement, PhiPlacement> = {
  topLeft: { inline: "start", block: "start" },
  top: { inline: "center", block: "start" },
  topRight: { inline: "end", block: "start" },
  left: { inline: "start", block: "center" },
  center: { inline: "center", block: "center" },
  right: { inline: "end", block: "center" },
  bottomLeft: { inline: "start", block: "end" },
  bottom: { inline: "center", block: "end" },
  bottomRight: { inline: "end", block: "end" },
};

function mirrorPhiAxisPlacement(placement: PhiAxisPlacement | null): PhiAxisPlacement | null {
  return placement === "start" ? "end" : placement === "end" ? "start" : placement;
}

/**
 * The anchor read once, in both spellings it arrives in.
 *
 * A `PhiRenderableBlockAnchor` still shows which axes were stated, and that is why it is taken as it
 * is rather than through `resolvePhiAnchorWidgetPlacement`: that function answers the nine-word
 * vocabulary, where every axis has a value, so it has to invent `center` for an axis nobody named.
 * The nine words themselves are therefore always fully stated, and only the pair can carry a `null`.
 */
export function resolvePhiPlacement(
  anchor: PhiAnchorWidgetPlacement | PhiRenderableBlockAnchor | null | undefined,
  role?: PhiPlacementRole,
): PhiPlacement {
  const stated: PhiPlacement =
    anchor == null
      ? { inline: null, block: null }
      : typeof anchor === "string"
        ? PHI_PLACEMENT_BY_ANCHOR[anchor]
        : {
            inline:
              anchor.horizontal === "left"
                ? "start"
                : anchor.horizontal === "right"
                  ? "end"
                  : anchor.horizontal === "center"
                    ? "center"
                    : null,
            block:
              anchor.vertical === "top"
                ? "start"
                : anchor.vertical === "bottom"
                  ? "end"
                  : anchor.vertical === "middle"
                    ? "center"
                    : null,
          };

  if (role === "pinInlineStart") {
    return { inline: "start", block: stated.block };
  }

  if (role === "pinInlineEnd") {
    return { inline: "end", block: stated.block };
  }

  if (role === "mirrorInline") {
    return { inline: mirrorPhiAxisPlacement(stated.inline), block: stated.block };
  }

  return stated;
}

/** The flex spelling, and `undefined` where the anchor said nothing, so a caller's own value stands. */
export function phiFlexPlacementWord(placement: PhiAxisPlacement | null) {
  return placement === "start"
    ? "flex-start"
    : placement === "end"
      ? "flex-end"
      : placement === "center"
        ? "center"
        : undefined;
}

/** The grid spelling, and `undefined` where the anchor said nothing. */
export function phiGridPlacementWord(placement: PhiAxisPlacement | null) {
  return placement ?? undefined;
}

/**
 * The custom properties a slot hands its children, so a stretched one can still be placed.
 *
 * Two per axis, not one shorthand. React expands a `marginInline` shorthand into two longhands when it
 * renders on the server and leaves it whole in the browser, so the two trees disagree on an attribute
 * that is never patched up -- a hydration mismatch for a margin that was only ever `auto` or `0`.
 *
 * They were named `cross` while they only ever wrote `margin-inline`, which is the cross axis of a
 * column and the main axis of a row -- the Grid handed its `justify-content` to the same pair. Under
 * that name nobody noticed that one of the two axes had no properties at all, so a row that caps a
 * child's height and anchors it to the bottom could not place it. Named by the axis they write, both
 * exist.
 */
export const PHI_SLOT_INLINE_MARGIN_START_PROPERTY = "--phi-slot-inline-margin-start";
export const PHI_SLOT_INLINE_MARGIN_END_PROPERTY = "--phi-slot-inline-margin-end";
export const PHI_SLOT_BLOCK_MARGIN_START_PROPERTY = "--phi-slot-block-margin-start";
export const PHI_SLOT_BLOCK_MARGIN_END_PROPERTY = "--phi-slot-block-margin-end";

/**
 * The same four, read back by whatever box has the room to be moved.
 *
 * The slot child frame reads them, and for a long time it was the only thing that did. But the frame is
 * not always where the width is decided: a Widget that caps something inside itself -- the Form caps its
 * fields, so that the cap is the measure the fields read rather than the measure of whatever box they
 * are wearing -- leaves its own frame filling the slot edge to edge. An auto margin on a box with no room
 * left over comes to nothing, so the frame is placed and the narrow box inside it still stands at the
 * start edge of a slot that was anchored to the centre.
 *
 * Custom properties inherit, so the inner box reads the answer the slot gave without being handed it,
 * and both boxes may consume it: at most one of them has room, and whichever it is lands where the
 * Layout asked. Exported as the declarations rather than as the names, because a reader that spells them
 * out spells the fallback out too, and a missing `, 0` is an invalid margin that takes the whole rule
 * with it.
 */
export const PHI_SLOT_INLINE_PLACEMENT_MARGIN_STYLE = {
  marginInlineStart: `var(${PHI_SLOT_INLINE_MARGIN_START_PROPERTY}, 0)`,
  marginInlineEnd: `var(${PHI_SLOT_INLINE_MARGIN_END_PROPERTY}, 0)`,
} as const satisfies CSSProperties;

export const PHI_SLOT_BLOCK_PLACEMENT_MARGIN_STYLE = {
  marginBlockStart: `var(${PHI_SLOT_BLOCK_MARGIN_START_PROPERTY}, 0)`,
  marginBlockEnd: `var(${PHI_SLOT_BLOCK_MARGIN_END_PROPERTY}, 0)`,
} as const satisfies CSSProperties;

function phiAxisMargins(placement: PhiAxisPlacement | null) {
  return {
    start: placement === "center" || placement === "end" ? "auto" : "0",
    end: placement === "center" ? "auto" : "0",
  };
}

/**
 * A placement as the four margins that carry it out, for a slot to hand down.
 *
 * An auto margin on the cross axis of a flex line overrides `align-self`, and that is harmless here: a
 * child that fills takes its measurement from the `width` or `height` of `100%` its frame writes, not
 * from being stretched, so there is nothing for the override to take away.
 */
export function resolvePhiSlotPlacementMargins(placement: PhiPlacement) {
  const inline = phiAxisMargins(placement.inline);
  const block = phiAxisMargins(placement.block);

  return {
    [PHI_SLOT_INLINE_MARGIN_START_PROPERTY]: inline.start,
    [PHI_SLOT_INLINE_MARGIN_END_PROPERTY]: inline.end,
    [PHI_SLOT_BLOCK_MARGIN_START_PROPERTY]: block.start,
    [PHI_SLOT_BLOCK_MARGIN_END_PROPERTY]: block.end,
  } as const;
}

/**
 * An alignment word read back as a placement.
 *
 * A Layout whose author set `align` or `justify` directly has a placement too, it just arrived already
 * spelled. Anything that distributes rather than places -- `space-between` and its kin -- names no side
 * and reads as nothing stated.
 */
export function phiPlacementFromWord(
  word: CSSProperties["justifyContent"] | CSSProperties["alignItems"],
): PhiAxisPlacement | null {
  return word === "center"
    ? "center"
    : word === "end" || word === "flex-end"
      ? "end"
      : word === "start" || word === "flex-start"
        ? "start"
        : null;
}

export function resolvePhiFlexAxisAlignment(
  anchor: PhiAnchorWidgetPlacement | null | undefined,
  vertical: boolean,
): Pick<CSSProperties, "justifyContent" | "alignItems"> {
  if (anchor == null) {
    return {
      justifyContent: "flex-start",
      alignItems: "stretch",
    };
  }

  const anchoredAlignment = vertical
    ? {
        justifyContent:
          anchor === "topLeft" || anchor === "top" || anchor === "topRight"
            ? "flex-start"
            : anchor === "bottomLeft" || anchor === "bottom" || anchor === "bottomRight"
              ? "flex-end"
              : "center",
        alignItems:
          anchor === "topLeft" || anchor === "left" || anchor === "bottomLeft"
            ? "flex-start"
            : anchor === "topRight" || anchor === "right" || anchor === "bottomRight"
              ? "flex-end"
              : "center",
      }
    : {
        justifyContent:
          anchor === "topLeft" || anchor === "left" || anchor === "bottomLeft"
            ? "flex-start"
            : anchor === "topRight" || anchor === "right" || anchor === "bottomRight"
              ? "flex-end"
              : "center",
        alignItems:
          anchor === "topLeft" || anchor === "top" || anchor === "topRight"
            ? "flex-start"
            : anchor === "bottomLeft" || anchor === "bottom" || anchor === "bottomRight"
              ? "flex-end"
              : "center",
      };

  return {
    justifyContent: anchoredAlignment.justifyContent,
    alignItems: anchoredAlignment.alignItems,
  };
}
