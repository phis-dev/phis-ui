"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PhiMotionEasing } from "../../../helpers/motion";
import {
  PhiSequenceViewport,
  type PhiSequenceAnchor,
  type PhiSequenceTransition,
} from "../../motion/phi-sequence-viewport";
import { resolvePhiLayoutInset } from "../phi-layout-contract";
import {
  resolvePhiBaseLayoutChrome,
  type PhiBaseLayoutProps,
} from "../phi-layout-view-model";
import { isRenderablePhiNode } from "../phi-layout-scaffold-utils";
import { PhiLayoutAnchoredOverlay } from "./phi-layout-anchored-overlay";
import { PhiSequenceSlotEditor } from "./phi-sequence-slot-editor";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import { usePhiSlotSequence } from "../use-phi-slot-sequence";
import { isPhiLayoutAuthoringRender } from "../../../helpers/layout-authoring-markers";

/**
 * A Stack with a wider window.
 *
 * Semantically the two are different acts, which is why they are two entries in the picker rather
 * than one with a switch: a Stack has one slot that is current, and a Carousel has a run of them in
 * view at once. Underneath they are the same three layers -- a viewport that knows children and an
 * index, a sequence that owns the index and its signals, and this, which says what an index means
 * once more than one slot is showing.
 *
 * Two things belong to a Carousel alone. It moves by itself, which a Stack never does, so the timer
 * lives here and writes through the same state a signal writes. And its slots are compacted: a
 * layout has twelve slots whether or not anybody filled them, and an empty one on a Stack is simply
 * never shown, while on a track it would be a gap that scrolls past. Only the filled slots ride the
 * track -- but they keep their slot indices outwards, so a pager Widget still names the slot a
 * person authored rather than a position in a list that changes as slots are filled.
 *
 * Mounting is not offered as a setting. The window already decides what exists, and a Carousel that
 * dropped a slot the moment it left the window would re-run its content every time somebody stepped
 * back. It is fixed to `lazy-keep`: nothing mounts before it is first needed, nothing unmounts until
 * the page goes.
 */

export type PhiCarouselLayoutSlotMeta = {
  key: string;
  label: string;
  slotIndex: number;
  hasContent?: boolean;
};

export type PhiCarouselLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  slotKeys: string[];
  slotMeta?: PhiCarouselLayoutSlotMeta[];
  activeSlotKey?: string;
  defaultActiveSlotKey?: string;
  visibleSlots?: number;
  windowAnchor?: PhiSequenceAnchor;
  transition?: PhiSequenceTransition;
  transitionDurationMs?: number;
  transitionEasing?: PhiMotionEasing;
  slotGap?: number | string;
  loop?: boolean;
  /** Absent or zero means it does not move on its own. */
  autoplayMs?: number;
  lookahead?: number;
  slotAnchor?: PhiAnchorWidgetPlacement | null;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  style?: CSSProperties;
};

