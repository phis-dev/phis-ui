import type { CSSProperties, ReactNode } from "react";

import {
  normalizePhiCssSize,
  type PhiLayoutEditRenderInsertControl,
  type PhiLayoutKind,
  } from "../phi-layout-contract";
import { resolvePhiBaseLayoutChrome } from "../phi-layout-view-model";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import { PHI_CMS_THREE_COLUMN_LAYOUT_SLOTS } from "../../../constants/cms-layout-types";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import type { PhiRenderableBlockRenderMode, PhiRenderableBlockSize } from "../../../types";
import type { PhiShadow, PhiLayoutEffectId } from "../../../types/layout-style";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";

const PHI_THREE_COLUMN_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("threecol");

export type PhiThreeColumnLayoutProps = {
  blockId?: string | number | null;
  slots: ReactNode[];
  balancedSides?: boolean;
  gap?: CSSProperties["gap"];
  wrap?: boolean | CSSProperties["flexWrap"];
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  leftWidth?: CSSProperties["width"];
  middleWidth?: CSSProperties["width"];
  rightWidth?: CSSProperties["width"];
  size?: PhiRenderableBlockSize | null;
  minSize?: PhiRenderableBlockSize | null;
  maxSize?: PhiRenderableBlockSize | null;
  collapsedSizeHint?: PhiRenderableBlockSize | null;
  renderMode?: PhiRenderableBlockRenderMode;
  zIndex?: number;
  shadow?: PhiShadow | null;
  effect?: PhiLayoutEffectId;
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

function resolveThreeColumnAnchorAlignment(
  anchor: PhiAnchorWidgetPlacement | null | undefined,
  slotRole: "left" | "middle" | "right",
) {
  const horizontal =
    slotRole === "left"
      ? "flex-start"
      : slotRole === "right"
        ? "flex-end"
        : anchor === "topLeft" || anchor === "left" || anchor === "bottomLeft"
          ? "flex-start"
          : anchor === "topRight" || anchor === "right" || anchor === "bottomRight"
            ? "flex-end"
            : "center";
  const vertical =
    anchor === "topLeft" || anchor === "top" || anchor === "topRight"
      ? "flex-start"
      : anchor === "bottomLeft" || anchor === "bottom" || anchor === "bottomRight"
        ? "flex-end"
        : "center";

  return { horizontal, vertical };
}

function renderColumn(
  key: string,
  child: ReactNode,
  width: CSSProperties["width"] | undefined,
  flex: string,
  anchor: PhiAnchorWidgetPlacement | null | undefined,
  slotRole: "left" | "middle" | "right",
  editSlotAction?: PhiThreeColumnLayoutProps["editSlotAction"],
  editRenderInsertControl?: PhiLayoutEditRenderInsertControl,
  slotIndex?: number,
  label?: ReactNode,
  showInsertButton?: boolean,
) {
  const isAuthoringRender = isPhiLayoutAuthoringRender({ editSlotAction });
  const resolvedWidth = normalizePhiCssSize(width);
  const hasContent = child !== null && child !== undefined && child !== false;
  const { horizontal, vertical } = resolveThreeColumnAnchorAlignment(anchor, slotRole);

  return (
    <div
      key={key}
      className={phiLayoutSlotClassName(isAuthoringRender)}
      data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, hasContent)}
      data-phi-layout-slot-role={slotRole}
      style={{
        position: "relative",
        minWidth: 0,
        minHeight: 0,
        alignSelf: "stretch",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        flex: resolvedWidth ? `0 0 ${resolvedWidth}` : flex,
        width: resolvedWidth,
        maxWidth: resolvedWidth,
        boxSizing: "border-box",
      }}
    >
      {hasContent ? (
        <div
          style={{
            display: "flex",
            flex: "1 1 auto",
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            justifyContent: horizontal,
            alignItems: vertical,
          }}
        >
          {child}
        </div>
      ) : null}
      {!hasContent && showInsertButton && typeof editSlotAction === "function" && typeof slotIndex === "number" && editRenderInsertControl
        ? editRenderInsertControl({
          presentation: "overlay",
          slotIndex,
          label,
          anchor,
          slotRole,
          onInsert: (targetSlotIndex) =>
            editSlotAction(targetSlotIndex, {
              defaultPickSection: "widget",
              allowWidgetSection: true,
              slotIndex: targetSlotIndex,
            }),
        })
        : null}
      {!hasContent && typeof editSlotAction !== "function" ? (
        <div
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            minHeight: 0,
            width: "100%",
          }}
        />
      ) : null}
    </div>
  );
}

