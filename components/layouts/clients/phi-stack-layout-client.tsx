"use client";

import { Button, Space, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { resolvePhiMotionDurationMs } from "../../../helpers/motion";
import {
  resolvePhiLayoutInset,
} from "../phi-layout-contract";
import {
  resolvePhiBaseLayoutChrome,
  type PhiBaseLayoutProps,
} from "../phi-layout-view-model";
import { isRenderablePhiNode } from "../phi-layout-scaffold-utils";
import { PhiLayoutAnchoredOverlay } from "./phi-layout-anchored-overlay";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import {
  usePhiSignalDispatcher,
  usePhiSignalListener,
} from "../../runtime/runtime-signal-bus";
import { usePhiSignalIdentity } from "../../runtime/runtime-signal-identity";
import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress } from "../../../types/signals";
import {
  PHI_STACK_ACTIVE_SLOT_KEY_SIGNAL_CHANNEL,
  PHI_STACK_ACTIVE_SLOT_SIGNAL_CHANNEL,
  PHI_STACK_META_SIGNAL_CHANNEL,
  type PhiStackSignalSlotMeta,
} from "../stack-signals";
import { usePhiConfig } from "../../root/phi-config-provider";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";

export type PhiStackLayoutSlotMeta = {
  key: string;
  label: string;
  slotIndex: number;
  hasContent?: boolean;
};

export type PhiStackLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  slotKeys: string[];
  slotMeta?: PhiStackLayoutSlotMeta[];
  activeSlotKey?: string;
  defaultActiveSlotKey?: string;
  mountPolicy?: "active" | "keep";
  slotTransition?: "none" | "fade-over";
  slotAnchor?: PhiAnchorWidgetPlacement | null;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  style?: CSSProperties;
};

function resolvePhiStackActiveIndex(
  slotKeys: string[],
  activeSlotKey?: string,
  defaultActiveSlotKey?: string,
) {
  const fallbackKey = defaultActiveSlotKey ?? slotKeys[0];
  const resolvedKey = activeSlotKey ?? fallbackKey;
  const index = slotKeys.indexOf(resolvedKey ?? "");

  return index >= 0 ? index : 0;
}

function clampPhiStackSlotIndex(index: number, slotCount: number) {
  return Math.min(Math.max(index, 0), Math.max(slotCount - 1, 0));
}

