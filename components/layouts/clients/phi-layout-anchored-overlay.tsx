import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";

import { buildPhiSlotChildDataAttributes, resolvePhiSlotChildSizing } from "../../../plugins/runtime/slot-size-policy";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";

export type PhiLayoutAnchorRole = "left" | "middle" | "right";

export type PhiLayoutSlotChildSizing = {
  fillSlot: boolean;
  fillInline: boolean;
  fillBlock: boolean;
  hasExplicitWidth: boolean;
  hasExplicitHeight: boolean;
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
      }}
    >
      <div
        className="phi-layout-scaffold-anchor__content"
        style={{
          width: slotSizing.fillInline ? "100%" : undefined,
          height: slotSizing.fillBlock ? "100%" : undefined,
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
