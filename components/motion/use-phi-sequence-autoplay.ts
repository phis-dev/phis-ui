"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * Movement nobody asked for, and every way to decline it.
 *
 * A Carousel and a Gallery move on their own when told to, and both used to carry the same timer with
 * the same three stops: reduced motion means it never starts, pointing at it or tabbing into it holds
 * it, and the Builder's canvas never moves. This is that timer once, with the stops it was missing --
 * a hidden tab, where moving is pointless and the browser throttles the timer into a jump on return;
 * a person who pressed Pause, which hovering must not undo; and a manual step, after which the next
 * automatic one starts counting afresh rather than landing a moment later.
 */

export type PhiSequenceAutoplayOptions = {
  /** Absent or zero means it does not move on its own. */
  intervalMs?: number;
  /** Whether there is anything to move -- more items than the window shows, and not the canvas. */
  active: boolean;
  advance: () => void;
};

export type PhiSequenceAutoplay = {
  /** Whether the sequence is told to move at all, before anybody declined it. */
  offered: boolean;
  /** Whether the timer is running right now. */
  running: boolean;
  /** Whether a person pressed Pause; the one stop that outlives the pointer leaving. */
  stopped: boolean;
  toggleStopped: () => void;
  /** After a manual step, so the next automatic one is a whole interval away. */
  restart: () => void;
  /** Spread onto the box: pointing at it or tabbing into it holds the timer. */
  holdHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocusCapture: () => void;
    onBlurCapture: () => void;
  };
};

function readDocumentHidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

export function usePhiSequenceAutoplay({ intervalMs = 0, active, advance }: PhiSequenceAutoplayOptions): PhiSequenceAutoplay {
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Read in an effect rather than during render, so the server's markup and the browser's first pass agree.
  const [reducedMotion, setReducedMotion] = useState(false);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setHidden(readDocumentHidden());
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const offered = intervalMs > 0 && active;
  const running = offered && !held && !stopped && !hidden && !reducedMotion;

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(advance, intervalMs);
    return () => window.clearInterval(timer);
    // `epoch` is here on purpose: bumping it is how a manual step restarts the interval.
  }, [advance, epoch, intervalMs, running]);

  const restart = useCallback(() => setEpoch((current) => current + 1), []);
  const toggleStopped = useCallback(() => setStopped((current) => !current), []);

  return {
    offered,
    running,
    stopped,
    toggleStopped,
    restart,
    holdHandlers: {
      onMouseEnter: () => setHeld(true),
      onMouseLeave: () => setHeld(false),
      onFocusCapture: () => setHeld(true),
      onBlurCapture: () => setHeld(false),
    },
  };
}
