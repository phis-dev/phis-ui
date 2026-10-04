import type { CSSProperties, ReactNode } from "react";

import {
  normalizePhiCssSize,
  type PhiLayoutEditRenderInsertControl,
} from "../phi-layout-contract";
import { PhiLayoutAnchoredOverlay } from "./phi-layout-anchored-overlay";
import {
  resolvePhiBaseLayoutChrome,
  type PhiBaseLayoutProps,
} from "../phi-layout-view-model";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";
import { PhiLayoutSurfaceBox } from "../phi-layout-surface-box";
import { PhiSplitCardHalf, type PhiSplitCardHalfProps } from "./phi-split-card-half";
import { PHI_SPLIT_CARD_RATIO } from "../split-card-geometry";

const PHI_SPLIT_CARD_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("split");

/**
 * Two cards on the golden ratio.
 *
 * The Layout's Surface is worn by both: each card draws its edge, corner,
 * depth, pane and mode (`PhiSplitCardHalf`), and the Background runs once across the two and shows only
 * inside them, so a picture or a gradient goes on behind the right card instead of starting again. The
 * box between and around them is transparent. A card has no inset of its own -- what stands in a half
 * sets it, usually a Layout with padding.
 */
export type PhiSplitCardLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  gap?: CSSProperties["gap"];
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

function renderSplitCardSlot(
  isAuthoringRender: boolean,
  key: string,
  child: ReactNode,
  slotRole: "left" | "right",
  slotIndex: number,
  editSlotAnchor: PhiAnchorWidgetPlacement | null | undefined,
  editSlotAction: PhiSplitCardLayoutProps["editSlotAction"],
  editRenderInsertControl: PhiLayoutEditRenderInsertControl | undefined,
  label: ReactNode,
  card: { blockId: PhiSplitCardHalfProps["blockId"]; surface: PhiSplitCardHalfProps["surface"]; gap: string },
) {
  const hasContent = child !== null && child !== undefined && child !== false;
  const showInsertButton = typeof editSlotAction === "function" && editRenderInsertControl != null;

  return (
    <PhiSplitCardHalf
      blockId={card.blockId}
      surface={card.surface}
      side={slotRole}
      gap={card.gap}
      data-layout-kind="split"
      className={phiLayoutSlotClassName(isAuthoringRender)}
      data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, hasContent)}
      key={key}
      style={{
        position: "relative",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        alignItems: "stretch",
        boxSizing: "border-box",
      }}
    >
      {hasContent ? (
        <PhiLayoutAnchoredOverlay
          anchor={editSlotAnchor}
          slotRole={slotRole}
          positionMode="flow"
          fillAvailableInline
          fillAvailableBlock
        >
          {child}
        </PhiLayoutAnchoredOverlay>
      ) : null}
      {!hasContent && showInsertButton
        ? editRenderInsertControl?.({
          presentation: "overlay",
          slotIndex,
          label,
          anchor: editSlotAnchor,
          slotRole,
          onInsert: (targetSlotIndex) =>
            editSlotAction(targetSlotIndex, {
              defaultPickSection: "widget",
              allowWidgetSection: true,
              slotIndex: targetSlotIndex,
            }),
        })
        : null}
    </PhiSplitCardHalf>
  );
}

export function PhiSplitCardLayout({
  blockId,
  slots,
  gap,
  editSlotAction,
  editRenderInsertControl,
  editSlotAnchor = "center",
  renderMode = "live",
  layoutKind = "split",
  labelEnd,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  surface,
  style,
}: PhiSplitCardLayoutProps) {
  const isAuthoringRender = isPhiLayoutAuthoringRender({ editSlotAction, renderMode });
  const resolvedRenderMode = renderMode ?? "live";
  const resolvedGap = normalizePhiCssSize(gap) ?? (PHI_SPLIT_CARD_LAYOUT_DEFAULTS.gap as number | string);
  const gapLength = typeof resolvedGap === "number" ? `${resolvedGap}px` : String(resolvedGap);
  /*
   * The box itself draws nothing: the Surface is the cards', and outside them the Split Card is
   * transparent. It is the query container the cards measure the shared Background against.
   */
  const { style: resolvedLayoutStyle } = resolvePhiBaseLayoutChrome({
    labelEnd,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
  });
  const { hasExplicitLayoutBackground } = resolvePhiBaseLayoutChrome({ surface });
  const card = { blockId, surface, gap: gapLength };
  const resolvedStyle: CSSProperties = {
    position: "relative",
    containerType: "inline-size",
    ...resolvedLayoutStyle,
    display: "grid",
    gridTemplateColumns: `minmax(0, 1fr) minmax(0, ${PHI_SPLIT_CARD_RATIO}fr)`,
    gap: resolvedGap,
    alignItems: "stretch",
    minWidth: 0,
    minHeight: 0,
    ...style,
  };

  return (
    <PhiLayoutSurfaceBox
      blockId={blockId}
      surface={undefined}
      ground={null}
      data-layout-kind={layoutKind}
      data-phi-block-render-mode={resolvedRenderMode}
      data-phi-layout-debug-layer={phiLayoutDebugLayerMarker(isAuthoringRender)}
      data-phi-layout-has-explicit-layout-background={hasExplicitLayoutBackground ? "true" : "false"}
      className="phi-layout"
      style={resolvedStyle}
    >
      {renderSplitCardSlot(
        isAuthoringRender,
        "slot-1",
        slots[0] ?? null,
        "left",
        0,
        editSlotAnchor,
        editSlotAction,
        editRenderInsertControl,
        "Slot 1",
        card,
      )}
      {renderSplitCardSlot(
        isAuthoringRender,
        "slot-2",
        slots[1] ?? null,
        "right",
        1,
        editSlotAnchor,
        editSlotAction,
        editRenderInsertControl,
        "Slot 2",
        card,
      )}
    </PhiLayoutSurfaceBox>
  );
}