export function PhiThreeColumnLayout({
  blockId,
  slots,
  balancedSides = true,
  gap = PHI_THREE_COLUMN_LAYOUT_DEFAULTS.gap as number | string,
  wrap = PHI_THREE_COLUMN_LAYOUT_DEFAULTS.wrap as boolean | CSSProperties["flexWrap"] | undefined,
  align,
  justify,
  leftWidth,
  middleWidth,
  rightWidth,
  editSlotAnchor = "center",
  editSlotAction,
  editRenderInsertControl,
  renderMode = "live",
  ...layoutProps
}: PhiThreeColumnLayoutProps) {
  const isAuthoringRender = isPhiLayoutAuthoringRender({ editSlotAction });
  const {
    style,
    layoutKind = "threecol",
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
  } = layoutProps;
  const resolvedRenderMode = renderMode ?? "live";
  const resolvedLeftWidth = normalizePhiCssSize(leftWidth);
  const resolvedMiddleWidth = normalizePhiCssSize(middleWidth);
  const resolvedRightWidth = normalizePhiCssSize(rightWidth);
  const leftFlex = resolvedLeftWidth ? `0 0 ${resolvedLeftWidth}` : balancedSides ? "1 1 0" : "0 1 auto";
  const middleFlex = resolvedMiddleWidth ? `0 0 ${resolvedMiddleWidth}` : "1 1 0";
  const rightFlex = resolvedRightWidth ? `0 0 ${resolvedRightWidth}` : balancedSides ? "1 1 0" : "0 1 auto";
  const showInsertButton = resolvedRenderMode === "editor";
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
  return (
    <div
      data-layout-kind={layoutKind}
      data-phi-block-id={blockId ?? undefined}
      className="phi-layout"
      data-phi-block-render-mode={resolvedRenderMode}
      data-phi-debug-scaffold={undefined}
      data-phi-layout-debug-layer={phiLayoutDebugLayerMarker(isAuthoringRender)}
      data-phi-layout-has-explicit-layout-background={hasExplicitLayoutBackground ? "true" : "false"}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        ...resolvedLayoutStyle,
        display: "flex",
        flexDirection: "row",
        flexWrap: wrap === true ? "wrap" : wrap === false ? "nowrap" : wrap,
      alignItems: align ?? "stretch",
      justifyContent: justify,
      gap: normalizePhiCssSize(gap) ?? (resolvePhiLayoutDefaults("threecol").gap as number | string),
      ...style,
      }}
    >
      {backgroundLayer}
      {renderColumn(
        "slot-1",
        slots[0] ?? null,
        leftWidth,
        leftFlex,
        editSlotAnchor,
        "left",
        editSlotAction,
        editRenderInsertControl,
        0,
        PHI_CMS_THREE_COLUMN_LAYOUT_SLOTS[0]?.label,
        showInsertButton,
      )}
      {renderColumn(
        "slot-2",
        slots[1] ?? null,
        middleWidth,
        middleFlex,
        editSlotAnchor,
        "middle",
        editSlotAction,
        editRenderInsertControl,
        1,
        PHI_CMS_THREE_COLUMN_LAYOUT_SLOTS[1]?.label,
        showInsertButton,
      )}
      {renderColumn(
        "slot-3",
        slots[2] ?? null,
        rightWidth,
        rightFlex,
        editSlotAnchor,
        "right",
        editSlotAction,
        editRenderInsertControl,
        2,
        PHI_CMS_THREE_COLUMN_LAYOUT_SLOTS[2]?.label,
        showInsertButton,
      )}
    </div>
  );
}
