import {
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

import { resolvePhiLayoutBoxStyle } from "./phi-layout-contract";
import {
  resolvePhiBaseLayoutSlotStates,
  resolvePhiBaseLayoutChrome,
  type PhiBaseLayoutProps,
} from "./phi-layout-view-model";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
} from "../../helpers/layout-authoring-markers";

export type { PhiBaseLayoutProps } from "./phi-layout-view-model";

function resolvePhiRenderableBlockStyleValue(value: number | string | null | undefined) {
  return value == null || value === 0 || value === "0" || value === "0px" ? undefined : value;
}

export function PhiBaseLayout({
  slots,
  editSlotLabels,
  layoutKind,
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
  blockId,
  renderMode,
  visibility,
  enabled,
  capabilities,
  runtime,
  debugMode,
  className,
  size,
  minSize,
  maxSize,
  collapsedSizeHint,
  zIndex,
  opacity,
  shadow,
  margin = 0,
  gap = 0,
  initialSlotStates,
  style,
  editSlotAction,
  editRenderInsertControl,
}: PhiBaseLayoutProps) {
  const isAuthoringRender = isPhiLayoutAuthoringRender({ editSlotAction, editSlotLabels, capabilities });
  const slotList = slots ?? [];
  const resolvedSlotStates = resolvePhiBaseLayoutSlotStates(slotList.length, initialSlotStates);
  const resolvedRenderMode = renderMode ?? "live";
  const isEditMode = resolvedRenderMode === "editor";
  const resolvedVisibility = visibility ?? "visible";
  const resolvedEnabled = enabled ?? true;
  const resolvedDebugMode = debugMode ?? false;
  const resolvedSize =
    resolvedVisibility === "collapsed"
      ? collapsedSizeHint ?? size
      : size;
  const resolvedMargin = resolvePhiRenderableBlockStyleValue(margin);
  const resolvedGap = resolvePhiRenderableBlockStyleValue(gap);
  const resolvedZIndex = resolvePhiRenderableBlockStyleValue(zIndex ?? 0);
  const resolvedOpacity = opacity ?? 1;
  const resolveLayoutSlotNode = (slot: ReactNode, index: number) => {
    const slotState = resolvedSlotStates[index] ?? "expanded";

    if (slotState === "hidden") {
      return null;
    }

    if (slotState === "collapsed") {
      if (!isValidElement(slot)) {
        return null;
      }

      const elementSlot = slot as ReactElement<{ style?: CSSProperties }>;
      return cloneElement(elementSlot, {
        style: {
          ...(elementSlot.props.style ?? {}),
          width: 0,
          height: 0,
          minWidth: 0,
          minHeight: 0,
          flexBasis: 0,
          flexGrow: 0,
          flexShrink: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
        },
      });
    }

    return slot;
  };

  if (resolvedVisibility === "hidden") {
    return null;
  }

  const resolvedLiveSlots = slotList
    .map((slot, index) => resolveLayoutSlotNode(slot, index))
    .filter((slot): slot is ReactNode => slot !== null);
  const resolvedEditSlots = isEditMode
    ? (() => {
        const rendered: ReactNode[] = [];
        const inputSlots = slotList.length > 0 ? slotList : [null];

        inputSlots.forEach((slot, index) => {
          const resolvedSlot = resolveLayoutSlotNode(slot, index);
          if (resolvedSlot !== null) {
            rendered.push(resolvedSlot);
          }

          const nextSlotIndex = slotList.length > 0 ? index + 1 : 0;
          const insertButton = editSlotAction && editRenderInsertControl
            ? editRenderInsertControl({
                key: `insert-${index}`,
                presentation: "inline",
                slotIndex: nextSlotIndex,
                label: editSlotLabels?.[index],
                onInsert: (targetSlotIndex) =>
                  editSlotAction(targetSlotIndex, {
                    defaultPickSection: "widget",
                    allowWidgetSection: true,
                    slotIndex: targetSlotIndex,
                  }),
              })
            : null;
          if (insertButton !== null) {
            rendered.push(insertButton);
          }
        });

        return rendered;
      })()
    : resolvedLiveSlots;
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
  const resolvedContainerStyle = {
    ...resolvePhiLayoutBoxStyle({
      size: resolvedSize,
      minSize,
      maxSize,
    }),
    ...(resolvedZIndex == null ? {} : { zIndex: resolvedZIndex }),
    opacity: resolvedOpacity,
    ...(resolvedMargin == null
      ? {}
      : {
          marginTop: resolvedMargin,
          marginRight: resolvedMargin,
          marginBottom: resolvedMargin,
          marginLeft: resolvedMargin,
        }),
    ...(resolvedGap == null ? {} : { rowGap: resolvedGap, columnGap: resolvedGap }),
    ...resolvedLayoutStyle,
    ...(resolvedEnabled ? {} : { opacity: 0.5, pointerEvents: "none" }),
    flex: "1 1 auto",
    minWidth: 0,
    minHeight: 0,
    overflow: resolvedVisibility === "collapsed" ? "hidden" : undefined,
    ...style,
  } as CSSProperties;

  return (
    <div
      data-phi-block-id={blockId ?? undefined}
      data-layout-kind={layoutKind}
      data-phi-block-render-mode={resolvedRenderMode}
      data-phi-block-visibility={resolvedVisibility}
      data-phi-block-enabled={resolvedEnabled ? "true" : "false"}
      data-phi-block-selectable={capabilities?.selectable ? "true" : undefined}
      data-phi-block-draggable={capabilities?.draggable ? "true" : undefined}
      data-phi-block-hoverable={capabilities?.hoverable ? "true" : undefined}
      data-phi-block-activatable={capabilities?.activatable ? "true" : undefined}
      data-phi-block-focusable={capabilities?.focusable ? "true" : undefined}
      data-phi-block-droppable={capabilities?.droppable ? "true" : undefined}
      data-phi-block-selected={runtime?.selected ? "true" : undefined}
      data-phi-block-hovered={runtime?.hovered ? "true" : undefined}
      data-phi-block-dragging={runtime?.dragging ? "true" : undefined}
      data-phi-block-focused={runtime?.focused ? "true" : undefined}
      data-phi-block-active={runtime?.active ? "true" : undefined}
      data-phi-layout-debug-layer={phiLayoutDebugLayerMarker(isAuthoringRender)}
      data-phi-debug-scaffold={resolvedDebugMode ? "on" : undefined}
      data-phi-layout-has-explicit-layout-background={hasExplicitLayoutBackground ? "true" : "false"}
      className={["phi-layout", className].filter(Boolean).join(" ")}
      style={resolvedContainerStyle}
    >
      {backgroundLayer}
      {resolvedEditSlots}
    </div>
  );
}