export function PhiCarouselLayout({
  slots,
  slotKeys,
  slotMeta,
  activeSlotKey,
  defaultActiveSlotKey,
  visibleSlots = 1,
  windowAnchor = "start",
  transition = "slide",
  transitionDurationMs,
  transitionEasing,
  slotGap = 0,
  loop = false,
  autoplayMs = 0,
  lookahead = 1,
  slotAnchor = "center",
  ...layoutProps
}: PhiCarouselLayoutProps) {
  // Named fields rather than the rest object: handing the compiler a whole rest object makes every
  // value later destructured out of it look like it may change, which costs the component its memoization.
  const isAuthoringRender = isPhiLayoutAuthoringRender({
    editSlotAction: layoutProps.editSlotAction,
    editSlotLabels: layoutProps.editSlotLabels,
    capabilities: layoutProps.capabilities,
  });
  const {
    blockId,
    renderMode,
    style,
    layoutKind = "carousel",
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
  const isEditMode = renderMode === "editor";
  const {
    activeIndex,
    slotMeta: resolvedSlotMeta,
    setActiveIndex,
  } = usePhiSlotSequence({
    blockId,
    slots,
    slotKeys,
    ...(slotMeta ? { slotLabels: slotMeta } : {}),
    ...(activeSlotKey === undefined ? {} : { activeSlotKey }),
    ...(defaultActiveSlotKey === undefined ? {} : { defaultActiveSlotKey }),
  });

  /*
   * The filled slots, in order, and the slot index each of them came from.
   *
   * Everything outwards -- the signals, the pager Widgets, the Inspector -- speaks slot indices,
   * because that is what a person authored. Everything on the track speaks positions. This is the
   * only place the two meet.
   */
  const track = useMemo(
    () => slots
      .map((slot, slotIndex) => ({ slot, slotIndex }))
      .filter((entry) => isRenderablePhiNode(entry.slot)),
    [slots],
  );
  // The first filled slot at or after the one the sequence points at, so an index that lands on an
  // empty slot moves forward to the next real one rather than back to the beginning.
  const nextFilled = track.findIndex((entry) => entry.slotIndex >= activeIndex);
  const trackIndex = nextFilled >= 0 ? nextFilled : Math.max(track.length - 1, 0);
  const span = Math.min(Math.max(visibleSlots, 1), Math.max(track.length, 1));
  // The last window rather than the last slot: past this the window would hang off the end, and
  // stepping to it would move nothing.
  const lastTrackStart = Math.max(0, track.length - span);

  const stepTo = useCallback((nextTrackIndex: number) => {
    const entry = track[nextTrackIndex];
    if (entry) setActiveIndex(entry.slotIndex);
  }, [setActiveIndex, track]);

  const advance = useCallback(() => {
    const next = trackIndex + span;
    stepTo(next > lastTrackStart ? (loop ? 0 : lastTrackStart) : next);
  }, [lastTrackStart, loop, span, stepTo, trackIndex]);

  /*
   * Movement nobody asked for, and the two ways to decline it.
   *
   * Reduced motion means it never starts -- read in an effect rather than during render, so the
   * server's markup and the browser's first pass agree. Pointing at it or tabbing into it pauses it:
   * a slide that moves out from under the cursor is the reason carousels have a bad name.
   */
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (isEditMode || autoplayMs <= 0 || paused || track.length <= span || reducedMotion.current) {
      return undefined;
    }
    const timer = window.setInterval(advance, autoplayMs);
    return () => window.clearInterval(timer);
  }, [advance, autoplayMs, isEditMode, paused, span, track.length]);

  const chrome = {
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
  };

  if (isEditMode) {
    return (
      <PhiSequenceSlotEditor
        slots={slots}
        slotKeys={slotKeys}
        slotLabels={resolvedSlotMeta}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        slotNoun="carousel slot"
        layoutKind={layoutKind}
        renderMode={renderMode}
        isAuthoringRender={isAuthoringRender}
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

  return (
    <div
      data-layout-kind={layoutKind}
      data-phi-carousel-transition={transition}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
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
      <PhiSequenceViewport
        items={track.map((entry) => entry.slot)}
        activeIndex={trackIndex}
        visibleCount={span}
        anchor={windowAnchor}
        transition={transition}
        {...(transitionDurationMs === undefined ? {} : { durationMs: transitionDurationMs })}
        {...(transitionEasing === undefined ? {} : { easing: transitionEasing })}
        lookahead={lookahead}
        gap={slotGap}
        style={{ width: "100%", height: "100%", minHeight: 0 }}
        renderItem={(slot) => (
          <PhiLayoutAnchoredOverlay
            anchor={slotAnchor}
            positionMode="flow"
            fillAvailableInline
            fillAvailableBlock
            inset={resolvedLayoutInset}
          >
            {slot}
          </PhiLayoutAnchoredOverlay>
        )}
      />
    </div>
  );
}
