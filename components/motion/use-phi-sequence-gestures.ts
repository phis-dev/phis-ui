"use client";

import { useCallback, useRef, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";

/*
 * The two ways to move a sequence that are not a button: a swipe, and the arrow keys.
 *
 * A slideshow on a phone that only moves on its arrows is a foreign body, and one on a keyboard that
 * only moves on Tab-Tab-Enter is slower than reading. Neither needs the viewport to know: both say
 * "one step" to whoever owns the index.
 */

/** How far a finger has to travel sideways, and more sideways than up or down, to count as a swipe. */
const PHI_SEQUENCE_SWIPE_THRESHOLD_PX = 40;

/**
 * Which way a swipe moves the sequence, or `null` where it was a tap, a scroll or too short.
 *
 * A finger going left pulls the next item in, so left is forward. Vertical travel that outweighs the
 * sideways travel is the page scrolling, and is left to it.
 */
export function resolvePhiSwipeStep(deltaX: number, deltaY: number, threshold = PHI_SEQUENCE_SWIPE_THRESHOLD_PX): 1 | -1 | null {
  if (Math.abs(deltaX) < threshold || Math.abs(deltaX) <= Math.abs(deltaY)) return null;
  return deltaX < 0 ? 1 : -1;
}

export type PhiSequenceGestures = {
  /** Spread onto the box that holds the items. */
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    /** A mouse dragging a picture starts the browser's own drag of it, which cancels the pointer. */
    onDragStart: (event: DragEvent<HTMLElement>) => void;
  };
  /** Lets the page keep scrolling vertically over the box while a sideways swipe is the sequence's. */
  style: Pick<CSSProperties, "touchAction">;
};

export function usePhiSequenceGestures({ step }: { step: (direction: 1 | -1) => void }): PhiSequenceGestures {
  const origin = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    // The primary button only: a right click or a second finger is not the start of a swipe.
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    origin.current = { x: event.clientX, y: event.clientY };
  }, []);
  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    const start = origin.current;
    origin.current = null;
    if (!start) return;
    const direction = resolvePhiSwipeStep(event.clientX - start.x, event.clientY - start.y);
    if (direction) step(direction);
  }, [step]);
  const onPointerCancel = useCallback(() => {
    origin.current = null;
  }, []);
  const onDragStart = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    // Only the keys that mean a step; a Tab or an Enter on a button is the button's.
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (event.defaultPrevented) return;
    event.preventDefault();
    step(event.key === "ArrowRight" ? 1 : -1);
  }, [step]);

  return {
    handlers: { onPointerDown, onPointerUp, onPointerCancel, onDragStart, onKeyDown },
    style: { touchAction: "pan-y" },
  };
}
