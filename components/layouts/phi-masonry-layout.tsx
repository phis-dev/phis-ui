import type { CSSProperties, ReactNode } from "react";

import { normalizePhiCssSize } from "./phi-layout-contract";
import { PhiBaseLayout, type PhiBaseLayoutProps } from "./phi-base-layout";
import { resolvePhiLayoutDefaults } from "../../helpers/cms-layout-defaults";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../helpers/layout-authoring-markers";
import type { PhiResponsiveValue } from "../../types/responsive";
import { resolvePhiMasonryColumnProperties, resolvePhiMasonryColumns } from "./phi-masonry-contract";

const PHI_MASONRY_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("masonry");

export type PhiMasonryLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  /** How many columns at each width; each child stands under the one before it in its column. */
  columns?: PhiResponsiveValue<number>;
  /** The distance between children, across and down. */
  gap?: CSSProperties["gap"];
  style?: CSSProperties;
};

/**
 * Children in columns, each at its own height and directly under the one before it: no rows, so no
 * gaps where a short child stands beside a tall one. The browser fills the columns in order and evens
 * out where they end (`column-fill: balance`), so it is decided in the markup and nothing moves after
 * hydration. The order runs down a column, then on to the next.
 */
export function PhiMasonryLayout({
  slots,
  ...layoutProps
}: PhiMasonryLayoutProps) {
  const {
    columns,
    gap = PHI_MASONRY_LAYOUT_DEFAULTS.gap as number | string,
    renderMode,
    style,
    layoutKind = "masonry",
    editSlotAction,
    editSlotLabels,
    editRenderInsertControl,
  } = layoutProps;
  const resolvedGap = normalizePhiCssSize(gap) ?? normalizePhiCssSize(PHI_MASONRY_LAYOUT_DEFAULTS.gap as number | string) ?? "0px";
  const isAuthoringRender = isPhiLayoutAuthoringRender(layoutProps);
  const isEditMode = renderMode === "editor";
  /*
   * The column item. The distance below a child is the item's padding, not a margin on the child, and
   * the authoring slot is the element inside it, so a selected slot outlines the child and not the gap.
   * The column box takes the last gap back (`styles/layout.css`), so nothing is left under the longest
   * column. The insert control is given the same item, so the place a Widget will appear is the place
   * the button stands.
   */
  const renderMasonryItem = (key: string, hasContent: boolean, content: ReactNode) => (
    <div key={key} className="phi-masonry-layout__item">
      <div
        className={phiLayoutSlotClassName(isAuthoringRender)}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, hasContent)}
        style={{ minWidth: 0 }}
      >
        {content}
      </div>
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

  /*
   * The columns stand in a box of their own inside the Layout's: the Layout is the `phi-masonry`
   * container the column count is asked of, and a container cannot answer a query about itself.
   */
  return (
    <PhiBaseLayout
      {...layoutProps}
      layoutKind={layoutKind}
      slots={[
        <div key="columns" className="phi-masonry-layout__columns">
          {renderedItems}
        </div>,
      ]}
      renderMode={renderMode}
      gap={undefined}
      style={{
        minWidth: 0,
        containerType: "inline-size",
        containerName: "phi-masonry",
        ...resolvePhiMasonryColumnProperties(resolvePhiMasonryColumns(columns), resolvedGap),
        ...style,
      } as CSSProperties}
    >
    </PhiBaseLayout>
  );
}