export function PhiStackLayout({
  slots,
  slotKeys,
  slotMeta,
  activeSlotKey,
  defaultActiveSlotKey,
  mountPolicy = "active",
  slotTransition = "none",
  slotAnchor = "center",
  ...layoutProps
}: PhiStackLayoutProps) {
  // Named fields rather than the rest object: handing the compiler a whole rest object makes every
  // value later destructured out of it look like it may change, which costs the component its memoization.
  const isAuthoringRender = isPhiLayoutAuthoringRender({
    editSlotAction: layoutProps.editSlotAction,
    editSlotLabels: layoutProps.editSlotLabels,
    capabilities: layoutProps.capabilities,
  });
  const { token } = usePhiConfig();
  const dispatchSignal = usePhiSignalDispatcher();
  const signalIdentity = usePhiSignalIdentity();
  const signalScope = signalIdentity.scope ?? "page";
  const {
    blockId,
    renderMode,
    style,
    layoutKind = "stack",
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
    editSlotAnchor = "center",
  } = layoutProps;
  const activeIndex = resolvePhiStackActiveIndex(slotKeys, activeSlotKey, defaultActiveSlotKey);
  const isEditMode = renderMode === "editor";
  const [controlledActiveSlot, setControlledActiveSlot] = useState<{
    key?: string;
    index: number;
  } | null>(null);
  const outgoingSlotRef = useRef<HTMLDivElement | null>(null);
  const fadeAnimationRef = useRef<Animation | null>(null);
  const stackSignalAddress = blockId == null ? null : createPhiSignalAddress("cms", blockId);
  const currentActiveIndex =
    controlledActiveSlot && controlledActiveSlot.key === stackSignalAddress
      ? controlledActiveSlot.index
      : activeIndex;
  const resolvedSlotMeta = useMemo<PhiStackSignalSlotMeta[]>(
    () =>
      slotKeys.map((key, index) => {
        const meta = slotMeta?.find((candidate) => candidate.slotIndex === index || candidate.key === key);
        const child = slots[index] ?? null;

        return {
          index,
          key,
          label: meta?.label?.trim() || key,
          hasContent: meta?.hasContent ?? isRenderablePhiNode(child),
        };
      }),
    [slotKeys, slotMeta, slots],
  );

  const publishStackMeta = useCallback(() => {
    if (!stackSignalAddress) {
      return;
    }

    dispatchSignal({
      scope: signalScope,
      channel: PHI_STACK_META_SIGNAL_CHANNEL,
      action: "change",
      value: {
        activeSlotIndex: clampPhiStackSlotIndex(currentActiveIndex, slots.length),
        slots: resolvedSlotMeta,
      },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.stackMeta,
      sender: stackSignalAddress,
      receiver: "broadcast",
    });
  }, [currentActiveIndex, dispatchSignal, resolvedSlotMeta, signalScope, slots.length, stackSignalAddress]);

  usePhiSignalListener(
    (signal) => {
      if (!stackSignalAddress) {
        return;
      }
      if (signal.receiver !== stackSignalAddress) {
        return;
      }

      if (signal.channel === PHI_STACK_ACTIVE_SLOT_SIGNAL_CHANNEL && signal.action === "change") {
        const activeSlotIndex = typeof signal.value === "number" ? signal.value : null;
        if (activeSlotIndex == null) {
          return;
        }
        setControlledActiveSlot({
          key: stackSignalAddress,
          index: clampPhiStackSlotIndex(activeSlotIndex, slots.length),
        });
        return;
      }

      if (signal.channel === PHI_STACK_ACTIVE_SLOT_KEY_SIGNAL_CHANNEL && signal.action === "change") {
        const nextIndex = typeof signal.value === "string" ? slotKeys.indexOf(signal.value) : -1;
        if (nextIndex < 0) {
          return;
        }
        setControlledActiveSlot({
          key: stackSignalAddress,
          index: nextIndex,
        });
        return;
      }

      if (signal.channel === PHI_STACK_META_SIGNAL_CHANNEL && signal.action === "activate") {
        publishStackMeta();
      }
    },
    useMemo(
      () => ({
        scopes: [signalScope],
        channels: [
          PHI_STACK_META_SIGNAL_CHANNEL,
          PHI_STACK_ACTIVE_SLOT_SIGNAL_CHANNEL,
          PHI_STACK_ACTIVE_SLOT_KEY_SIGNAL_CHANNEL,
        ],
      }),
      [signalScope],
    ),
  );

  useEffect(() => {
    publishStackMeta();
  }, [publishStackMeta]);

  const resolvedActiveIndex = clampPhiStackSlotIndex(currentActiveIndex, slots.length);
  const [transitionState, setTransitionState] = useState(() => ({
    activeSlotIndex: resolvedActiveIndex,
    outgoingSlotIndex: null as number | null,
    sequence: 0,
  }));
  if (transitionState.activeSlotIndex !== resolvedActiveIndex) {
    setTransitionState({
      activeSlotIndex: resolvedActiveIndex,
      outgoingSlotIndex:
        slotTransition === "fade-over" && !isEditMode
          ? transitionState.activeSlotIndex
          : null,
      sequence: transitionState.sequence + 1,
    });
  }
  const transitionEnabled = slotTransition === "fade-over" && !isEditMode;
  const outgoingSlotIndex =
    transitionEnabled && transitionState.outgoingSlotIndex !== resolvedActiveIndex
      ? transitionState.outgoingSlotIndex
      : null;

  useLayoutEffect(() => {
    fadeAnimationRef.current?.cancel();
    fadeAnimationRef.current = null;
    if (outgoingSlotIndex == null) return undefined;

    const outgoingSlot = outgoingSlotRef.current;
    if (!outgoingSlot) return undefined;

    const sequence = transitionState.sequence;
    const clearOutgoingSlot = () => {
      setTransitionState((current) => current.sequence === sequence
        ? { ...current, outgoingSlotIndex: null }
        : current);
    };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = resolvePhiMotionDurationMs(token.motionDurationSlow);
    if (reducedMotion || duration <= 0 || typeof outgoingSlot.animate !== "function") {
      outgoingSlot.style.opacity = "0";
      queueMicrotask(clearOutgoingSlot);
      return undefined;
    }

    const animation = outgoingSlot.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      {
        duration,
        easing: token.motionEaseOut,
        fill: "forwards",
      },
    );
    fadeAnimationRef.current = animation;
    animation.addEventListener("finish", () => {
      if (fadeAnimationRef.current !== animation) return;
      fadeAnimationRef.current = null;
      clearOutgoingSlot();
    }, { once: true });
    animation.addEventListener("cancel", () => {
      if (fadeAnimationRef.current === animation) fadeAnimationRef.current = null;
    }, { once: true });
    return () => {
      animation.cancel();
    };
  }, [outgoingSlotIndex, token.motionDurationSlow, token.motionEaseOut, transitionState.sequence]);

  if (isEditMode) {
    const editableSlotCount = Math.max(slots.length, 1);
    const currentIndex = clampPhiStackSlotIndex(currentActiveIndex, editableSlotCount);
    const currentSlot = slots[currentIndex] ?? null;
    const hasCurrentSlot = isRenderablePhiNode(currentSlot);
    const currentSlotKey = slotKeys[currentIndex] ?? `slot_${currentIndex + 1}`;
    const currentSlotLabel = resolvedSlotMeta.find((meta) => meta.index === currentIndex)?.label ?? currentSlotKey;
    const hasPreviousSlot = currentIndex > 0;
    const hasNextSlot = currentIndex < editableSlotCount - 1;
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
    const resolvedLayoutInset = resolvePhiLayoutInset({
      padding,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
    });

    const setCurrentIndex = (nextIndex: number) => {
      setControlledActiveSlot({
        key: stackSignalAddress ?? undefined,
        index: clampPhiStackSlotIndex(nextIndex, editableSlotCount),
      });
    };

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
            aria-label="Previous stack slot"
            icon={<LeftOutlined />}
            size="small"
            type="text"
            disabled={!hasPreviousSlot}
            onClick={(event) => {
              event.stopPropagation();
              setCurrentIndex(currentIndex - 1);
            }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12, minWidth: 64, textAlign: "center" }}>
            {currentIndex + 1} / {editableSlotCount}
          </Typography.Text>
          <Button
            aria-label="Next stack slot"
            icon={<RightOutlined />}
            size="small"
            type="text"
            disabled={!hasNextSlot}
            onClick={(event) => {
              event.stopPropagation();
              setCurrentIndex(currentIndex + 1);
            }}
          />
          {editSlotAction && editRenderInsertControl
            ? editRenderInsertControl({
              presentation: "inline",
              slotIndex: currentIndex + 1,
              label: currentSlotLabel,
              ariaLabel: "Add stack slot",
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
          data-phi-stack-active-slot={currentSlotKey}
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

  const resolvedLayoutInset = resolvePhiLayoutInset({
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
  });

  return (
    <div
      data-phi-stack-slot-transition={slotTransition}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        boxSizing: "border-box",
        ...resolvePhiBaseLayoutChrome({
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
        }).style,
        ...style,
      }}
    >
      {backgroundLayer}
      <div
        data-phi-stack-stage="true"
        style={{ position: "relative", width: "100%", minWidth: 0, minHeight: 0 }}
      >
        {slots.map((slot, index) => {
          const isActive = index === resolvedActiveIndex;
          const isOutgoing = index === outgoingSlotIndex;
          const shouldMount = mountPolicy === "keep" || isActive || isOutgoing;
          if (!shouldMount || !isRenderablePhiNode(slot)) return null;

          return (
            <div
              key={slotKeys[index] ?? `slot-${index}`}
              ref={isOutgoing ? outgoingSlotRef : undefined}
              hidden={!isActive && !isOutgoing}
              inert={!isActive}
              aria-hidden={!isActive || undefined}
              data-phi-stack-slot-state={isActive ? "active" : isOutgoing ? "outgoing" : "inactive"}
              style={{
                width: "100%",
                minWidth: 0,
                minHeight: 0,
                ...(isOutgoing
                  ? {
                      position: "absolute",
                      insetBlockStart: 0,
                      insetInline: 0,
                      zIndex: 1,
                      pointerEvents: "none",
                    }
                  : {
                      position: "relative",
                      zIndex: 0,
                    }),
              }}
            >
              <PhiLayoutAnchoredOverlay
                anchor={slotAnchor}
                positionMode="flow"
                fillAvailableInline
                fillAvailableBlock
                inset={resolvedLayoutInset}
              >
                {slot}
              </PhiLayoutAnchoredOverlay>
            </div>
          );
        })}
      </div>
    </div>
  );
}
