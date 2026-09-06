"use client";

import { Button, Space, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { CSSProperties, ReactNode } from "react";

import {
  resolvePhiLayoutInset,
  type PhiLayoutEditRenderInsertControl,
  type PhiLayoutKind,
} from "../phi-layout-contract";
import {
  resolvePhiBaseLayoutChrome,
  type PhiBaseLayoutProps,
} from "../phi-layout-view-model";
import { isRenderablePhiNode } from "../phi-layout-scaffold-utils";
import { PhiLayoutAnchoredOverlay } from "./phi-layout-anchored-overlay";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import type { PhiRenderableBlockRenderMode } from "../../../types";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
  type PhiLayoutAuthoringSignal,
} from "../../../helpers/layout-authoring-markers";

/**
 * Authoring a sequence, one slot at a time.
 *
 * A Stack shows one slot and a Carousel shows several, but neither is edited that way: a person
 * fills one slot, then steps to the next. So the Builder's view of both is the same view -- a step
 * counter, a slot, and somewhere to add the next one -- and the difference between the two layouts
 * exists only where somebody is reading the page.
 *
 * The moving parts stay outside. This component neither owns the index nor announces it; it is
 * handed one and reports the step somebody asked for, so the same signals drive the canvas as drive
 * the page.
 */

export type PhiSequenceSlotEditorProps = {
  slots: ReactNode[];
  slotKeys: string[];
  /** Labels as the sequence resolved them, so the canvas names a slot the way a pager does. */
  slotLabels: readonly { index: number; label: string }[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  /** What a slot of this layout is called, for the labels a screen reader reads out. */
  slotNoun: string;
  layoutKind: PhiLayoutKind;
  renderMode?: PhiRenderableBlockRenderMode;
  /**
   * The three props only the Builder passes, not the answer they add up to.
   *
   * This component writes the scaffold markers, so it is the one that has to ask -- a boolean handed
   * in would be a second thing to keep true, and a published page that received it by mistake would
   * carry the whole authoring model to people who cannot author.
   */
  authoring: PhiLayoutAuthoringSignal;
  chrome: Pick<
    PhiBaseLayoutProps,
    | "padding"
    | "paddingTop"
    | "paddingRight"
    | "paddingBottom"
    | "paddingLeft"
    | "background"
    | "border"
    | "borderRadius"
    | "effect"
    | "shadow"
  >;
  backgroundLayer?: ReactNode;
  editSlotAction?: PhiBaseLayoutProps["editSlotAction"];
  editRenderInsertControl?: PhiLayoutEditRenderInsertControl;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  style?: CSSProperties;
};

export function PhiSequenceSlotEditor({
  slots,
  slotKeys,
  slotLabels,
  activeIndex,
  onActiveIndexChange,
  slotNoun,
  layoutKind,
  renderMode,
  authoring,
  chrome,
  backgroundLayer,
  editSlotAction,
  editRenderInsertControl,
  editSlotAnchor = "center",
  style,
}: PhiSequenceSlotEditorProps) {
  const isAuthoringRender = isPhiLayoutAuthoringRender(authoring);
  const editableSlotCount = Math.max(slots.length, 1);
  const currentIndex = Math.min(activeIndex, editableSlotCount - 1);
  const currentSlot = slots[currentIndex] ?? null;
  const hasCurrentSlot = isRenderablePhiNode(currentSlot);
  const currentSlotKey = slotKeys[currentIndex] ?? `slot_${currentIndex + 1}`;
  const currentSlotLabel = slotLabels.find((meta) => meta.index === currentIndex)?.label ?? currentSlotKey;
  const hasPreviousSlot = currentIndex > 0;
  const hasNextSlot = currentIndex < editableSlotCount - 1;
  const {
    style: resolvedLayoutStyle,
    hasExplicitLayoutBackground,
  } = resolvePhiBaseLayoutChrome(chrome);
  const resolvedLayoutInset = resolvePhiLayoutInset(chrome);

  return (
    <div
      data-layout-kind={layoutKind}
      data-phi-block-render-mode={renderMode}
      data-phi-layout-debug-layer={phiLayoutDebugLayerMarker(isAuthoringRender)}
      data-phi-layout-has-explicit-layout-background={hasExplicitLayoutBackground ? "true" : "false"}
      className="phi-layout"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        ...resolvedLayoutStyle,
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        ...style,
      }}
    >
      {backgroundLayer}
      <Space
        align="center"
        size={8}
        style={{
          position: "relative",
          zIndex: 2,
          flex: "0 0 auto",
          width: "100%",
          justifyContent: "center",
          paddingBottom: "var(--ant-padding-xs)",
        }}
      >
        <Button
          aria-label={`Previous ${slotNoun}`}
          icon={<LeftOutlined />}
          size="small"
          type="text"
          disabled={!hasPreviousSlot}
          onClick={(event) => {
            event.stopPropagation();
            onActiveIndexChange(currentIndex - 1);
          }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, minWidth: 64, textAlign: "center" }}>
          {currentIndex + 1} / {editableSlotCount}
        </Typography.Text>
        <Button
          aria-label={`Next ${slotNoun}`}
          icon={<RightOutlined />}
          size="small"
          type="text"
          disabled={!hasNextSlot}
          onClick={(event) => {
            event.stopPropagation();
            onActiveIndexChange(currentIndex + 1);
          }}
        />
        {editSlotAction && editRenderInsertControl
          ? editRenderInsertControl({
            presentation: "inline",
            slotIndex: currentIndex + 1,
            label: currentSlotLabel,
            ariaLabel: `Add ${slotNoun}`,
            onInsert: (targetSlotIndex) =>
              editSlotAction(targetSlotIndex, {
                defaultPickSection: "widget",
                allowWidgetSection: true,
                slotIndex: targetSlotIndex,
              }),
          })
          : null}
      </Space>
      <div
        className={phiLayoutSlotClassName(isAuthoringRender)}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, hasCurrentSlot)}
        data-phi-sequence-active-slot={currentSlotKey}
        style={{
          position: "relative",
          display: "flex",
          flex: "1 1 auto",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {hasCurrentSlot ? (
          <PhiLayoutAnchoredOverlay
            anchor={editSlotAnchor}
            positionMode="flow"
            fillAvailableInline
            fillAvailableBlock
            inset={resolvedLayoutInset}
          >
            {currentSlot}
          </PhiLayoutAnchoredOverlay>
        ) : null}
        {!hasCurrentSlot && editSlotAction && editRenderInsertControl
          ? editRenderInsertControl({
            presentation: "overlay",
            slotIndex: currentIndex,
            label: currentSlotLabel,
            anchor: editSlotAnchor,
            inset: resolvedLayoutInset,
            onInsert: (targetSlotIndex) =>
              editSlotAction(targetSlotIndex, {
                defaultPickSection: "widget",
                allowWidgetSection: true,
                slotIndex: targetSlotIndex,
              }),
          })
          : null}
      </div>
    </div>
  );
}
