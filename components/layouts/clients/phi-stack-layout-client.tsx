"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";

import {
  clampPhiSequenceTransitionMs,
  resolvePhiMotionDurationMs,
  type PhiMotionEasing,
} from "../../../helpers/motion";
import {
  shouldPhiCmsContentStayMounted,
  type PhiCmsMountPolicy,
} from "../../../types/cms-mount-policy";
import {
  resolvePhiLayoutInset,
} from "../phi-layout-contract";
import {
  resolvePhiBaseLayoutChrome,
  type PhiBaseLayoutProps,
} from "../phi-layout-view-model";
import { isRenderablePhiNode } from "../phi-layout-scaffold-utils";
import { PhiLayoutAnchoredOverlay } from "./phi-layout-anchored-overlay";
import { PhiSequenceSlotEditor } from "./phi-sequence-slot-editor";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import { resolvePhiSequenceEditableSlotCount, usePhiSlotSequence } from "../use-phi-slot-sequence";
import { usePhiConfig } from "../../root/phi-config-provider";

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
  defaultActiveSlotKey?: string;
  slotDisplay?: "single" | "stacked";
  mountPolicy?: PhiCmsMountPolicy;
  slotTransition?: "none" | "fade-over";
  slotTransitionDurationMs?: number;
  slotTransitionEasing?: PhiMotionEasing;
  slotAnchor?: PhiAnchorWidgetPlacement | null;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  style?: CSSProperties;
};


