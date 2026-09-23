import type { CSSProperties, ReactNode } from "react";

import { PhiCmsFlags } from "../../constants/phi-cms";
import {
  resolvePhiAnchorWidgetPlacement,
  type PhiAnchorWidgetPlacement,
} from "../controls/phi-anchor-control-contract";
import type {
  PhiRenderableBlockRenderMode,
  PhiRenderableBlockAnchor,
  PhiRenderableBlockSize,
} from "../../types";
import type { PhiShadow, PhiLayoutEffectId } from "../../types/layout-style";

export type PhiLayoutProps = {
  size?: PhiRenderableBlockSize;
  minSize?: PhiRenderableBlockSize;
  maxSize?: PhiRenderableBlockSize;
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

export function resolvePhiLayoutBoxStyle({
  size,
  minSize,
  maxSize,
}: Pick<PhiLayoutProps, "size" | "minSize" | "maxSize">): CSSProperties {
  const resolvedStyle: CSSProperties = {};

  const resolvedWidth = normalizePhiCssSize(size?.width ?? "100%");
  const resolvedHeight = normalizePhiCssSize(size?.height ?? "100%");
  const resolvedMinWidth = normalizePhiCssSize(minSize?.width ?? undefined);
  const resolvedMaxWidth = normalizePhiCssSize(maxSize?.width ?? undefined);
  const resolvedMinHeight = normalizePhiCssSize(minSize?.height ?? undefined);
  const resolvedMaxHeight = normalizePhiCssSize(maxSize?.height ?? undefined);

  if (resolvedWidth !== undefined) {
    resolvedStyle.width = resolvedWidth;
  }
  if (resolvedHeight !== undefined) {
    resolvedStyle.height = resolvedHeight;
  }
  if (resolvedMinWidth !== undefined) {
    resolvedStyle.minWidth = resolvedMinWidth;
  }
  if (resolvedMaxWidth !== undefined) {
    resolvedStyle.maxWidth = resolvedMaxWidth;
  }
  if (resolvedMinHeight !== undefined) {
    resolvedStyle.minHeight = resolvedMinHeight;
  }
  if (resolvedMaxHeight !== undefined) {
    resolvedStyle.maxHeight = resolvedMaxHeight;
  }

  return resolvedStyle;
}

/** The Site's answer for a Layout that states no corner of its own; see `resolvePhiLayoutStyle`. */
const PHI_LAYOUT_SURFACE_RADIUS = "var(--phi-surface-radius, 0)";

export function resolvePhiLayoutStyle({
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  background,
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
  | "border"
  | "borderRadius"
>): CSSProperties {

  const resolvedBorderRadius = normalizePhiCssSize(borderRadius);

  return {
    ...(background == null ? {} : { background }),
    ...(border == null
      ? {}
      : {
          border,
        }),
    /*
     * A Layout is a surface, so an author who said nothing about its corner gets the Site's answer to
     * that question -- the same step a Table and a Tree take, carried on the root as
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
 * The custom properties a slot hands its children, so a stretched one can still be placed.
 *
 * Two, not one shorthand. React expands a `marginInline` shorthand into two longhands when it renders
 * on the server and leaves it whole in the browser, so the two trees disagree on an attribute that is
 * never patched up -- a hydration mismatch for a margin that was only ever `auto` or `0`.
 */
export const PHI_SLOT_CROSS_MARGIN_START_PROPERTY = "--phi-slot-cross-margin-start";
export const PHI_SLOT_CROSS_MARGIN_END_PROPERTY = "--phi-slot-cross-margin-end";

/**
 * How a child that fills the cross axis is placed on it, given where the Layout wanted it.
 *
 * Stretching and placing are two different jobs that `align-items` cannot do at once. A child that
 * fills has to be stretched, or its own `width: 100%` has nothing to measure against and collapses to
 * nothing. A child that fills *up to a cap* is stretched as well -- and then leaves room over, which is
 * where the Layout's anchor gets its say again: an auto margin pulls it into the middle or to the end
 * of the room the cap left, and a child that fills edge to edge has no room to be moved in, so the
 * auto margins come to nothing.
 *
 * Handed down as custom properties rather than applied here, because the child is not always the slot's
 * own element -- a Visibility Gate sits between them as `display: contents`, and custom properties
 * inherit straight through that while a child selector would stop at it. Every slot states them, `0`
 * included, so a nested Layout never inherits the placement of the one above it.
 */
export function resolvePhiSlotCrossMargin(alignItems: CSSProperties["alignItems"]) {
  return {
    start: alignItems === "center" || alignItems === "flex-end" ? "auto" : "0",
    end: alignItems === "center" ? "auto" : "0",
  };
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
