import type { CSSProperties, ReactNode } from "react";

import { resolvePhiBorderWidgetStyle } from "../../../helpers/border-widget-style";
import type { PhiCmsBorderWidgetConfig } from "../../../types/cms-config";
import {
  resolvePhiBackgroundWidgetStyle,
  type PhiCmsBackgroundWidgetConfig,
} from "../../widgets/config/background";
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
import { combinePhiBoxShadows, resolvePhiShadow } from "../../../helpers/layout-style";
import type { PhiShadow } from "../../../types/layout-style";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";

const PHI_SPLIT_CARD_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("split");

export type PhiSplitCardLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  gap?: CSSProperties["gap"];
  borderRadius?: CSSProperties["borderRadius"];
  leftPadding?: CSSProperties["padding"];
  rightPadding?: CSSProperties["padding"];
  leftBackground?: PhiCmsBackgroundWidgetConfig;
  rightBackground?: PhiCmsBackgroundWidgetConfig;
  leftBorder?: PhiCmsBorderWidgetConfig;
  rightBorder?: PhiCmsBorderWidgetConfig;
  leftShadow?: PhiShadow;
  rightShadow?: PhiShadow;
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
  key: string,
  child: ReactNode,
  slotRole: "left" | "right",
  slotIndex: number,
  editSlotAnchor: PhiAnchorWidgetPlacement | null | undefined,
  editSlotAction: PhiSplitCardLayoutProps["editSlotAction"],
  editRenderInsertControl: PhiLayoutEditRenderInsertControl | undefined,
  label?: ReactNode,
  slotPadding?: CSSProperties["padding"],
  slotBackground?: PhiCmsBackgroundWidgetConfig,
  slotBorder?: PhiCmsBorderWidgetConfig,
  slotShadow?: PhiShadow,
  slotBorderRadius?: CSSProperties["borderRadius"],
) {
  const isAuthoringRender = isPhiLayoutAuthoringRender({ editSlotAction });
  const hasContent = child !== null && child !== undefined && child !== false;
  const showInsertButton = typeof editSlotAction === "function" && editRenderInsertControl != null;
  const resolvedSlotBackgroundStyle = resolvePhiBackgroundWidgetStyle(slotBackground ?? null);
  const resolvedSlotBorderStyle = resolvePhiBorderWidgetStyle(slotBorder ?? null, {
    borderRadius: slotBorderRadius,
  });
  const hasExplicitCardChrome =
    (slotBackground != null && slotBackground.base.kind !== "none") ||
    slotBorder != null ||
    slotShadow != null;

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
        borderRadius: hasExplicitCardChrome ? normalizePhiCssSize(slotBorderRadius) : 0,
        overflow: hasExplicitCardChrome ? "hidden" : undefined,
        padding: normalizePhiCssSize(slotPadding),
        boxSizing: "border-box",
        ...resolvedSlotBorderStyle,
        ...resolvedSlotBackgroundStyle,
        boxShadow: combinePhiBoxShadows(resolvedSlotBackgroundStyle.boxShadow, resolvePhiShadow(slotShadow)),
      }}
    >
      {hasContent ? (
        <PhiLayoutAnchoredOverlay
          anchor={editSlotAnchor}
          slotRole={slotRole === "left" ? "left" : "right"}
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
          slotRole: slotRole === "left" ? "left" : "right",
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
  borderRadius,
  leftPadding,
  rightPadding,
  leftBackground,
  rightBackground,
  leftBorder,
  rightBorder,
  leftShadow,
  rightShadow,
  editSlotAction,
  editRenderInsertControl,
  editSlotAnchor = "center",
  renderMode = "live",
  layoutKind = "split",
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  background,
  backgroundLayer,
  border,
  effect,
  shadow,
  style,
}: PhiSplitCardLayoutProps) {
  const isAuthoringRender = isPhiLayoutAuthoringRender({ editSlotAction });
  const resolvedRenderMode = renderMode ?? "live";
  const resolvedGap = normalizePhiCssSize(gap) ?? (PHI_SPLIT_CARD_LAYOUT_DEFAULTS.gap as number | string);
  const resolvedSlotRadius =
    normalizePhiCssSize(borderRadius) ?? (PHI_SPLIT_CARD_LAYOUT_DEFAULTS.borderRadius as number | string);
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
  const resolvedStyle: CSSProperties = {
    position: "relative",
    ...resolvedLayoutStyle,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.61803398875fr)",
    gap: resolvedGap,
    alignItems: "stretch",
    width: "100%",
    height: "100%",
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
      {backgroundLayer}
      {renderSplitCardSlot(
        "slot-1",
        slots[0] ?? null,
        "left",
        0,
        editSlotAnchor,
        editSlotAction,
        editRenderInsertControl,
        "Slot 1",
        leftPadding,
        leftBackground,
        leftBorder,
        leftShadow,
        resolvedSlotRadius,
      )}
      {renderSplitCardSlot(
        "slot-2",
        slots[1] ?? null,
        "right",
        1,
        editSlotAnchor,
        editSlotAction,
        editRenderInsertControl,
        "Slot 2",
        rightPadding,
        rightBackground,
        rightBorder,
        rightShadow,
        resolvedSlotRadius,
      )}
    </div>
  );
}
