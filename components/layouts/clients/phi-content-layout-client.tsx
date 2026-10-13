import { isRenderablePhiNode } from "../phi-layout-scaffold-utils";
import { resolvePhiLayoutInset } from "../phi-layout-contract";
import { resolvePhiBaseLayoutChrome, type PhiBaseLayoutProps } from "../phi-layout-view-model";
import { PhiLayoutAnchoredOverlay } from "./phi-layout-anchored-overlay";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import type { PhiRenderableBlockResponsiveSize } from "../../../types";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";
import { PhiLayoutSurfaceBox } from "../phi-layout-surface-box";

export type PhiContentLayoutProps = Pick<
  PhiBaseLayoutProps,
  | "blockId"
  | "slots"
  | "renderMode"
  | "margin"
  | "zIndex"
  | "layoutKind"
  | "labelEnd"
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "surface"
  | "editSlotAction"
  | "editRenderInsertControl"
  | "style"
> & {
  size?: PhiRenderableBlockResponsiveSize | null;
  minSize?: PhiRenderableBlockResponsiveSize | null;
  maxSize?: PhiRenderableBlockResponsiveSize | null;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
};

export function PhiContentLayout({
  blockId,
  slots,
  renderMode = "live",
  margin = 0,
  layoutKind = "content",
  labelEnd,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  surface,
  editSlotAction,
  editRenderInsertControl,
  editSlotAnchor = "center",
  style,
}: PhiContentLayoutProps) {
  const isAuthoringRender = isPhiLayoutAuthoringRender({ editSlotAction, renderMode });
  const slot0 = Array.isArray(slots) ? slots[0] : undefined;
  const hasSlot0 = isRenderablePhiNode(slot0);
  const shouldFillBlock = true;
  const isEditor = renderMode === "editor";
  const {
    style: resolvedLayoutStyle,
    ground,
    hasExplicitLayoutBackground,
  } = resolvePhiBaseLayoutChrome({
    labelEnd,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    surface,
  });
  const resolvedLayoutInset = resolvePhiLayoutInset({
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
  });
  return (
    <PhiLayoutSurfaceBox
      blockId={blockId}
      surface={surface}
      ground={ground}
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
        minWidth: 0,
        minHeight: 0,
        margin,
        ...resolvedLayoutStyle,
        ...style,
      }}
    >
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
    </PhiLayoutSurfaceBox>
  );
}
