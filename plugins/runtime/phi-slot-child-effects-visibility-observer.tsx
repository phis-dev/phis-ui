"use client";

import { useEffect, useRef } from "react";

const PHI_EFFECTS_VISIBLE_BOTTOM_OFFSET_PX = 30;

function isEntryVisibleEnough(entry: IntersectionObserverEntry) {
  if (!entry.isIntersecting) {
    return false;
  }

  const viewportTop = 0;
  const viewportBottom = window.innerHeight;
  const visiblePastBottomOffset = viewportBottom - entry.boundingClientRect.top;
  if (visiblePastBottomOffset < PHI_EFFECTS_VISIBLE_BOTTOM_OFFSET_PX) {
    return false;
  }

  const visibleBlockSize = Math.max(
    0,
    Math.min(entry.boundingClientRect.bottom, viewportBottom) -
      Math.max(entry.boundingClientRect.top, viewportTop),
  );
  const targetBlockSize = Math.max(0, entry.boundingClientRect.height);
  if (targetBlockSize === 0) {
    return false;
  }

  const requiredBlockSize = Math.min(PHI_EFFECTS_VISIBLE_BOTTOM_OFFSET_PX, targetBlockSize);

  return visibleBlockSize >= requiredBlockSize;
}

export function PhiSlotChildEffectsVisibilityObserver({
  once,
}: {
  once: boolean;
}) {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    const target = marker?.parentElement;
    if (!target || typeof IntersectionObserver === "undefined") {
      target?.setAttribute("data-phi-effects-state", "running");
      return undefined;
    }

    let hasRun = false;
    const startAnimation = () => {
      if (once && hasRun) {
        return;
      }

      hasRun = true;
      target.setAttribute("data-phi-effects-state", "idle");
      void target.offsetWidth;
      target.setAttribute("data-phi-effects-state", "running");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        if (isEntryVisibleEnough(entry)) {
          startAnimation();
          if (once) {
            observer.disconnect();
          }
          return;
        }

        if (!once) {
          target.setAttribute("data-phi-effects-state", "idle");
        }
      },
      {
        rootMargin: `0px 0px -${PHI_EFFECTS_VISIBLE_BOTTOM_OFFSET_PX}px 0px`,
        threshold: [0, 1],
      },
    );

    target.setAttribute("data-phi-effects-state", "idle");
    observer.observe(target);

    return () => observer.disconnect();
  }, [once]);

  return <span ref={markerRef} hidden data-phi-effects-visibility-observer="true" />;
}
