"use client";

import { theme as antdTheme } from "antd";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { normalizePhiCssSize, resolvePhiLayoutInset } from "../phi-layout-contract";
import type { PhiGridLayoutProps } from "../phi-grid-contract";
import { PhiBaseLayout } from "../phi-base-layout";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import { resolvePhiLayoutSlotChildSizing } from "./phi-layout-anchored-overlay";
import { resolvePhiGridSlotPlacement } from "../phi-grid-contract";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";

const PHI_GRID_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("grid");
const PHI_GRID_LAYOUT_DEFAULT_SPAN = 6;

export type { PhiGridLayoutProps } from "../phi-grid-contract";

function resolveGridAnchorAlign(anchor: PhiGridLayoutProps["anchor"]): CSSProperties["alignItems"] | undefined {
  if (anchor?.vertical === "top") {
    return "start";
  }

  if (anchor?.vertical === "middle") {
    return "center";
  }

  if (anchor?.vertical === "bottom") {
    return "end";
  }

  return undefined;
}

function resolveGridAnchorJustify(anchor: PhiGridLayoutProps["anchor"]): CSSProperties["justifyContent"] | undefined {
  if (anchor?.horizontal === "left") {
    return "start";
  }

  if (anchor?.horizontal === "center") {
    return "center";
  }

  if (anchor?.horizontal === "right") {
    return "end";
  }

  return undefined;
}

function resolveGridPlacementAnchor(
  anchor: PhiGridLayoutProps["anchor"],
  editSlotAnchor: PhiGridLayoutProps["editSlotAnchor"],
) {
  if (editSlotAnchor != null) {
    return {
      horizontal: editSlotAnchor === "topLeft" || editSlotAnchor === "left" || editSlotAnchor === "bottomLeft"
        ? "left"
        : editSlotAnchor === "topRight" || editSlotAnchor === "right" || editSlotAnchor === "bottomRight"
          ? "right"
          : "center",
      vertical: editSlotAnchor === "topLeft" || editSlotAnchor === "top" || editSlotAnchor === "topRight"
        ? "top"
        : editSlotAnchor === "bottomLeft" || editSlotAnchor === "bottom" || editSlotAnchor === "bottomRight"
          ? "bottom"
          : "middle",
    } satisfies NonNullable<PhiGridLayoutProps["anchor"]>;
  }

  return anchor;
}

function resolveGridSlotPlacementStyle(slot: ReactNode): CSSProperties {
  /*
   * The same slot-sizing helper the other layouts use. Going through it rather than reaching into
   * plugins/runtime directly keeps this client out of the Render Manifest's chunk -- that shared edge
   * was pulling the whole Grid implementation into every Area's first load, Public included.
   */
  const sizing = resolvePhiLayoutSlotChildSizing(slot);

  return {
    minWidth: 0,
    minHeight: 0,
    maxWidth: "100%",
    maxHeight: "100%",
    width: sizing.fillInline ? "100%" : "fit-content",
    height: sizing.fillBlock ? "100%" : "fit-content",
  };
}

function resolveGridSlotStyle(
  slotPlacements: PhiGridLayoutProps["slotPlacements"],
  slotIndex: number,
  profile: "compact" | "medium" | "wide",
  fallbackSpan: number,
) {
  const placement = resolvePhiGridSlotPlacement(slotPlacements, slotIndex, profile, fallbackSpan);
  return { gridColumn: `${placement.offset + 1} / span ${placement.span}` } satisfies CSSProperties;
}