export function PhiStackLayout({
  slots,
  slotKeys,
  slotMeta,
  defaultActiveSlotKey,
  slotDisplay = "single",
  mountPolicy = "remount",
  slotTransition = "none",
  slotTransitionDurationMs,
  slotTransitionEasing,
  slotAnchor = "center",
  ...layoutProps
}: PhiStackLayoutProps) {
  // Named fields rather than the rest object: handing the compiler a whole rest object makes every
  // value later destructured out of it look like it may change, which costs the component its memoization.
  const authoring = {
    editSlotAction: layoutProps.editSlotAction,
    editSlotLabels: layoutProps.editSlotLabels,
    capabilities: layoutProps.capabilities,
  };
  const { token } = usePhiConfig();
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
    borderSource,
    border,
    borderRadius,
    effect,
    shadow,
    editSlotAction,
    editRenderInsertControl,
    editSlotAnchor = "center",
  } = layoutProps;
  const isEditMode = renderMode === "editor";
  /*
   * A pile, not a sequence.
   *
   * Every slot is drawn in the one box, in slot order, so the last one lies on top -- which is what a
   * later animation Widget will have to move against. Authoring stays one slot at a time: a pile has no
   * way to say which layer a dropped Widget belongs to.
   */
  const isStacked = slotDisplay === "stacked" && !isEditMode;
  const editableSlotCount = resolvePhiSequenceEditableSlotCount(slots, slotKeys);
  const chrome = {
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    background,
    borderSource,
    border,
    borderRadius,
    effect,
    shadow,
  };
  const outgoingSlotRef = useRef<HTMLDivElement | null>(null);
  const fadeAnimationRef = useRef<Animation | null>(null);
  const {
    activeIndex: resolvedActiveIndex,
    slotMeta: resolvedSlotMeta,
    setActiveIndex,
  } = usePhiSlotSequence({
    blockId,
    slots,
    slotKeys,
    // While authoring, the sequence reaches one slot past the last filled one -- the empty slot the
    // next child goes into. A page has no such slot and steps through what it holds.
    ...(isEditMode ? { slotCount: editableSlotCount } : {}),
    ...(slotMeta ? { slotLabels: slotMeta } : {}),
    ...(defaultActiveSlotKey === undefined ? {} : { defaultActiveSlotKey }),
  });

  /*
   * Which slots have ever been wanted, which is what `lazy-keep` keeps.
   *
   * It starts holding the first active slot, so the common case costs no extra render: the set grows
   * once per slot the first time somebody reaches it, and never again.
   */
  const [visitedSlotIndices, setVisitedSlotIndices] = useState<ReadonlySet<number>>(
    () => new Set([resolvedActiveIndex]),
  );
  if (!visitedSlotIndices.has(resolvedActiveIndex)) {
    // Adjusted during render rather than in an effect, the same way the transition below tracks the
    // index it is leaving: the memory has to be right for the render that first shows the slot, not
    // for the one after it.
    setVisitedSlotIndices(new Set(visitedSlotIndices).add(resolvedActiveIndex));
  }

  const [transitionState, setTransitionState] = useState(() => ({
    activeSlotIndex: resolvedActiveIndex,
    outgoingSlotIndex: null as number | null,
    sequence: 0,
  }));
  if (transitionState.activeSlotIndex !== resolvedActiveIndex) {
    setTransitionState({
      activeSlotIndex: resolvedActiveIndex,
      outgoingSlotIndex:
        slotTransition === "fade-over" && !isEditMode && !isStacked
          ? transitionState.activeSlotIndex
          : null,
      sequence: transitionState.sequence + 1,
    });
  }
  const transitionEnabled = slotTransition === "fade-over" && !isEditMode && !isStacked;
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
    /*
     * A configured length, or the theme's. Reduced motion still means none of it rather than less of
     * it: somebody who has asked for no movement has not asked for shorter movement.
     */
    const duration = slotTransitionDurationMs === undefined
      ? resolvePhiMotionDurationMs(token.motionDurationSlow)
      : clampPhiSequenceTransitionMs(slotTransitionDurationMs);
    if (reducedMotion || duration <= 0 || typeof outgoingSlot.animate !== "function") {
      outgoingSlot.style.opacity = "0";
      queueMicrotask(clearOutgoingSlot);
      return undefined;
    }

    const animation = outgoingSlot.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      {
        duration,
        easing: slotTransitionEasing ?? token.motionEaseOut,
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
  }, [
    outgoingSlotIndex,
    slotTransitionDurationMs,
    slotTransitionEasing,
    token.motionDurationSlow,
    token.motionEaseOut,
    transitionState.sequence,
  ]);

  if (isEditMode) {
    return (
      <PhiSequenceSlotEditor
        slots={slots}
        slotKeys={slotKeys}
        slotLabels={resolvedSlotMeta}
        slotCount={editableSlotCount}
        activeIndex={resolvedActiveIndex}
        onActiveIndexChange={setActiveIndex}
        slotNoun="stack slot"
        layoutKind={layoutKind}
        renderMode={renderMode}
        authoring={authoring}
        chrome={chrome}
        backgroundLayer={backgroundLayer}
        editSlotAction={editSlotAction}
        editRenderInsertControl={editRenderInsertControl}
        editSlotAnchor={editSlotAnchor}
        style={style}
      />
    );
  }

  const resolvedLayoutInset = resolvePhiLayoutInset(chrome);
  /*
   * The layer that keeps the box a box.
   *
   * The others are taken out of flow to lie over it, so without one in flow the stage would have no
   * content height of its own and a Stack that was not given a height would collapse to nothing.
   */
  const baseStackedSlotIndex = slots.findIndex((slot) => isRenderablePhiNode(slot));

  return (
    <div
      data-phi-stack-slot-display={isStacked ? "stacked" : "single"}
      data-phi-stack-slot-transition={slotTransition}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        boxSizing: "border-box",
        ...resolvePhiBaseLayoutChrome(chrome).style,
        ...style,
      }}
    >
      {backgroundLayer}
      <div
        data-phi-stack-stage="true"
        /*
         * The stage is as tall as the Stack, not as tall as the slot standing in it. A slot that is
         * only as tall as its content has no room to place that content, so an anchor of bottom or
         * middle drew at the top. Where the Stack itself has no height, a percentage against an auto
         * parent stays auto and the stage is content height as before.
         */
        style={{ position: "relative", width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}
      >
        {slots.map((slot, index) => {
          const isActive = index === resolvedActiveIndex;
          const isOutgoing = index === outgoingSlotIndex;
          /*
           * The outgoing slot counts as inside the window, which is how a fade survives `remount`:
           * the window lags by the length of the transition rather than cutting at the moment the
           * index changes.
           */
          const shouldMount = isStacked || shouldPhiCmsContentStayMounted({
            policy: mountPolicy,
            insideWindow: isActive || isOutgoing,
            hasEnteredWindow: visitedSlotIndices.has(index),
          });
          if (!shouldMount || !isRenderablePhiNode(slot)) return null;

          /*
           * Every layer stays reachable, and the one on top takes the pointer where they overlap. That
           * is what lying over something means; a layer that should let the click through says so with
           * its own content rather than by the Stack deciding for all of them.
           */
          const stackedLayerStyle: CSSProperties = index === baseStackedSlotIndex
            ? { position: "relative", zIndex: index }
            : { position: "absolute", insetBlock: 0, insetInline: 0, zIndex: index };

          return (
            <div
              key={slotKeys[index] ?? `slot-${index}`}
              ref={isOutgoing ? outgoingSlotRef : undefined}
              hidden={!isStacked && !isActive && !isOutgoing}
              inert={!isStacked && !isActive}
              aria-hidden={(!isStacked && !isActive) || undefined}
              data-phi-stack-slot-state={isStacked ? "stacked" : isActive ? "active" : isOutgoing ? "outgoing" : "inactive"}
              style={{
                width: "100%",
                height: "100%",
                minWidth: 0,
                minHeight: 0,
                ...(isStacked
                  ? stackedLayerStyle
                  : isOutgoing
                  ? {
                      position: "absolute",
                      insetBlock: 0,
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
