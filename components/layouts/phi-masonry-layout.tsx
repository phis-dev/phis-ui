import type { CSSProperties, ReactNode } from "react";

import { normalizePhiCssSize } from "./phi-layout-contract";
import { PhiBaseLayout, type PhiBaseLayoutProps } from "./phi-base-layout";
import { resolvePhiLayoutDefaults } from "../../helpers/cms-layout-defaults";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../helpers/layout-authoring-markers";

const PHI_MASONRY_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("masonry");

export type PhiMasonryLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  columns?: number;
  minColumnWidth?: CSSProperties["minWidth"];
  gap?: CSSProperties["gap"];
  style?: CSSProperties;
};

export function PhiMasonryLayout({
  slots,
  ...layoutProps
}: PhiMasonryLayoutProps) {
  const {
    columns = PHI_MASONRY_LAYOUT_DEFAULTS.columns as number,
    minColumnWidth,
    gap = PHI_MASONRY_LAYOUT_DEFAULTS.gap as number | string,
    renderMode,
    style,
    layoutKind = "masonry",
    editSlotAction,
    editSlotLabels,
    editRenderInsertControl,
  } = layoutProps;
  const resolvedGap = normalizePhiCssSize(gap) ?? (PHI_MASONRY_LAYOUT_DEFAULTS.gap as number | string);
  const resolvedColumns = Number.isFinite(columns) && columns > 0 ? Math.floor(columns) : 3;
  const resolvedMinColumnWidth = normalizePhiCssSize(minColumnWidth);
  const isAuthoringRender = isPhiLayoutAuthoringRender(layoutProps);
  const isEditMode = renderMode === "editor";
  /*
   * The column item, the one wrapper a Masonry child stands in; `breakInside` is what keeps it whole
   * when the column breaks. The insert control is given the same one, so the place a Widget will appear
   * is the place the button stands.
   */
  const renderMasonryItem = (key: string, hasContent: boolean, content: ReactNode) => (
    <div
      key={key}
      className={phiLayoutSlotClassName(isAuthoringRender)}
      data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, hasContent)}
      style={{
        display: "inline-block",
        width: "100%",
        minWidth: 0,
        breakInside: "avoid",
        pageBreakInside: "avoid",
        marginBottom: resolvedGap,
      }}
    >
      {content}
    </div>
  );
  /*
   * One insert control, at the end, drawn here rather than by the base layout.
   *
   * The base layout used to offer one after every slot -- a between-the-items model, and one that
   * counted an empty trailing entry of the slot array as a position of its own, so a Masonry with two
   * Widgets drew three buttons. Grid had already stopped taking that offer and stated its own; this is
   * the same, for the column flow, and the offer itself is gone now that nobody took it.
   */
  const occupiedSlotIndices = slots.reduce<number[]>((next, slot, slotIndex) => {
    if (slot !== null && slot !== undefined && slot !== false) {
      next.push(slotIndex);
    }

    return next;
  }, []);
  const nextInsertSlotIndex = occupiedSlotIndices.length > 0 ? Math.max(...occupiedSlotIndices) + 1 : 0;
  const renderedItems = occupiedSlotIndices.map((slotIndex) =>
    renderMasonryItem(`slot-${slotIndex}`, true, slots[slotIndex]));

  if (isEditMode && editSlotAction && editRenderInsertControl) {
    renderedItems.push(renderMasonryItem(
      `insert-${nextInsertSlotIndex}`,
      false,
      editRenderInsertControl({
        presentation: "inline",
        slotIndex: nextInsertSlotIndex,
        label: editSlotLabels?.[nextInsertSlotIndex],
        onInsert: (targetSlotIndex) =>
          editSlotAction(targetSlotIndex, {
            defaultPickSection: "widget",
            allowWidgetSection: true,
            slotIndex: targetSlotIndex,
          }),
      }),
    ));
  }

  return (
    <PhiBaseLayout
      {...layoutProps}
      layoutKind={layoutKind}
      slots={renderedItems}
      renderMode={renderMode}
      gap={resolvedGap}
      style={{
        minWidth: 0,
        columnCount: resolvedMinColumnWidth ? undefined : resolvedColumns,
        columnWidth: resolvedMinColumnWidth,
        columnGap: resolvedGap,
        columnFill: "balance",
        ...style,
      }}
    >
    </PhiBaseLayout>
  );
}
