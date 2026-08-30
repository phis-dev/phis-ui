"use client";

import {
  createContext,
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  resolvePhiLayoutBoxStyle,
  type PhiBaseLayoutSlotStates,
  type PhiBaseLayoutSlotState,
} from "../phi-layout-contract";
import {
  resolvePhiBaseLayoutSlotStates,
  resolvePhiBaseLayoutChrome,
  type PhiBaseLayoutProps,
} from "../phi-layout-view-model";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
} from "../../../helpers/layout-authoring-markers";

export type { PhiBaseLayoutProps } from "../phi-layout-view-model";

type PhiBaseLayoutSlotStateContextValue = {
  parent: PhiBaseLayoutSlotStateContextValue | null;
  slotStates: PhiBaseLayoutSlotState[];
  setSlotState: (slotIndex: number, nextState: PhiBaseLayoutSlotState) => void;
  toggleSlotState: (slotIndex: number) => void;
  expandSlot: (slotIndex: number) => void;
  collapseSlot: (slotIndex: number) => void;
  hideSlot: (slotIndex: number) => void;
  showSlot: (slotIndex: number) => void;
};

const PhiBaseLayoutSlotStateContext = createContext<PhiBaseLayoutSlotStateContextValue | null>(null);

function resolvePhiRenderableBlockStyleValue(value: number | string | null | undefined) {
  return value == null || value === 0 || value === "0" || value === "0px" ? undefined : value;
}

export function resolvePhiLayoutEmptySlotFrameStyle(options: {
  hasContent: boolean;
  slotState: PhiBaseLayoutSlotState;
  frameRadius: CSSProperties["borderRadius"];
  editFrameBackground?: CSSProperties["background"];
  minHeight: CSSProperties["minHeight"];
}): CSSProperties {
  const { hasContent, slotState, frameRadius, editFrameBackground, minHeight } = options;
  const frameBorderColor = hasContent
    ? "rgba(0, 0, 0, 0.14)"
    : slotState === "collapsed"
      ? "var(--phi-debug-layer-slot-border-strong)"
      : "var(--phi-debug-layer-slot-border)";

  return {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    minWidth: 0,
    flex: "1 1 auto",
    alignSelf: "stretch",
    border: `1px dashed ${frameBorderColor}`,
    borderRadius: frameRadius,
    background: editFrameBackground ?? (hasContent ? "transparent" : "var(--phi-debug-layer-slot-background)"),
    padding: 0,
    minHeight,
    overflow: "hidden",
    boxShadow: "inset 0 0 0 1px var(--phi-debug-layer-slot-border-strong)",
  };
}

function resolvePhiBaseLayoutAncestorContext(
  context: PhiBaseLayoutSlotStateContextValue | null,
  ancestorLevel: number,
) {
  let current = context;
  let remaining = ancestorLevel;

  while (current && remaining > 0) {
    current = current.parent;
    remaining -= 1;
  }

  return current;
}

export function usePhiBaseLayoutSlotState(slotIndex: number, ancestorLevel = 0) {
  const context = useContext(PhiBaseLayoutSlotStateContext);
  const targetContext = resolvePhiBaseLayoutAncestorContext(context, ancestorLevel);
  if (!targetContext) {
    return null;
  }

  return targetContext.slotStates[slotIndex] ?? "expanded";
}

export function usePhiBaseLayoutSlotStates(ancestorLevel = 0) {
  const context = useContext(PhiBaseLayoutSlotStateContext);
  const targetContext = resolvePhiBaseLayoutAncestorContext(context, ancestorLevel);
  if (!targetContext) {
    return null;
  }

  return targetContext.slotStates;
}

