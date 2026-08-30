import { isValidElement, type CSSProperties, type ReactNode } from "react";
import {
  normalizePhiCssSize,
  resolvePhiFlexAxisAlignment,
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

const PHI_FLEX_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("flex");

type PhiFlexLayoutDistribution = "anchor" | "between" | "around" | "evenly";

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
  });
  const {
    layoutKind = "flex",
    gap = PHI_FLEX_LAYOUT_DEFAULTS.gap as number | string,
    distribution = (PHI_FLEX_LAYOUT_DEFAULTS.distribution as PhiFlexLayoutDistribution | undefined) ?? "anchor",
    wrap = PHI_FLEX_LAYOUT_DEFAULTS.wrap as boolean | CSSProperties["flexWrap"] | undefined,
    verticalSeparators = false,
    separatorBeforeFirst = false,
    separatorSpan = PHI_FLEX_LAYOUT_DEFAULTS.separatorSpan as number | string,
    editSlotAnchor,
    renderMode,
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
    editSlotAction,
    editRenderInsertControl,
    editSlotLabels,
    style,
  } = layoutProps;
  const resolvedVertical = false;
  const resolvedSlotStates = resolvePhiBaseLayoutSlotStates(slots.length, layoutProps.initialSlotStates);
  const resolvedGap = normalizePhiCssSize(gap) ?? (PHI_FLEX_LAYOUT_DEFAULTS.gap as number | string);
  const resolvedRenderMode = renderMode ?? "live";
  const isEditMode = resolvedRenderMode === "editor";
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
    const shouldFillMainAxis =
      (resolvedVertical ? slotSizing.fillBlock : slotSizing.fillInline) &&
      !(resolvedVertical ? slotSizing.hasExplicitHeight : slotSizing.hasExplicitWidth);
    const shouldFillCrossAxis = resolvedVertical ? slotSizing.fillInline : slotSizing.fillBlock;
    const minMainSize = resolvedVertical ? slotSizing.minBlockSize : slotSizing.minInlineSize;
    const maxMainSize = resolvedVertical ? slotSizing.maxBlockSize : slotSizing.maxInlineSize;
    const minCrossSize = resolvedVertical ? slotSizing.minInlineSize : slotSizing.minBlockSize;
    const maxCrossSize = resolvedVertical ? slotSizing.maxInlineSize : slotSizing.maxBlockSize;
    const shouldWrap = resolvedWrap != null && resolvedWrap !== "nowrap";
    const usesMinMainBasis = shouldWrap && minMainSize != null;
    const canShrinkWithinMax = shouldWrap && maxMainSize != null;
    const flexBasis =
      usesMinMainBasis
        ? minMainSize
        : shouldFillMainAxis
          ? 0
          : "auto";

    return (
      <div
        key={`content-${index}`}
        className={phiLayoutSlotClassName(isAuthoringRender)}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, true)}
        style={{
          flexGrow: shouldFillMainAxis ? 1 : 0,
          flexShrink: shouldFillMainAxis || usesMinMainBasis || canShrinkWithinMax ? 1 : 0,
          flexBasis,
          ...(slotState === "collapsed"
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
            : {}),
          width: resolvedVertical ? (shouldFillCrossAxis ? "100%" : undefined) : undefined,
          height: resolvedVertical
            ? shouldFillMainAxis ? "100%" : undefined
            : shouldFillCrossAxis ? "100%" : undefined,
          minWidth: resolvedVertical ? (minCrossSize ?? 0) : (minMainSize ?? 0),
          minHeight: resolvedVertical ? (minMainSize ?? 0) : (minCrossSize ?? 0),
          maxWidth: resolvedVertical ? maxCrossSize : maxMainSize,
          maxHeight: resolvedVertical ? maxMainSize : maxCrossSize,
          alignSelf: shouldFillCrossAxis ? "stretch" : undefined,
          display: "flex",
          flexDirection: "column",
        }}
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
    isEditMode && editSlotAction && editRenderInsertControl ? (
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
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    ...style,
  };

  return (
    <div
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
      {backgroundLayer}
      {renderedContentChildren}
      {insertButton}
    </div>
  );
}
