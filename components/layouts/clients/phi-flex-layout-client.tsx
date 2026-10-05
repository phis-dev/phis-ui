import { isValidElement, type CSSProperties, type ReactNode } from "react";
import {
  normalizePhiCssSize,
  resolvePhiFlexAxisAlignment,
  phiPlacementFromWord,
  resolvePhiSlotPlacementMargins,
} from "../phi-layout-contract";
import { resolvePhiLayoutSlotChildSizing } from "./phi-layout-anchored-overlay";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import {
  resolvePhiBaseLayoutChrome,
  resolvePhiBaseLayoutSlotStates,
  type PhiBaseLayoutProps,
} from "../phi-layout-view-model";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";
import { PhiLayoutSurfaceBox } from "../phi-layout-surface-box";
import { PHI_CMS_MAX_LAYOUT_SLOTS } from "../../../constants/cms-layout-types";

type PhiFlexLayoutDistribution = "anchor" | "between" | "around" | "evenly";

/**
 * The Flex Layout, in a row or -- as `layoutKind: "verticalflex"` -- in a column.
 *
 * The column used to be a second component of its own, 105 lines the same as this one and the rest a
 * copy that had drifted; this one already branched on the axis everywhere it matters. The row's
 * distribution, wrapping and separators are the row's; the column states gap and anchor.
 */
export type PhiFlexLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  gap?: CSSProperties["gap"];
  distribution?: PhiFlexLayoutDistribution;
  wrap?: boolean | CSSProperties["flexWrap"];
  verticalSeparators?: boolean;
  separatorBeforeFirst?: boolean;
  separatorSpan?: CSSProperties["width"];
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  style?: CSSProperties;
};

