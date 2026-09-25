import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";

import { buildPhiSlotChildDataAttributes, resolvePhiSlotChildSizing } from "../../../plugins/runtime/slot-size-policy";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import {
  PHI_SLOT_CROSS_MARGIN_END_PROPERTY,
  PHI_SLOT_CROSS_MARGIN_START_PROPERTY,
  resolvePhiSlotCrossMargin,
} from "../phi-layout-contract";

export type PhiLayoutAnchorRole = "left" | "middle" | "right";

export type PhiLayoutSlotChildSizing = {
  fillSlot: boolean;
  /** What the policy says, which is not the same as what the child ends up doing. */
  fillInline: boolean;
  fillBlock: boolean;
  hasExplicitWidth: boolean;
  hasExplicitHeight: boolean;
  /**
   * Whether the slot should stretch to the axis.
   *
   * The policy is already the effective one (`resolvePhiEffectiveSlotSizePolicy`), so a child that
   * states a size of its own reads as `fixed` here and not as `fill`. These two are the question a
   * Layout actually asks, named for what it wants to know rather than for what the policy is called.
   */
  stretchesInline: boolean;
  stretchesBlock: boolean;
  minInlineSize: CSSProperties["minWidth"];
  minBlockSize: CSSProperties["minHeight"];
  maxInlineSize: CSSProperties["maxWidth"];
  maxBlockSize: CSSProperties["maxHeight"];
};

export function isPhiLayoutNodeChild(child: ReactNode) {
  return isValidElement(child) && (child.props as { "data-layout-kind"?: unknown })["data-layout-kind"] != null;
}

export function resolvePhiLayoutSlotChildSizing(
  child: ReactNode,
): PhiLayoutSlotChildSizing {
  const childNodes = Children.toArray(child);
  if (childNodes.length > 1) {
    console.error(
      `Invalid Phi layout slot: expected exactly one child per slot, received ${childNodes.length}. ` +
        "Only the first child will be used for sizing.",
    );
  }

  const resolvedChild = childNodes.length > 0 ? childNodes[0] : child;
  const slotSizing = resolvePhiSlotChildSizing(
    resolvedChild,
    isPhiLayoutNodeChild(resolvedChild) ? "layout" : "widget",
  );

  return {
    fillSlot: slotSizing.policy.inline === "fill" || slotSizing.policy.block === "fill",
    fillInline: slotSizing.policy.inline === "fill",
    fillBlock: slotSizing.policy.block === "fill",
    hasExplicitWidth: slotSizing.explicitInlineSize,
    hasExplicitHeight: slotSizing.explicitBlockSize,
    stretchesInline: slotSizing.policy.inline === "fill",
    stretchesBlock: slotSizing.policy.block === "fill",
    minInlineSize: slotSizing.minInlineSize,
    minBlockSize: slotSizing.minBlockSize,
    maxInlineSize: slotSizing.maxInlineSize,
    maxBlockSize: slotSizing.maxBlockSize,
  };
}

export type PhiLayoutAnchoredOverlayProps = {
  anchor?: PhiAnchorWidgetPlacement | null;
  slotRole?: PhiLayoutAnchorRole;
  positionMode?: "absolute" | "flow";
  fillAvailableInline?: boolean;
  fillAvailableBlock?: boolean;
  inset?: {
    top?: CSSProperties["top"];
    right?: CSSProperties["right"];
    bottom?: CSSProperties["bottom"];
    left?: CSSProperties["left"];
  };
  backgroundColor?: CSSProperties["backgroundColor"];
  children: ReactNode;
};

function resolveAnchorAlignment(
  anchor: PhiAnchorWidgetPlacement | null | undefined,
  slotRole: PhiLayoutAnchorRole | undefined,
) {
  const baseHorizontal =
    anchor === "topLeft" || anchor === "left" || anchor === "bottomLeft"
      ? "flex-start"
      : anchor === "topRight" || anchor === "right" || anchor === "bottomRight"
        ? "flex-end"
        : "center";
  const horizontal =
    slotRole === "right"
      ? baseHorizontal === "flex-start"
        ? "flex-end"
        : baseHorizontal === "flex-end"
          ? "flex-start"
          : "center"
      : baseHorizontal;
  const vertical =
    anchor === "topLeft" || anchor === "top" || anchor === "topRight"
      ? "flex-start"
      : anchor === "bottomLeft" || anchor === "bottom" || anchor === "bottomRight"
        ? "flex-end"
        : "center";

  return { horizontal, vertical };
}

/**
 * The anchor's placement, as the margins a child that fills up to a cap is moved by. `justify-content`
 * reaches a child that leaves room in the row; a child stretched to the row and capped is placed by the
 * auto margins it reads off `--phi-slot-cross-margin-*`, and those inherit -- so an overlay that stated
 * none handed its child whatever Layout stood above. Stated on every overlay, `0` included.
 */
export function PhiLayoutAnchoredOverlay({
  anchor,
  slotRole,
  positionMode = "absolute",
  fillAvailableInline = false,
  fillAvailableBlock = false,
  inset,
  backgroundColor,
  children,
}: PhiLayoutAnchoredOverlayProps) {
  const { horizontal, vertical } = resolveAnchorAlignment(anchor, slotRole);
  const slotSizing = resolvePhiLayoutSlotChildSizing(children);
  const crossMargin = resolvePhiSlotCrossMargin(horizontal);

  return (
    <div
      className={[
        "phi-layout-scaffold-anchor",
        positionMode === "flow" ? "phi-layout-scaffold-anchor--flow" : null,
      ].filter(Boolean).join(" ")}
      style={{
        justifyContent: horizontal,
        alignItems: vertical,
        backgroundColor: backgroundColor ?? "transparent",
        [PHI_SLOT_CROSS_MARGIN_START_PROPERTY]: crossMargin.start,
        [PHI_SLOT_CROSS_MARGIN_END_PROPERTY]: crossMargin.end,
        ...(positionMode === "absolute"
          ? {
              top: inset?.top ?? 0,
              right: inset?.right ?? 0,
              bottom: inset?.bottom ?? 0,
              left: inset?.left ?? 0,
            }
          : null),
        ...(positionMode === "flow"
          ? {
              width: slotSizing.fillInline || fillAvailableInline ? "100%" : undefined,
              height: slotSizing.fillBlock || fillAvailableBlock ? "100%" : undefined,
              minWidth: 0,
              minHeight: 0,
              flex: slotSizing.fillBlock || fillAvailableBlock ? "1 1 auto" : "0 0 auto",
              alignSelf: slotSizing.fillInline || fillAvailableInline ? "stretch" : undefined,
            }
          : null),
      } as CSSProperties}
    >
      <div
        className="phi-layout-scaffold-anchor__content"
        /* Not the raw policy: a wrapper at full width leaves the anchor above nothing to move. */
        style={{
          width: slotSizing.stretchesInline ? "100%" : undefined,
          height: slotSizing.stretchesBlock ? "100%" : undefined,
        }}
        {...buildPhiSlotChildDataAttributes(
          {
            inline: slotSizing.fillInline ? "fill" : "intrinsic",
            block: slotSizing.fillBlock ? "fill" : "intrinsic",
          },
          {
            explicitInlineSize: slotSizing.hasExplicitWidth,
            explicitBlockSize: slotSizing.hasExplicitHeight,
          },
        )}
      >
        {children}
      </div>
    </div>
  );
}
