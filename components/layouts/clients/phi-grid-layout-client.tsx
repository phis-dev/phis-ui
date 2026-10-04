"use client";

import type { CSSProperties, ReactNode } from "react";

import {
  normalizePhiCssSize,
  resolvePhiLayoutInset,
  phiGridPlacementWord,
  phiPlacementFromWord,
  resolvePhiPlacement,
  resolvePhiSlotPlacementMargins,
} from "../phi-layout-contract";
import type { PhiGridLayoutProps } from "../phi-grid-contract";
import { PhiBaseLayout } from "../phi-base-layout";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import { resolvePhiLayoutSlotChildSizing } from "./phi-layout-anchored-overlay";
import {
  PHI_GRID_LAYOUT_PROFILES,
  resolvePhiGridColumns,
  resolvePhiGridSlotColumnProperties,
  resolvePhiGridSlotGapShares,
  resolvePhiGridSlotProfileColumns,
  type PhiGridColumnCount,
  type PhiGridLayoutProfile,
} from "../phi-grid-contract";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";
import { PHI_CMS_MAX_LAYOUT_SLOTS } from "../../../constants/cms-layout-types";

const PHI_GRID_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("grid");

export type { PhiGridLayoutProps } from "../phi-grid-contract";

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
    /* `fit-content` where the child states its own size, so the cell's placement has room to place it. */
    width: sizing.stretchesInline ? "100%" : "fit-content",
    height: sizing.stretchesBlock ? "100%" : "fit-content",
  };
}

/*
 * The edit overlay's guides: one per column of the row, for every width, and the Grid's container
 * queries show the set its width answers (`styles/layout.css`, `.phi-grid-layout__guide`). Each is inset
 * by its share of the gap the same way a slot is (`resolvePhiGridSlotGapShares`): the tracks are flush,
 * so a guide that filled its tracks would draw one continuous band where the operator is meant to see
 * columns and the gaps between them.
 */
