"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import {
  clampPhiSequenceTransitionMs,
  type PhiMotionEasing,
  type PhiSequenceAnchor,
  type PhiSequenceTransition,
  PHI_SEQUENCE_DEFAULT_DURATION_MS,
  PHI_SEQUENCE_DEFAULT_EASING,
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
 * different acts. `slide` lays the items out side by side on a track and moves the track: the
 * neighbours exist next to the window and arrive from the direction they were in. `fade`, `diagonal`
 * and `none` keep the window where it is and exchange what stands in its places -- the Stack's way.
 * A fade crosses the leaving items over into the coming ones; a diagonal leaves the old ones standing
 * and slides each new one over its place from the corner it comes from, below and after it going
 * forward, above and before it going back. Nothing travels sideways.
 */

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
  const onTrack = transition === "slide";

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

  /*
   * Read in an effect, not during render: the server cannot know the preference, and a first client
   * pass that already knew it drew different transition styles than the HTML it was hydrating --
   * React then rebuilt the tree, which read as a jump on every page with a sequence under reduced
   * motion. The first pass agrees with the server; the preference arrives one render later.
   */
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  /*
   * Reduced motion means none of it rather than less of it. Somebody who has asked for no movement
   * has not asked for shorter movement, so the duration is taken to zero instead of being shortened.
   */
  const resolvedDurationMs = reducedMotion || transition === "none"
    ? 0
    : durationMs === undefined
      ? PHI_SEQUENCE_DEFAULT_DURATION_MS
      : clampPhiSequenceTransitionMs(durationMs);
  const resolvedEasing = easing ?? PHI_SEQUENCE_DEFAULT_EASING;

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

  const trackTransform = onTrack ? `translate3d(calc(-1 * ${start} * ${step}), 0px, 0)` : undefined;

  /*
   * The exchange between two windows off the track, played after the new window is laid out and before
   * it is painted, so the first frame already starts where the movement does.
   *
   * At the tail the last window overlaps the one before it -- five pictures three at a time go one to
   * three, then three to five -- so an item can be in both windows at another place. It cannot leave
   * where it was and arrive where it goes as one element, and moving it at once read as the one picture
   * that changed without a transition. So it arrives at its new place like any other, and a copy of it
   * stands in its old place until the leaving window is let go.
   */
  const leavingStart = onTrack ? null : fadeState.outgoingStart;
  const movedIndices = leavingStart === null
    ? []
    : Array.from({ length: span }, (_, offset) => leavingStart + offset)
      // In the window it left and in the one it enters: a new start puts it at another place.
      .filter((index) => index >= start && index < start + span);
  const itemElements = useRef<(HTMLDivElement | null)[]>([]);
  const trackElement = useRef<HTMLDivElement | null>(null);
  const previousStart = useRef(start);
  const runningAnimations = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    const from = previousStart.current;
    previousStart.current = start;
    if (from === start || onTrack || resolvedDurationMs === 0) return;
    /*
     * A step taken while the last one is still moving -- a click on top of autoplay, an interval as
     * short as the movement -- starts from a window that has arrived. Left running, the half-arrived
     * items became the leaving ones over nothing, because what stood under them was let go.
     */
    for (const animation of runningAnimations.current) animation.finish();
    runningAnimations.current = [];
    const timing = { duration: resolvedDurationMs, easing: resolvedEasing };
    const windowIndices = Array.from({ length: span }, (_, offset) => start + offset);
    const moved = windowIndices.filter((index) => index >= from && index < from + span);
    const copyOf = (index: number) =>
      trackElement.current?.querySelector<HTMLDivElement>(`[data-phi-sequence-leaving="${index}"]`);

    if (transition === "fade") {
      for (const index of moved) {
        // Not held at the end: the item's own opacity is 1 already, and a held animation would outlast
        // the next fade that wants to take it away.
        const arriving = itemElements.current[index]?.animate?.([{ opacity: 0 }, { opacity: 1 }], timing);
        // The copy is held at nothing until it goes, which is when the leaving window is let go.
        const leaving = copyOf(index)?.animate?.([{ opacity: 1 }, { opacity: 0 }], { ...timing, fill: "forwards" });
        runningAnimations.current.push(...[arriving, leaving].filter((animation) => animation !== undefined));
      }
      return;
    }

    if (transition === "diagonal") {
      /*
       * A whole place's width and height, as a percentage of the item itself: every new item starts one
       * box off its place, so each comes in from outside the window's corner, whatever its proportion.
       */
      const offset = start > from ? "100%" : "-100%";
      const animations = windowIndices.flatMap((index) => {
        const animation = itemElements.current[index]?.animate?.(
          [{ translate: `${offset} ${offset}` }, { translate: "0 0" }],
          timing,
        );
        return animation ? [animation] : [];
      });
      runningAnimations.current = animations;
      // Nothing fades here, so no transition ends to say so: the window is let go when the last item is in.
      void Promise.all(animations.map((animation) => animation.finished)).then(
        () => setFadeState((current) => (current.start === start ? { ...current, outgoingStart: null } : current)),
        () => undefined,
      );
    }
  }, [start, span, onTrack, transition, resolvedDurationMs, resolvedEasing]);

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
          // Above what leaves, so a diagonal's new items cover the old ones they slide over.
          ? { flex: `0 0 ${slice}`, minWidth: 0, position: "relative", zIndex: 1 }
          : {
            position: "absolute",
            insetBlockStart: 0,
            insetBlockEnd: 0,
            insetInlineStart: outgoing && fadeState.outgoingStart !== null
              ? `calc(${index - fadeState.outgoingStart} * ${step})`
              : 0,
            width: slice,
          }),
        // A diagonal's leaving items stand until the new ones cover them; a fade's go out.
        opacity: visible || (outgoing && transition === "diagonal" && resolvedDurationMs > 0) ? 1 : 0,
        transition: resolvedDurationMs > 0 && transition === "fade"
          ? `opacity ${resolvedDurationMs}ms ${resolvedEasing}`
          : undefined,
      };

    const ref = (element: HTMLDivElement | null) => {
      itemElements.current[index] = element;
    };

    if (!mounted && !visible && !outgoing) {
      return <div key={index} ref={ref} aria-hidden style={{ ...box, pointerEvents: "none" }} />;
    }

    return (
      <div
        key={index}
        ref={ref}
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
      /*
       * Its own stacking context: the items it raises over the leaving ones are raised inside it, never
       * over the arrows and buttons a caller lays over the viewport.
       */
      style={{ position: "relative", overflow: "hidden", isolation: "isolate", minWidth: 0, ...style }}
    >
      <div
        ref={trackElement}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "stretch",
          gap: gapLength,
          width: "100%",
          /*
           * The track is as tall as the window, not as tall as the tallest item.
           *
           * `alignItems: stretch` gives every item the track's height, so whatever the track is
           * worth is what an item has to place its content in. Left at content height there was
           * nothing to place within: an item anchored to the bottom or the middle sat at the top,
           * because top and bottom were the same line. A caller that gives the viewport no height
           * of its own still gets content height -- a percentage against an auto parent is auto.
           */
          height: "100%",
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
        {leavingStart === null ? null : movedIndices.map((index) => (
          <div
            key={`leaving-${index}`}
            data-phi-sequence-leaving={index}
            aria-hidden
            inert
            style={{
              position: "absolute",
              insetBlockStart: 0,
              insetBlockEnd: 0,
              insetInlineStart: `calc(${index - leavingStart} * ${step})`,
              width: slice,
              // Under the window's own items, which arrive over it.
              zIndex: 0,
              pointerEvents: "none",
              ...itemStyle,
            }}
          >
            {items[index]}
          </div>
        ))}
      </div>
    </div>
  );
}