export function PhiFlexLayout({
  slots,
  ...layoutProps
}: PhiFlexLayoutProps) {
  // Named fields rather than the rest object: handing the compiler a whole rest object makes every
  // value later destructured out of it look like it may change, which costs the component its memoization.
  const isAuthoringRender = isPhiLayoutAuthoringRender({
    editSlotAction: layoutProps.editSlotAction,
    editSlotLabels: layoutProps.editSlotLabels,
    capabilities: layoutProps.capabilities,
    renderMode: layoutProps.renderMode,
  });
  const resolvedVertical = layoutProps.layoutKind === "verticalflex";
  const layoutDefaults = resolvePhiLayoutDefaults(resolvedVertical ? "verticalflex" : "flex");
  const {
    layoutKind = "flex",
    gap = layoutDefaults.gap as number | string,
    distribution = (layoutDefaults.distribution as PhiFlexLayoutDistribution | undefined) ?? "anchor",
    wrap = layoutDefaults.wrap as boolean | CSSProperties["flexWrap"] | undefined,
    verticalSeparators = false,
    separatorBeforeFirst = false,
    separatorSpan = layoutDefaults.separatorSpan as number | string,
    editSlotAnchor,
    renderMode,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    surface,
    editSlotAction,
    editRenderInsertControl,
    editSlotLabels,
    style,
    labelEnd,
  } = layoutProps;
  const resolvedSlotStates = resolvePhiBaseLayoutSlotStates(slots.length, layoutProps.initialSlotStates);
  const resolvedGap = normalizePhiCssSize(gap) ?? (layoutDefaults.gap as number | string);
  const resolvedRenderMode = renderMode ?? "live";
  const isEditMode = resolvedRenderMode === "editor";
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

  const resolvedSeparatorSpan = normalizePhiCssSize(separatorSpan) ?? "75%";
  const resolvedSeparatorCrossSize =
    typeof resolvedSeparatorSpan === "string" ? `max(${resolvedSeparatorSpan}, 1rem)` : resolvedSeparatorSpan;
  const resolvedFlowAlignment = resolvePhiFlexAxisAlignment(editSlotAnchor, resolvedVertical);
  const resolvedJustifyContent =
    distribution === "between"
      ? "space-between"
      : distribution === "around"
        ? "space-around"
        : distribution === "evenly"
          ? "space-evenly"
          : resolvedFlowAlignment.justifyContent;
  const resolvedWrap = wrap === true ? "wrap" : wrap === false ? "nowrap" : wrap;

  const separatorStyle = resolvedVertical
    ? {
        width: resolvedSeparatorCrossSize,
        minWidth: resolvedSeparatorCrossSize,
        maxWidth: resolvedSeparatorCrossSize,
        height: 1,
        minHeight: 1,
        maxHeight: 1,
        alignSelf: "center" as const,
        backgroundColor: "var(--ant-color-border-secondary)",
        boxShadow: "inset 0 0 0 1px var(--ant-color-border-secondary)",
        pointerEvents: "none" as const,
      }
    : {
        width: 1,
        minWidth: 1,
        maxWidth: 1,
        height: resolvedSeparatorCrossSize,
        minHeight: resolvedSeparatorCrossSize,
        maxHeight: resolvedSeparatorCrossSize,
        alignSelf: "center" as const,
        marginInline: 0,
        backgroundColor: "var(--ant-color-border-secondary)",
        boxShadow: "inset 0 0 0 1px var(--ant-color-border-secondary)",
        pointerEvents: "none" as const,
      };

  const renderSeparator = (key: string) => (
    <div
      key={key}
      style={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: "auto",
        minWidth: 0,
        minHeight: 0,
        ...(resolvedVertical
          ? {
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }
          : {
              alignSelf: "stretch",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }),
      }}
    >
      <div aria-hidden="true" data-phi-flex-separator="true" style={separatorStyle} />
    </div>
  );

  function isFlexSeparatorChild(child: ReactNode) {
    return isValidElement(child) && (child.props as { "data-phi-flex-separator"?: unknown })["data-phi-flex-separator"] === "true";
  }

  function isRenderableSlotChild(child: ReactNode) {
    return child !== null && child !== undefined && child !== false;
  }

  const renderSlotChild = (child: ReactNode, index: number) => {
    if (isFlexSeparatorChild(child)) {
      return child;
    }

    const slotState = resolvedSlotStates[index] ?? "expanded";
    if (slotState === "hidden") {
      return null;
    }

    const slotSizing = resolvePhiLayoutSlotChildSizing(child);
    const collapsedStyle = slotState === "collapsed"
      ? {
          width: 0,
          minWidth: 0,
          maxWidth: 0,
          height: 0,
          minHeight: 0,
          maxHeight: 0,
          flexBasis: 0,
          flexGrow: 0,
          flexShrink: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none" as const,
        }
      : {};

    if (resolvedVertical) {
      const shouldFillMainAxis = slotSizing.stretchesBlock;
      const shouldFillCrossAxis = slotSizing.stretchesInline;
      return (
        <div
          key={`content-${index}`}
          className={phiLayoutSlotClassName(isAuthoringRender)}
          data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, true)}
          style={{
            flexGrow: shouldFillMainAxis ? 1 : 0,
            flexShrink: shouldFillMainAxis ? 1 : 0,
            flexBasis: "auto",
            ...collapsedStyle,
            width: shouldFillCrossAxis ? "100%" : undefined,
            height: shouldFillMainAxis ? "100%" : undefined,
            minWidth: 0,
            minHeight: 0,
            alignSelf: shouldFillCrossAxis ? "stretch" : undefined,
            display: "flex",
            flexDirection: "column",
            /*
             * The slot carries the Layout's own cross-axis alignment, because the slot is scaffolding and
             * the anchor is about the content. A slot is as wide as what it holds wants to be, and a child
             * that caps its width -- a column of copy at a readable measure -- is narrower than that: it
             * then stands at the left edge of a centred slot, which reads as "not centred" and is.
             *
             * Except where the child fills, which has to be stretched: `width: 100%` inside a shrink-to-fit
             * box is circular and resolves to zero, and a centred flex item is shrink-to-fit. That is not
             * a reason to give up the placement, though -- a filling child that also caps itself leaves
             * room over, and the placement margins put it in the middle of that room
             * instead. Stretching and placing are two jobs, and `align-items` can only do one of them.
             */
            alignItems: shouldFillCrossAxis ? "stretch" : resolvedFlowAlignment.alignItems,
            ...resolvePhiSlotPlacementMargins({
              inline: shouldFillCrossAxis ? phiPlacementFromWord(resolvedFlowAlignment.alignItems) : null,
              block: null,
            }),
          } as CSSProperties}
        >
          {child}
        </div>
      );
    }

    const shouldFillMainAxis = slotSizing.stretchesInline;
    const shouldFillCrossAxis = slotSizing.stretchesBlock;
    const minMainSize = slotSizing.minInlineSize;
    const maxMainSize = slotSizing.maxInlineSize;
    const minCrossSize = slotSizing.minBlockSize;
    const maxCrossSize = slotSizing.maxBlockSize;
    const shouldWrap = resolvedWrap != null && resolvedWrap !== "nowrap";
    const usesMinMainBasis = shouldWrap && minMainSize != null;
    const canShrinkWithinMax = shouldWrap && maxMainSize != null;
    const flexBasis =
      usesMinMainBasis
        ? minMainSize
        : shouldFillMainAxis
          ? 0
          : "auto";
    const slotPlacementMargins = resolvePhiSlotPlacementMargins({
      inline: shouldFillMainAxis ? phiPlacementFromWord(resolvedJustifyContent) : null,
      block: null,
    });

    return (
      <div
        key={`content-${index}`}
        className={phiLayoutSlotClassName(isAuthoringRender)}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, true)}
        style={{
          flexGrow: shouldFillMainAxis ? 1 : 0,
          flexShrink: shouldFillMainAxis || usesMinMainBasis || canShrinkWithinMax ? 1 : 0,
          flexBasis,
          ...collapsedStyle,
          height: shouldFillCrossAxis ? "100%" : undefined,
          minWidth: minMainSize ?? 0,
          minHeight: minCrossSize ?? 0,
          maxWidth: maxMainSize,
          maxHeight: maxCrossSize,
          alignSelf: shouldFillCrossAxis ? "stretch" : undefined,
          display: "flex",
          flexDirection: "column",
          /*
           * The inline placement again, as the margins a child that fills and caps itself is moved by.
           * In a row the inline axis is the main one, so a slot that grows and holds a capped child
           * places it by the Layout's `justify-content`. A slot that does not grow is as wide as its
           * child and states `0`, which is what stops a Flex Vertical further up from placing this
           * Layout's children.
           */
          ...slotPlacementMargins,
        } as CSSProperties}
      >
        {child}
      </div>
    );
  };

  const renderableSlots = slots
    .map((child, index) => ({ child, index }))
    .filter(({ child, index }) => isRenderableSlotChild(child) && (resolvedSlotStates[index] ?? "expanded") !== "hidden");

  const contentChildren =
    verticalSeparators || separatorBeforeFirst
      ? renderableSlots.flatMap(({ child, index }, visibleIndex) => {
          const parts: ReactNode[] = [];

          if (visibleIndex === 0) {
            if (separatorBeforeFirst) {
              parts.push(renderSeparator("separator-before-first"));
            }
          } else if (verticalSeparators) {
            parts.push(renderSeparator(`separator-${index}`));
          }

          parts.push(renderSlotChild(child, index));
          return parts;
        })
      : renderableSlots.map(({ child, index }) => renderSlotChild(child, index));
  const renderedContentChildren = contentChildren;
  const insertAfterSlotIndex = slots.length;
  const insertButton =
    isEditMode && editSlotAction && editRenderInsertControl && insertAfterSlotIndex < PHI_CMS_MAX_LAYOUT_SLOTS ? (
      <div
        key="insert"
        className={phiLayoutSlotClassName(isAuthoringRender)}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, false)}
        style={{
          flexGrow: 0,
          flexShrink: 0,
          flexBasis: "auto",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {editRenderInsertControl({
          presentation: "inline",
          slotIndex: insertAfterSlotIndex,
          label: editSlotLabels?.[insertAfterSlotIndex],
          onInsert: (targetSlotIndex) =>
            editSlotAction(targetSlotIndex, {
              defaultPickSection: "widget",
              allowWidgetSection: true,
              slotIndex: targetSlotIndex,
            }),
        })}
      </div>
    ) : null;

  const resolvedStyle: CSSProperties = {
    position: "relative",
    ...resolvedLayoutStyle,
    minWidth: 0,
    minHeight: 0,
    ...style,
  };

  return (
    <PhiLayoutSurfaceBox
      blockId={layoutProps.blockId}
      surface={surface}
      ground={ground}
      data-layout-kind={layoutKind}
      data-layout-axis={resolvedVertical ? "vertical" : "horizontal"}
      className="phi-layout"
      data-phi-block-render-mode={resolvedRenderMode}
      data-phi-layout-debug-layer={phiLayoutDebugLayerMarker(isAuthoringRender)}
      data-phi-layout-has-explicit-layout-background={hasExplicitLayoutBackground ? "true" : "false"}
      style={{
        display: "flex",
        flexDirection: resolvedVertical ? "column" : "row",
        alignItems: resolvedFlowAlignment.alignItems,
        justifyContent: resolvedJustifyContent,
        flexWrap: resolvedWrap,
        gap: resolvedGap,
        ...resolvedStyle,
      }}
    >
      {renderedContentChildren}
      {insertButton}
    </PhiLayoutSurfaceBox>
  );
}
