"use client";

import { useEffect, type RefObject } from "react";

/**
 * How far down the viewport the Shell's Header holds right now, published on the Shell.
 *
 * Something that sticks to the top of the page -- a Table's header row -- has to stick under the Header
 * rather than behind it, and where the Header ends is not a constant: each band sticks or scrolls by its
 * own config, and a revealing `header_top` slides away while the visitor reads down and comes back when
 * they scroll up. So the edge is measured, not configured: the lowest bottom of every Header band that is
 * stuck at this moment, written as `--phi-shell-sticky-top` on the Shell element. Unset, a reader falls
 * back to `0px`, which is right for a Shell without a sticky Header.
 *
 * Run by whatever sticks under it -- every sticky Table does -- so a page without one loads nothing for
 * it. Each runner measures all the bands and they all write the same value. Not inside an Overlay: a
 * Modal's or Drawer's body scrolls on its own, and its top edge is the line.
 */
const PHI_SHELL_STICKY_TOP_PROPERTY = "--phi-shell-sticky-top";

const HEADER_BANDS = '[data-phi-region-key^="header_"]:not([hidden])';

function measurePhiShellStickyTop(shell: HTMLElement) {
  let bottom = 0;
  for (const band of shell.querySelectorAll<HTMLElement>(HEADER_BANDS)) {
    const style = window.getComputedStyle(band);
    if (style.position !== "sticky" && style.position !== "fixed") {
      continue;
    }
    const rect = band.getBoundingClientRect();
    const stuckAt = Number.parseFloat(style.top) || 0;
    // Below its sticking line it is still in flow; above the viewport it has slid away.
    if (rect.height === 0 || rect.top > stuckAt + 1 || rect.bottom <= 0) {
      continue;
    }
    bottom = Math.max(bottom, rect.bottom);
  }
  return `${Math.round(bottom)}px`;
}

const OVERLAY_BODIES = "[data-phi-modal-body-content], [data-phi-drawer-body-content]";

export function usePhiShellStickyTop({
  active,
  elementRef,
}: {
  active: boolean;
  elementRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const element = elementRef.current;
    const shell = active && element && !element.closest(OVERLAY_BODIES)
      ? element.closest<HTMLElement>("[data-phi-shell-layout]")
      : null;
    if (!element || !shell) {
      return undefined;
    }
    let frame = 0;
    const publish = () => {
      frame = 0;
      const next = measurePhiShellStickyTop(shell);
      if (shell.style.getPropertyValue(PHI_SHELL_STICKY_TOP_PROPERTY) !== next) {
        shell.style.setProperty(PHI_SHELL_STICKY_TOP_PROPERTY, next);
      }
    };
    const schedule = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(publish);
      }
    };
    publish();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // A revealing band moves by a transition; its end is where it settled.
    shell.addEventListener("transitionend", schedule);
    const observer = new ResizeObserver(schedule);
    for (const band of shell.querySelectorAll<HTMLElement>(HEADER_BANDS)) {
      observer.observe(band);
    }
    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      shell.removeEventListener("transitionend", schedule);
      observer.disconnect();
    };
  }, [active, elementRef]);
}
