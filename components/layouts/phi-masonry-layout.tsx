import type { CSSProperties, ReactNode } from "react";

import {
  normalizePhiCssSize,
  resolvePhiPlacement,
  resolvePhiSlotPlacementMargins,
} from "./phi-layout-contract";
import type { PhiAnchorWidgetPlacement } from "../controls/phi-anchor-control-contract";
import { phiSlotContainerAttributes } from "../../helpers/block-geometry-profiles";
import { resolvePhiLayoutSlotChildSizing } from "./clients/phi-layout-anchored-overlay";
import { PhiBaseLayout, type PhiBaseLayoutProps } from "./phi-base-layout";
import { resolvePhiLayoutDefaults } from "../../helpers/cms-layout-defaults";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../helpers/layout-authoring-markers";
import type { PhiResponsiveValue } from "../../types/responsive";
import { resolvePhiMasonryColumnProperties, resolvePhiMasonryColumns } from "./phi-masonry-contract";
import { PhiMasonryColumns } from "./phi-masonry-columns";
import { PHI_CMS_MAX_LAYOUT_SLOTS } from "../../constants/cms-layout-types";

const PHI_MASONRY_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("masonry");

export type PhiMasonryLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  /** How many columns at each width; each child stands under the one before it in its column. */
  columns?: PhiResponsiveValue<number>;
  /** The distance between children, across and down. */
  gap?: CSSProperties["gap"];
  /**
   * Where a child narrower than its column stands in it. Only the inline axis: an item is as tall as
   * its child, so there is no room on the block axis to place anything in.
   */
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  style?: CSSProperties;
};

/**
 * Children in columns, each at its own height and directly under the one before it: no rows, so no
 * gaps where a short child stands beside a tall one. Each child goes under the column that ends highest
 * (`PhiMasonryColumns`); until the browser can measure, the server's multi-column flow stands in.
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
    editSlotAnchor,
  } = layoutProps;
  /*
   * The anchor as the margins a child is moved by. A slot is a block box as wide as its column, and an
   * `intrinsic` child is `width: fit-content` in it -- a definite width, so `margin-inline: auto` places
   * it. The block axis states `0`: the item is the child's height and has nothing over. Every slot
   * states all four, which is what stops a Layout further up from placing this one's children.
   */
  const placement = resolvePhiPlacement(editSlotAnchor);
  const slotPlacementMargins = resolvePhiSlotPlacementMargins({ inline: placement.inline, block: null });
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
    <div
      key={key}
      className="phi-masonry-layout__item"
      /* The column is the room a profiled child is offered. */
      {...phiSlotContainerAttributes(hasContent && resolvePhiLayoutSlotChildSizing(content).queriesRoom)}
    >
      <div
        className={phiLayoutSlotClassName(isAuthoringRender)}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, hasContent)}
        style={{ minWidth: 0, ...slotPlacementMargins } as CSSProperties}
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

  if (isEditMode && editSlotAction && editRenderInsertControl && nextInsertSlotIndex < PHI_CMS_MAX_LAYOUT_SLOTS) {
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
        <PhiMasonryColumns key="columns">{renderedItems}</PhiMasonryColumns>,
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