function renderGridGuides(profile: PhiGridLayoutProfile, columns: PhiGridColumnCount) {
  const tracks = 24 / columns;
  return Array.from({ length: columns }, (_, index) => {
    const placement = { start: index * tracks + 1, span: tracks };
    const shares = resolvePhiGridSlotGapShares(placement);
    return (
      <div
        key={`grid-guide-${profile}-${index}`}
        className={`phi-grid-layout__guide phi-grid-layout__guide--${profile}`}
        style={{
          gridColumn: `${placement.start} / span ${placement.span}`,
          gridRow: 1,
          minWidth: 0,
          minHeight: "100%",
          marginInlineStart: `calc(var(--phi-grid-column-gap, 0px) * ${shares.lead} / 24)`,
          marginInlineEnd: `calc(var(--phi-grid-column-gap, 0px) * ${shares.trail} / 24)`,
          border: "1px dashed var(--phi-debug-layer-slot-border)",
          borderRadius: "var(--ant-border-radius)",
          background: "var(--phi-debug-layer-slot-background-soft)",
        }}
      />
    );
  });
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
    renderMode: layoutProps.renderMode,
  });
  const {
    gap = PHI_GRID_LAYOUT_DEFAULTS.gap as number | string,
    columns,
    slotPlacements,
    anchor,
    editSlotAnchor,
    renderMode,
    style,
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
  const resolvedGap = normalizePhiCssSize(gap) ?? (PHI_GRID_LAYOUT_DEFAULTS.gap as number | string);
  /*
   * One reading of the anchor, in the grid spelling. The edit anchor arrives as one of the nine words,
   * where every axis is stated; the config anchor arrives as the pair, where an axis may be missing and
   * stays missing.
   */
  const placement = resolvePhiPlacement(editSlotAnchor ?? anchor);
  const resolvedAlignItems = phiGridPlacementWord(placement.block);
  const resolvedJustifyContent = phiGridPlacementWord(placement.inline);
  const slotPlacementMargins = resolvePhiSlotPlacementMargins({
    inline: phiPlacementFromWord(resolvedJustifyContent),
    block: null,
  });
  const isEditMode = renderMode === "editor";
  const occupiedSlotIndices = slots.reduce<number[]>((next, slot, slotIndex) => {
    if (slot !== null && slot !== undefined && slot !== false) {
      next.push(slotIndex);
    }

    return next;
  }, []);
  const nextInsertSlotIndex = occupiedSlotIndices.length > 0 ? Math.max(...occupiedSlotIndices) + 1 : 0;
  /*
   * Every profile's columns, not the one this Grid happens to be at: which applies is asked of the
   * Grid's own width by the container queries in `styles/layout.css` (`phi-grid`), so the server's
   * markup already stands where it will stay. The width was measured with a `ResizeObserver` before,
   * which the server cannot do -- every Grid was delivered at `compact`, one slot a row, and rebuilt
   * after hydration -- and it measured `clientWidth` of a wrapper around the Layout, padding included,
   * where the Form measures inside the padding. The container is now the Layout's own box, so a Grid
   * and a Form of the same room answer the same profile (LAYOUTING.md, "Grid slot placement").
   */
  const resolvedColumns = resolvePhiGridColumns(columns);
  const slotColumns = resolvePhiGridSlotProfileColumns(
    slotPlacements,
    isEditMode ? [...occupiedSlotIndices, nextInsertSlotIndex] : occupiedSlotIndices,
    resolvedColumns,
  );
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
          ...resolvePhiGridSlotColumnProperties(slotColumns.get(slotIndex)),
          boxSizing: "border-box",
          minWidth: 0,
          minHeight: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: resolvedAlignItems,
          justifyContent: resolvedJustifyContent,
          // The same placement as margins, for a child stretched to the cell and capped; see the Layout contract.
          ...slotPlacementMargins,
        } as CSSProperties}
      >
        <div style={resolveGridSlotPlacementStyle(slot)}>
          {slot}
        </div>
      </div>
    );
  });
  if (isEditMode && editSlotAction && editRenderInsertControl && nextInsertSlotIndex < PHI_CMS_MAX_LAYOUT_SLOTS) {
    renderedSlots.push(
      <div
        key={`insert-${nextInsertSlotIndex}`}
        className={phiLayoutSlotClassName(isAuthoringRender, "phi-grid-layout__slot")}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, false)}
        style={{
          ...resolvePhiGridSlotColumnProperties(slotColumns.get(nextInsertSlotIndex)),
          boxSizing: "border-box",
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
  /*
   * The edit guides sit inside the Layout's box rather than beside it. They stood in a wrapper with
   * the Layout, and that wrapper was the Grid's outer element: not `.phi-layout`, so the fill rules
   * (`.phi-slot-child--block-fill > .phi-layout`, styles/layout.css) never reached the Grid, and a Grid
   * in a filling slot took the height of its content. Absolutely placed in the Layout's padding box at
   * its inset, they cover the tracks as before; `zIndex: -1` in the Layout's own stacking context puts
   * them over its background and under its slots, where the wrapper's `zIndex` pair used to.
   */
  const guideOverlay = isEditMode ? (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: resolvedLayoutInset.top,
        right: resolvedLayoutInset.right,
        bottom: resolvedLayoutInset.bottom,
        left: resolvedLayoutInset.left,
        display: "grid",
        gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
        gap: 0,
        alignContent: "start",
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      {PHI_GRID_LAYOUT_PROFILES.flatMap((profile) => renderGridGuides(profile, resolvedColumns[profile]))}
    </div>
  ) : null;

  return (
    <PhiBaseLayout
      {...layoutProps}
      layoutKind={layoutKind}
      slots={renderedSlots}
      gap={undefined}
      renderMode={renderMode}
      underlay={guideOverlay}
      style={{
        position: "relative",
        /*
         * Its own stacking context, for the guides' `zIndex: -1`. It was `zIndex: 1`, which only lifted
         * the Layout over the guides beside it -- and over every sibling after it, and over the
         * `zIndex` the block states, which `style` overrode.
         */
        isolation: "isolate",
        /*
         * The box the profiles are measured on: its content box, inside the padding -- the width the
         * tracks have, and what a Form measures too.
         */
        containerType: "inline-size",
        containerName: "phi-grid",
        display: "grid",
        gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
        gap: 0,
        /*
         * No `column-gap`: the tracks are flush and each slot takes its share of the gap as padding
         * (`resolvePhiGridSlotGapShares`), so the gap costs only what falls between slots.
         */
        columnGap: 0,
        rowGap: resolvedGap,
        ["--phi-grid-column-gap" as string]: resolvedGap,
        alignContent: "start",
        gridAutoFlow: "row",
        minWidth: 0,
        ...style,
      } as CSSProperties}
    >
    </PhiBaseLayout>
  );
}