export function usePhiBaseLayoutSlotController(slotIndex: number, ancestorLevel = 0) {
  const context = useContext(PhiBaseLayoutSlotStateContext);
  const targetContext = resolvePhiBaseLayoutAncestorContext(context, ancestorLevel);
  const state = targetContext?.slotStates[slotIndex] ?? "expanded";

  return useMemo(
    () =>
      targetContext
        ? {
            state,
            setState: (nextState: PhiBaseLayoutSlotState) => targetContext.setSlotState(slotIndex, nextState),
            toggle: () => targetContext.toggleSlotState(slotIndex),
            expand: () => targetContext.expandSlot(slotIndex),
            collapse: () => targetContext.collapseSlot(slotIndex),
            hide: () => targetContext.hideSlot(slotIndex),
            show: () => targetContext.showSlot(slotIndex),
          }
        : null,
    [targetContext, slotIndex, state],
  );
}

function usePhiBaseLayoutSlotStateContext(
  slotCount: number,
  initialSlotStates?: PhiBaseLayoutSlotStates,
) {
  const parentSlotContext = useContext(PhiBaseLayoutSlotStateContext);
  const [slotStates, setSlotStates] = useState<PhiBaseLayoutSlotState[]>(() =>
    resolvePhiBaseLayoutSlotStates(slotCount, initialSlotStates),
  );
  const resolvedSlotStates = useMemo(
    () => resolvePhiBaseLayoutSlotStates(slotCount).map((state, index) => slotStates[index] ?? state),
    [slotCount, slotStates],
  );

  const setSlotState = useCallback((slotIndex: number, nextState: PhiBaseLayoutSlotState) => {
    setSlotStates((current) => {
      const next = current.slice();
      while (next.length <= slotIndex) {
        next.push("expanded");
      }
      next[slotIndex] = nextState;
      return next;
    });
  }, []);

  const toggleSlotState = useCallback((slotIndex: number) => {
    setSlotStates((current) => {
      const next = current.slice();
      while (next.length <= slotIndex) {
        next.push("expanded");
      }
      next[slotIndex] = next[slotIndex] === "collapsed" ? "expanded" : "collapsed";
      return next;
    });
  }, []);

  return useMemo<PhiBaseLayoutSlotStateContextValue>(
    () => ({
      parent: parentSlotContext,
      slotStates: resolvedSlotStates,
      setSlotState,
      toggleSlotState,
      expandSlot: (slotIndex) => setSlotState(slotIndex, "expanded"),
      collapseSlot: (slotIndex) => setSlotState(slotIndex, "collapsed"),
      hideSlot: (slotIndex) => setSlotState(slotIndex, "hidden"),
      showSlot: (slotIndex) => setSlotState(slotIndex, "expanded"),
    }),
    [parentSlotContext, resolvedSlotStates, setSlotState, toggleSlotState],
  );
}

export function PhiBaseLayoutSlotStateProvider({
  slotCount,
  initialSlotStates,
  children,
}: {
  slotCount: number;
  initialSlotStates?: PhiBaseLayoutSlotStates;
  children: ReactNode;
}) {
  const resolvedContext = usePhiBaseLayoutSlotStateContext(slotCount, initialSlotStates);

  return (
    <PhiBaseLayoutSlotStateContext.Provider value={resolvedContext}>
      {children}
    </PhiBaseLayoutSlotStateContext.Provider>
  );
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
  const slotCount = slots?.length ?? 0;
  const slotList = slots ?? [];
  const resolvedContext = usePhiBaseLayoutSlotStateContext(slotCount, initialSlotStates);
  const resolvedSlotStates = resolvedContext.slotStates;

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
      const slotStyle = elementSlot.props.style;
      return cloneElement(elementSlot, {
        style: {
          ...(slotStyle ?? {}),
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

  const resolvedLiveSlots = (slots ?? [])
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
    ...(resolvedGap == null
      ? {}
      : {
          rowGap: resolvedGap,
          columnGap: resolvedGap,
        }),
    ...resolvedLayoutStyle,
    ...(resolvedEnabled
      ? {}
      : {
          opacity: 0.5,
          pointerEvents: "none",
        }),
    flex: "1 1 auto",
    minWidth: 0,
    minHeight: 0,
    overflow: resolvedVisibility === "collapsed" ? "hidden" : undefined,
    ...style,
  } as CSSProperties;

  return (
    <PhiBaseLayoutSlotStateContext.Provider value={resolvedContext}>
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
    </PhiBaseLayoutSlotStateContext.Provider>
  );
}