export function PhiGridLayout({
  slots,
  ...layoutProps
}: PhiGridLayoutProps) {
  // Named fields rather than the rest object: handing the compiler a whole rest object makes every
  // value later destructured out of it look like it may change, which costs the component its memoization.
  const isAuthoringRender = isPhiLayoutAuthoringRender({
    editSlotAction: layoutProps.editSlotAction,
    editSlotLabels: layoutProps.editSlotLabels,
    capabilities: layoutProps.capabilities,
  });
  const {
    gap = PHI_GRID_LAYOUT_DEFAULTS.gap as number | string,
    columnGap = PHI_GRID_LAYOUT_DEFAULTS.columnGap as number | string,
    slotPlacements,
    anchor,
    editSlotAnchor,
    align,
    justify,
    renderMode,
    style,
    slotStyle,
    editSlotAction,
    editRenderInsertControl,
    editSlotLabels,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    layoutKind = "grid",
  } = layoutProps;
  const { token } = antdTheme.useToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => setContainerWidth((current) => {
      const next = node.clientWidth;
      return current === next ? current : next;
    });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const responsiveProfile = containerWidth != null && containerWidth >= token.screenLG
    ? "wide"
    : containerWidth != null && containerWidth >= token.screenSM
      ? "medium"
      : "compact";
  const resolvedGap = normalizePhiCssSize(gap) ?? (PHI_GRID_LAYOUT_DEFAULTS.gap as number | string);
  const resolvedColumnGap =
    normalizePhiCssSize(columnGap) ?? (PHI_GRID_LAYOUT_DEFAULTS.columnGap as number | string);
  const resolvedPlacementAnchor = resolveGridPlacementAnchor(anchor, editSlotAnchor);
  const resolvedAlignItems = resolveGridAnchorAlign(resolvedPlacementAnchor) ?? align;
  const resolvedJustifyContent = resolveGridAnchorJustify(resolvedPlacementAnchor) ?? justify;
  const fallbackSpan = PHI_GRID_LAYOUT_DEFAULT_SPAN;
  const isEditMode = renderMode === "editor";
  const occupiedSlotIndices = slots.reduce<number[]>((next, slot, slotIndex) => {
    if (slot !== null && slot !== undefined && slot !== false) {
      next.push(slotIndex);
    }

    return next;
  }, []);
  const nextInsertSlotIndex = occupiedSlotIndices.length > 0 ? Math.max(...occupiedSlotIndices) + 1 : 0;
  const renderedSlots: ReactNode[] = slots.map((slot, slotIndex) => {
    if (slot === null || slot === undefined || slot === false) {
      return null;
    }

    return (
      <div
        key={slotIndex}
        className={phiLayoutSlotClassName(isAuthoringRender, "phi-grid-layout__slot")}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, true)}
        style={{
          ...resolveGridSlotStyle(slotPlacements, slotIndex, responsiveProfile, fallbackSpan),
          minWidth: 0,
          minHeight: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: resolvedAlignItems,
          justifyContent: resolvedJustifyContent,
          ...(slotStyle ?? {}),
        }}
      >
        <div style={resolveGridSlotPlacementStyle(slot)}>
          {slot}
        </div>
      </div>
    );
  });
  if (isEditMode && editSlotAction && editRenderInsertControl) {
    renderedSlots.push(
      <div
        key={`insert-${nextInsertSlotIndex}`}
        className={phiLayoutSlotClassName(isAuthoringRender, "phi-grid-layout__slot")}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, false)}
        style={{
          ...resolveGridSlotStyle(slotPlacements, nextInsertSlotIndex, responsiveProfile, fallbackSpan),
          minWidth: 0,
          width: "100%",
          height: "100%",
          minHeight: "var(--ant-control-height-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--ant-border-radius-lg)",
        }}
      >
        {editRenderInsertControl({
          presentation: "inline",
          slotIndex: nextInsertSlotIndex,
          label: editSlotLabels?.[nextInsertSlotIndex],
          onInsert: (targetSlotIndex) =>
            editSlotAction(targetSlotIndex, {
              defaultPickSection: "widget",
              allowWidgetSection: true,
              slotIndex: targetSlotIndex,
            }),
        })}
      </div>,
    );
  }
  const resolvedLayoutInset = resolvePhiLayoutInset({
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
  });
  const overlayStyle: CSSProperties = {
    position: "absolute",
    top: resolvedLayoutInset.top,
    right: resolvedLayoutInset.right,
    bottom: resolvedLayoutInset.bottom,
    left: resolvedLayoutInset.left,
    display: "grid",
    gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
    gap: 0,
    columnGap: resolvedColumnGap,
    rowGap: resolvedGap,
    alignContent: "start",
    pointerEvents: "none",
    zIndex: 0,
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", minWidth: 0 }}>
      {isEditMode ? (
        <div style={overlayStyle} aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <div
              key={`grid-guide-${index}`}
              style={{
                minWidth: 0,
                minHeight: "100%",
                border: "1px dashed var(--phi-debug-layer-slot-border)",
                borderRadius: "var(--ant-border-radius)",
                background: "var(--phi-debug-layer-slot-background-soft, transparent)",
              }}
            />
          ))}
        </div>
      ) : null}
      <PhiBaseLayout
        {...layoutProps}
        editSlotAction={undefined}
        editSlotLabels={undefined}
        layoutKind={layoutKind}
        slots={renderedSlots}
        gap={undefined}
        renderMode={renderMode}
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
          gap: 0,
          columnGap: resolvedColumnGap,
          rowGap: resolvedGap,
          alignContent: "start",
          gridAutoFlow: "row",
          minWidth: 0,
          zIndex: 1,
          ...style,
        }}
      >
      </PhiBaseLayout>
    </div>
  );
}
