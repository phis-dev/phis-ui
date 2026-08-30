import type { CSSProperties, ReactNode } from "react";

import { isRenderablePhiNode } from "../phi-layout-scaffold-utils";
import {
  resolvePhiLayoutInset,
  type PhiLayoutEditRenderInsertControl,
  type PhiLayoutKind,
  } from "../phi-layout-contract";
import { resolvePhiBaseLayoutChrome } from "../phi-layout-view-model";
import { PhiLayoutAnchoredOverlay } from "./phi-layout-anchored-overlay";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import type { PhiRenderableBlockRenderMode, PhiRenderableBlockSize } from "../../../types";
import type { PhiShadow, PhiLayoutEffectId } from "../../../types/layout-style";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";

export type PhiContentLayoutProps = {
  blockId?: string | number | null;
  slots?: ReactNode[];
  renderMode?: PhiRenderableBlockRenderMode;
  size?: PhiRenderableBlockSize | null;
  minSize?: PhiRenderableBlockSize | null;
  maxSize?: PhiRenderableBlockSize | null;
  margin?: CSSProperties["margin"];
  zIndex?: number;
  effect?: PhiLayoutEffectId;
  shadow?: PhiShadow | null;
  layoutKind?: PhiLayoutKind;
  padding?: CSSProperties["padding"];
  paddingTop?: CSSProperties["paddingTop"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingBottom?: CSSProperties["paddingBottom"];
  paddingLeft?: CSSProperties["paddingLeft"];
  background?: CSSProperties["background"];
  backgroundLayer?: ReactNode;
  border?: CSSProperties["border"];
  borderRadius?: CSSProperties["borderRadius"];
  editSlotAction?: (
    slotIndex: number,
    options?: {
      defaultPickSection?: "layout" | "widget";
      allowWidgetSection?: boolean;
      slotIndex?: number;
    },
  ) => void;
  editRenderInsertControl?: PhiLayoutEditRenderInsertControl;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  style?: CSSProperties;
};

export function PhiContentLayout({
  blockId,
  slots,
  renderMode = "live",
  margin = 0,
  layoutKind = "content",
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  background,
  backgroundLayer,
  border,
  borderRadius,
  effect,
  shadow,
  editSlotAction,
  editRenderInsertControl,
  editSlotAnchor = "center",
  style,
}: PhiContentLayoutProps) {
  const isAuthoringRender = isPhiLayoutAuthoringRender({ editSlotAction });
  const slot0 = Array.isArray(slots) ? slots[0] : undefined;
  const hasSlot0 = isRenderablePhiNode(slot0);
  const shouldFillBlock = true;
  const isEditor = renderMode === "editor";
  const {
    style: resolvedLayoutStyle,
    hasExplicitLayoutBackground,
  } = resolvePhiBaseLayoutChrome({
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    background,
    border,
    borderRadius,
    effect,
    shadow,
  });
  const resolvedLayoutInset = resolvePhiLayoutInset({
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
  });
  return (
    <div
      data-layout-kind={layoutKind}
      data-phi-block-id={blockId ?? undefined}
      data-phi-block-render-mode={renderMode}
      data-phi-debug-scaffold={undefined}
      data-phi-layout-debug-layer={phiLayoutDebugLayerMarker(isAuthoringRender)}
      data-phi-layout-has-slot0={hasSlot0 ? "true" : "false"}
      data-phi-layout-has-explicit-layout-background={hasExplicitLayoutBackground ? "true" : "false"}
      className="phi-layout"
      style={{
        position: hasSlot0 || (isEditor && editSlotAction) ? "relative" : undefined,
        width: "100%",
        height: shouldFillBlock ? "100%" : undefined,
        minWidth: 0,
        minHeight: 0,
        margin,
        ...resolvedLayoutStyle,
        ...style,
      }}
    >
      {backgroundLayer}
      <div
        className={phiLayoutSlotClassName(isAuthoringRender)}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, hasSlot0)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "flex-start",
          width: "100%",
          height: shouldFillBlock ? "100%" : undefined,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {hasSlot0 ? (
          <PhiLayoutAnchoredOverlay
            anchor={editSlotAnchor}
            positionMode="flow"
            fillAvailableInline
            fillAvailableBlock
            inset={resolvedLayoutInset}
          >
            {slot0}
          </PhiLayoutAnchoredOverlay>
        ) : null}
      </div>

      {isEditor && !hasSlot0 && editSlotAction && editRenderInsertControl
        ? editRenderInsertControl({
          presentation: "overlay",
          slotIndex: 0,
          label: "Default",
          anchor: editSlotAnchor,
          inset: resolvedLayoutInset,
          onInsert: (targetSlotIndex) =>
            editSlotAction(targetSlotIndex, {
              defaultPickSection: "widget",
              allowWidgetSection: true,
              slotIndex: targetSlotIndex,
            }),
        })
        : null}
    </div>
  );
}
