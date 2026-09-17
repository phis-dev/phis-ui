"use client";

import { useEffect, useRef } from "react";

/**
 * Releases an entrance that waits for the page, the counterpart of the visibility Observer.
 *
 * A Widget whose content the server produces asynchronously arrives in a segment of its own: until it
 * lands its box is empty, and everything after it stands too high and then moves. An entrance held at
 * its first frame until the document has been parsed covers exactly that, because parsing is over only
 * once the last segment has been placed -- and the Block then enters from where it truly belongs.
 *
 * A frame is let past before the animation starts, so the layout the arriving segments changed is
 * settled rather than being measured mid-move. On a Site navigation the document is long since parsed
 * and this is a frame's wait, which is what it should be: there is no stream left to wait for.
 */
export function PhiEffectsReadyTrigger() {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const target = markerRef.current?.parentElement;
    if (!target) {
      return undefined;
    }

    let frame = 0;
    let cancelled = false;
    const start = () => {
      if (cancelled) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        if (!cancelled) {
          target.setAttribute("data-phi-effects-state", "running");
        }
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      document.removeEventListener("DOMContentLoaded", start);
    };
  }, []);

  return <span ref={markerRef} hidden data-phi-effects-ready-trigger="true" />;
}
