import type { CSSProperties, ReactNode } from "react";

import {
  normalizePhiCssSize,
  resolvePhiPaddingStyle,
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
import { resolvePhiSplitCardColumns } from "../split-card-geometry";

const PHI_SPLIT_CARD_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("split");

/**
 * Two cards on the golden ratio.
 *
 * The Layout's Surface is worn by both: each card draws its edge, corner,
 * depth, pane and mode (`PhiSplitCardHalf`), and the Background runs once across the two and shows only
 * inside them, so a picture or a gradient goes on behind the right card instead of starting again. The
 * box between and around them is transparent. The padding is each card's inset, the distance from the
 * card's edge to what stands in it, as it is for every Layout; the gap stands between the cards.
 */
export type PhiSplitCardLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  gap?: CSSProperties["gap"];
  /** The larger card on the left instead of the right. */
  swapRatio?: boolean;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
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
  card: Pick<PhiSplitCardHalfProps, "blockId" | "surface" | "gap" | "swapped"> & { inset: CSSProperties },
) {
  const hasContent = child !== null && child !== undefined && child !== false;
  const showInsertButton = typeof editSlotAction === "function" && editRenderInsertControl != null;

  return (
    <PhiSplitCardHalf
      blockId={card.blockId}
      surface={card.surface}
      side={slotRole}
      gap={card.gap}
      swapped={card.swapped}
      data-layout-kind="split"
      className={phiLayoutSlotClassName(isAuthoringRender)}
      data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, hasContent)}
      key={key}
      style={{
        position: "relative",
        /*
         * No `height: 100%` and no `minHeight: 0`: the grid stretches both cards to the row already, and
         * the content's own height has to stay the card's lower bound. Without it Safari keeps the row's
         * height when the Split Card's width changes, and text that wraps onto more lines runs out of the
         * card (`styles/layout.css`, the Split Card).
         */
        minWidth: 0,
        display: "flex",
        alignItems: "stretch",
        boxSizing: "border-box",
        ...card.inset,
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
  swapRatio = false,
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
   *
   * The padding is each card's, as every Layout's padding is the distance from its own edge to its
   * slots; the box has none, so its content box is the two cards and the gap, which is what the
   * shared Background is measured across.
   */
  const { style: resolvedLayoutStyle } = resolvePhiBaseLayoutChrome({ labelEnd });
  const { hasExplicitLayoutBackground } = resolvePhiBaseLayoutChrome({ surface });
  const card = {
    blockId,
    surface,
    gap: gapLength,
    swapped: swapRatio,
    inset: resolvePhiPaddingStyle({ padding, paddingTop, paddingRight, paddingBottom, paddingLeft }),
  };
  /*
   * The box is the query container -- for the shared Background's `cqw` and for the stacking rule in
   * `styles/layout.css` -- and the grid is the element inside it: a container cannot ask about its own
   * width. Below the rule's width the two cards stand one above the other, the first on top.
   */
  const resolvedStyle: CSSProperties = {
    position: "relative",
    containerType: "inline-size",
    containerName: "phi-split-card",
    ...resolvedLayoutStyle,
    // Not the grid `[data-layout-kind="split"]` makes every split box: the grid is the element inside.
    display: "block",
    minWidth: 0,
    minHeight: 0,
    ...style,
  };
  const gridStyle = {
    "--phi-split-card-columns": resolvePhiSplitCardColumns(swapRatio),
    gap: resolvedGap,
  } as CSSProperties;

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
      <div className="phi-split-card__grid" style={gridStyle}>
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
      </div>
    </PhiLayoutSurfaceBox>
  );
}
