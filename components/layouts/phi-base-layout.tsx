import {
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

import { resolvePhiLayoutBox } from "./phi-layout-contract";
import { omitPhiBlockProfiledDeclarations } from "../../helpers/block-geometry-profiles";
import {
  resolvePhiBaseLayoutSlotStates,
  resolvePhiBaseLayoutChrome,
  type PhiBaseLayoutProps,
} from "./phi-layout-view-model";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
} from "../../helpers/layout-authoring-markers";
import { PhiLayoutSurfaceBox } from "./phi-layout-surface-box";
import { joinPhiClassNames } from "../../helpers/class-names";

export type { PhiBaseLayoutProps } from "./phi-layout-view-model";


function resolvePhiRenderableBlockStyleValue(value: number | string | null | undefined) {
  return value == null || value === 0 || value === "0" || value === "0px" ? undefined : value;
}

export function PhiBaseLayout({
  slots,
  editSlotLabels,
  layoutKind,
  labelEnd,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  surface,
  underlay,
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
  margin = 0,
  gap = 0,
  initialSlotStates,
  style,
  editSlotAction,
}: PhiBaseLayoutProps) {
  const isAuthoringRender = isPhiLayoutAuthoringRender({
    editSlotAction,
    editSlotLabels,
    capabilities,
    renderMode,
  });
  const slotList = slots ?? [];
  const resolvedSlotStates = resolvePhiBaseLayoutSlotStates(slotList.length, initialSlotStates);
  const resolvedRenderMode = renderMode ?? "live";
  const resolvedVisibility = visibility ?? "visible";
  const resolvedEnabled = enabled ?? true;
  const resolvedDebugMode = debugMode ?? false;
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

  const resolvedSlots = slotList
    .map((slot, index) => resolveLayoutSlotNode(slot, index))
    .filter((slot): slot is ReactNode => slot !== null);
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
  const layoutBox = resolvePhiLayoutBox({
    size,
    minSize,
    maxSize,
    collapsedSizeHint,
    visibility: resolvedVisibility,
  });
  const resolvedContainerStyle = {
    ...layoutBox.style,
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
  /* A declaration handed to the stylesheet per profile is not written inline here either, `minWidth: 0` included. */
  const resolvedBoxStyle = omitPhiBlockProfiledDeclarations(resolvedContainerStyle, layoutBox.declarations);

  return (
    <PhiLayoutSurfaceBox
      blockId={blockId}
      surface={surface}
      ground={ground}
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
      {...layoutBox.attributes}
      className={joinPhiClassNames("phi-layout", className)}
      style={resolvedBoxStyle}
    >
      {underlay}
      {resolvedSlots}
    </PhiLayoutSurfaceBox>
  );
}
