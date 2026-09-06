"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import {
  clampPhiSequenceTransitionMs,
  type PhiMotionEasing,
} from "../../helpers/motion";
import {
  shouldPhiCmsContentStayMounted,
  type PhiCmsMountPolicy,
} from "../../types/cms-mount-policy";

/**
 * A window onto a sequence, and the movement from one window to the next.
 *
 * This is the piece a Stack, a Carousel and an image gallery have in common, and it is deliberately
 * the thinnest of the three layers: it takes already-rendered children, an index and a shape, and it
 * knows nothing about slots, signals, the Builder or where the pictures came from. Whoever owns the
 * index -- a signal channel, a pair of arrows, a timer -- owns it outside.
 *
 * Two geometries, chosen by the transition, because the two ways of showing a sequence are genuinely
 * different acts. `slide` and `diagonal` lay the items out side by side on a track and move the track:
 * the neighbours exist next to the window and arrive from the direction they were in. `fade` and
 * `none` put the window's items in flow and cross-fade the ones that are leaving over the top, which
 * is what the Stack has always done -- the items do not travel, they exchange places.
 */

export const PHI_SEQUENCE_TRANSITIONS = ["none", "fade", "slide", "diagonal"] as const;
export type PhiSequenceTransition = (typeof PHI_SEQUENCE_TRANSITIONS)[number];

export const PHI_SEQUENCE_ANCHORS = ["start", "center"] as const;
export type PhiSequenceAnchor = (typeof PHI_SEQUENCE_ANCHORS)[number];

/** How far a diagonal leaves the horizontal, as a share of the travel it is already making. */
const DIAGONAL_RISE = 0.35;

/** What a caller who says nothing gets: long enough to read as movement, short enough to ignore. */
const DEFAULT_SEQUENCE_DURATION_MS = 320;

export type PhiSequenceViewportProps = {
  items: readonly ReactNode[];
  /**
   * Which item the window is anchored on -- not necessarily the one somebody is looking at. Once more
   * than one item is visible, "active" splits into what is shown and what the window stands on, and
   * `anchor` says which end of the window the index means.
   */
  activeIndex: number;
  visibleCount?: number;
  anchor?: PhiSequenceAnchor;
  transition?: PhiSequenceTransition;
  /** Absent means the caller has no opinion and the theme's own pace is used. */
  durationMs?: number;
  easing?: PhiMotionEasing;
  /**
   * How many items beyond the window stay mounted.
   *
   * One number, two jobs, and they are the same job: here it decides which subtrees exist, and in a
   * gallery the very same window decides which pictures are told to load early. An item that is not
   * mounted has no images to preload, so the two cannot be set independently without one of them
   * being wrong.
   */
  lookahead?: number;
  mountPolicy?: PhiCmsMountPolicy;
  gap?: number | string;
  style?: CSSProperties;
  itemStyle?: CSSProperties;
  className?: string;
  /** Called for each item with whether it is currently inside the visible window. */
  renderItem?: (item: ReactNode, state: { index: number; visible: boolean }) => ReactNode;
};

function toCssLength(value: number | string | undefined) {
  if (value === undefined) return "0px";
  return typeof value === "number" ? `${value}px` : value;
}

export function resolvePhiSequenceWindowStart({
  activeIndex,
  visibleCount,
  itemCount,
  anchor,
}: {
  activeIndex: number;
  visibleCount: number;
  itemCount: number;
  anchor: PhiSequenceAnchor;
}) {
  if (itemCount <= 0) return 0;
  const span = Math.max(1, Math.min(visibleCount, itemCount));
  const offset = anchor === "center" ? Math.floor((span - 1) / 2) : 0;
  // The window never hangs off the end: at the tail it stops moving and the anchor slides within it,
  // which is what keeps the last item from sitting beside empty space.
  return Math.max(0, Math.min(activeIndex - offset, itemCount - span));
}

