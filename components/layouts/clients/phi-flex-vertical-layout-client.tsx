import { type CSSProperties, type ReactNode } from "react";
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

const PHI_FLEX_VERTICAL_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("verticalflex");

export type PhiFlexVerticalLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  gap?: CSSProperties["gap"];
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  style?: CSSProperties;
};

export function PhiFlexVerticalLayout({
  slots,
  ...layoutProps
}: PhiFlexVerticalLayoutProps) {
  // Named fields rather than the rest object: handing the compiler a whole rest object makes every
  // value later destructured out of it look like it may change, which costs the component its memoization.
  const isAuthoringRender = isPhiLayoutAuthoringRender({
    editSlotAction: layoutProps.editSlotAction,
    editSlotLabels: layoutProps.editSlotLabels,
    capabilities: layoutProps.capabilities,
  });
  const {
    layoutKind = "verticalflex",
    gap = PHI_FLEX_VERTICAL_LAYOUT_DEFAULTS.gap as number | string,
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
  const resolvedVertical = true;
  const resolvedSlotStates = resolvePhiBaseLayoutSlotStates(slots.length, layoutProps.initialSlotStates);
  const resolvedGap =
    normalizePhiCssSize(gap) ?? (PHI_FLEX_VERTICAL_LAYOUT_DEFAULTS.gap as number | string);
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

  const resolvedFlowAlignment = resolvePhiFlexAxisAlignment(editSlotAnchor, resolvedVertical);

  function isRenderableSlotChild(child: ReactNode) {
    return child !== null && child !== undefined && child !== false;
  }

  const renderSlotChild = (child: ReactNode, index: number) => {
    const slotState = resolvedSlotStates[index] ?? "expanded";
    if (slotState === "hidden") {
      return null;
    }

    const slotSizing = resolvePhiLayoutSlotChildSizing(child);
    const shouldFillMainAxis = slotSizing.fillBlock && !slotSizing.hasExplicitHeight;
    const shouldFillCrossAxis = slotSizing.fillInline;

    return (
      <div
        key={`content-${index}`}
        className={phiLayoutSlotClassName(isAuthoringRender)}
        data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, true)}
        style={{
          flexGrow: shouldFillMainAxis ? 1 : 0,
          flexShrink: shouldFillMainAxis ? 1 : 0,
          flexBasis: shouldFillMainAxis ? "auto" : "auto",
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
          width: shouldFillCrossAxis ? "100%" : undefined,
          height: shouldFillMainAxis ? "100%" : undefined,
          minWidth: 0,
          minHeight: 0,
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
  const contentChildren = renderableSlots.map(({ child, index }) => renderSlotChild(child, index));
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
        data-layout-axis="vertical"
        className="phi-layout"
        data-phi-block-render-mode={resolvedRenderMode}
        data-phi-layout-debug-layer={phiLayoutDebugLayerMarker(isAuthoringRender)}
        data-phi-layout-has-explicit-layout-background={hasExplicitLayoutBackground ? "true" : "false"}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: resolvedFlowAlignment.alignItems,
          justifyContent: resolvedFlowAlignment.justifyContent,
          flexWrap: "nowrap",
          gap: resolvedGap,
          ...resolvedStyle,
        }}
      >
        {backgroundLayer}
        {contentChildren}
        {insertButton}
      </div>
  );
}
