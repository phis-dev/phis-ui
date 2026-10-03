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
import { PhiSurfaceGroundLayer } from "../../surface/phi-surface-ground";

const PHI_SPLIT_CARD_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("split");

/**
 * One card, split in two.
 *
 * The card is the Layout's own Surface -- one ground, one edge, one depth behind both halves -- so the
 * Split Card states nothing about chrome of its own and takes the Surface every Layout has. What it adds
 * is the split: a slot on each side on the golden ratio, the gap between them, and the inset both halves
 * share. It used to draw two cards, one per slot, with six fields that were always set alike.
 */
export type PhiSplitCardLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  gap?: CSSProperties["gap"];
  /** How far each half's content stands from that half's edges; the same for both. */
  slotPadding?: CSSProperties["padding"];
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
  slotPadding: CSSProperties["padding"] | undefined,
) {
  const hasContent = child !== null && child !== undefined && child !== false;
  const showInsertButton = typeof editSlotAction === "function" && editRenderInsertControl != null;

  return (
    <div
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
        padding: normalizePhiCssSize(slotPadding),
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
    </div>
  );
}

export function PhiSplitCardLayout({
  slots,
  gap,
  slotPadding,
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
  const resolvedStyle: CSSProperties = {
    position: "relative",
    ...resolvedLayoutStyle,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.61803398875fr)",
    gap: resolvedGap,
    alignItems: "stretch",
    minWidth: 0,
    minHeight: 0,
    ...style,
  };

  return (
    <div
      data-layout-kind={layoutKind}
      data-phi-block-render-mode={resolvedRenderMode}
      data-phi-layout-debug-layer={phiLayoutDebugLayerMarker(isAuthoringRender)}
      data-phi-layout-has-explicit-layout-background={hasExplicitLayoutBackground ? "true" : "false"}
      className="phi-layout"
      style={resolvedStyle}
    >
      <PhiSurfaceGroundLayer ground={ground} />
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
        slotPadding,
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
        slotPadding,
      )}
    </div>
  );
}