export function PhiSequenceViewport({
  items,
  activeIndex,
  visibleCount = 1,
  anchor = "start",
  transition = "none",
  durationMs,
  easing,
  lookahead = 1,
  mountPolicy = "lazy-keep",
  gap = 0,
  style,
  itemStyle,
  className,
  renderItem,
}: PhiSequenceViewportProps) {
  const itemCount = items.length;
  // Only the geometric limit: you cannot show four of three. A visibleCount that is not a positive
  // whole number is a caller's mistake, and the type says so rather than this line rescuing it.
  const span = Math.min(visibleCount, Math.max(itemCount, 1));
  const start = resolvePhiSequenceWindowStart({ activeIndex, visibleCount: span, itemCount, anchor });
  const onTrack = transition === "slide" || transition === "diagonal";

  /*
   * Which items have ever been inside the window, which is what `lazy-keep` keeps.
   *
   * Adjusted during render rather than in an effect: the memory has to be right for the render that
   * first shows an item, not for the one after it. It starts holding the opening window, so the common
   * case costs no extra render at all.
   */
  const [visitedIndices, setVisitedIndices] = useState<ReadonlySet<number>>(
    () => new Set(Array.from({ length: span }, (_, offset) => start + offset)),
  );
  const windowIndices = Array.from({ length: span }, (_, offset) => start + offset);
  if (windowIndices.some((index) => !visitedIndices.has(index))) {
    const next = new Set(visitedIndices);
    for (const index of windowIndices) next.add(index);
    setVisitedIndices(next);
  }

  /*
   * The window we are leaving, so a cross-fade has something to fade.
   *
   * Only meaningful off the track: on a track the items travel and nothing is left behind. Held as
   * state and cleared when the animation is over, the way the Stack has always tracked its outgoing
   * slot.
   */
  const [fadeState, setFadeState] = useState(() => ({ start, outgoingStart: null as number | null }));
  if (fadeState.start !== start) {
    setFadeState({ start, outgoingStart: onTrack || transition === "none" ? null : fadeState.start });
  }

  const reducedMotion = typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /*
   * Reduced motion means none of it rather than less of it. Somebody who has asked for no movement
   * has not asked for shorter movement, so the duration is taken to zero instead of being shortened.
   */
  const resolvedDurationMs = reducedMotion || transition === "none"
    ? 0
    : durationMs === undefined
      ? DEFAULT_SEQUENCE_DURATION_MS
      : clampPhiSequenceTransitionMs(durationMs);
  const resolvedEasing = easing ?? "ease-in-out";

  const gapLength = toCssLength(gap);
  const slice = span === 1
    ? "100%"
    : `calc((100% - ${span - 1} * ${gapLength}) / ${span})`;
  const step = span === 1 ? "100%" : `calc(${slice} + ${gapLength})`;

  const mountedIndices = new Set<number>();
  for (let index = 0; index < itemCount; index += 1) {
    const insideWindow = index >= start - lookahead && index < start + span + lookahead;
    const keptForFade = fadeState.outgoingStart !== null &&
      index >= fadeState.outgoingStart && index < fadeState.outgoingStart + span;
    if (shouldPhiCmsContentStayMounted({
      policy: mountPolicy,
      insideWindow: insideWindow || keptForFade,
      hasEnteredWindow: visitedIndices.has(index),
    })) {
      mountedIndices.add(index);
    }
  }

  const trackTransform = onTrack
    ? `translate3d(calc(-1 * ${start} * ${step}), ${
      transition === "diagonal" ? `calc(-1 * ${start} * ${step} * ${DIAGONAL_RISE})` : "0px"
    }, 0)`
    : undefined;

  const renderedItems = items.map((item, index) => {
    const visible = index >= start && index < start + span;
    const outgoing = !visible && fadeState.outgoingStart !== null &&
      index >= fadeState.outgoingStart && index < fadeState.outgoingStart + span;
    const mounted = mountedIndices.has(index);

    /*
     * Every item keeps its box whether its content is mounted or not. On a track a missing box would
     * shift everything behind it; off the track it would change what the container measures. Mounting
     * is about the subtree, never about the geometry.
     */
    const box: CSSProperties = onTrack
      ? { flex: `0 0 ${slice}`, minWidth: 0 }
      : {
        ...(visible
          ? { flex: `0 0 ${slice}`, minWidth: 0 }
          : {
            position: "absolute",
            insetBlockStart: 0,
            insetInlineStart: outgoing && fadeState.outgoingStart !== null
              ? `calc(${index - fadeState.outgoingStart} * ${step})`
              : 0,
            width: slice,
          }),
        opacity: visible ? 1 : 0,
        transition: resolvedDurationMs > 0
          ? `opacity ${resolvedDurationMs}ms ${resolvedEasing}`
          : undefined,
      };

    if (!mounted && !visible && !outgoing) {
      return <div key={index} aria-hidden style={{ ...box, pointerEvents: "none" }} />;
    }

    return (
      <div
        key={index}
        data-phi-sequence-item-state={visible ? "visible" : outgoing ? "outgoing" : "waiting"}
        inert={!visible}
        aria-hidden={!visible || undefined}
        style={{ ...box, ...itemStyle }}
      >
        {mounted ? (renderItem ? renderItem(item, { index, visible }) : item) : null}
      </div>
    );
  });

  return (
    <div
      className={className}
      data-phi-sequence-transition={transition}
      style={{ position: "relative", overflow: "hidden", minWidth: 0, ...style }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "stretch",
          gap: gapLength,
          width: "100%",
          minWidth: 0,
          ...(onTrack
            ? {
              transform: trackTransform,
              transition: resolvedDurationMs > 0
                ? `transform ${resolvedDurationMs}ms ${resolvedEasing}`
                : undefined,
              willChange: resolvedDurationMs > 0 ? "transform" : undefined,
            }
            : {}),
        }}
        onTransitionEnd={fadeState.outgoingStart === null
          ? undefined
          : () => setFadeState((current) => ({ ...current, outgoingStart: null }))}
      >
        {renderedItems}
      </div>
    </div>
  );
}
