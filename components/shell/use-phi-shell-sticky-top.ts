"use client";

import { useEffect, type RefObject } from "react";

import { PHI_SHELL_STICKY_TOP_PROPERTY } from "../root/phi-shell-chrome-overlay";

/**
 * How far down the viewport the Shell's Header holds right now, published on the Shell.
 *
 * Something that sticks to the top of the page -- a Table's header row -- has to stick under the Header
 * rather than behind it, and where the Header ends is not a constant: each band sticks or scrolls by its
 * own config, and a revealing `header_top` slides away while the visitor reads down and comes back when
 * they scroll up. So the edge is measured, not configured: the lowest visible bottom of the Header bands,
 * stuck or in the flow, written as `--phi-shell-sticky-top` on the Shell element. Unset, a reader falls
 * back to `0px`, which is right for a Shell without a sticky Header.
 *
 * Run by whatever sticks under it -- every sticky Table does, and the Region renderer for a stuck Sider
 * (`phiCmsRegionSiderSticks`) -- so a page without one loads nothing for it. Each runner measures all the
 * bands and they all write the same value. Not inside an Overlay: a Modal's or Drawer's body scrolls on
 * its own, and its top edge is the line.
 */

const HEADER_BANDS = '[data-phi-region-key^="header_"]:not([hidden])';

function measurePhiShellStickyTop(shell: HTMLElement) {
  /*
   * The lowest visible bottom of the Header bands, stuck or not. Counting only the bands stuck at this
   * moment made the edge jump: a band leaving its sticking line for its place in the flow -- the main
   * band while the top band scrolls back in above it -- dropped out of the count at once, and whatever
   * stuck under it leapt up by the band's height. Counted while it is in view, the edge moves with the
   * scroll instead. A band in the flow stands above the content anyway, so nothing sticks too low for it.
   */
  let bottom = 0;
  for (const band of shell.querySelectorAll<HTMLElement>(HEADER_BANDS)) {
    const rect = band.getBoundingClientRect();
    // Empty, or scrolled or slid out of the viewport.
    if (rect.height === 0 || rect.bottom <= 0) {
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
    /*
     * A revealing band moves by a transition. Measured only where it settled, whatever sticks under it
     * would stand still while the band slides and then jump; so while a transition runs in the Shell the
     * edge is measured every frame, and once more where it ends.
     */
    let following = 0;
    let followFrame = 0;
    const follow = () => {
      publish();
      followFrame = following > 0 ? window.requestAnimationFrame(follow) : 0;
    };
    // Only a Header band's own transitions move the edge; a button's hover elsewhere in the Shell does not.
    const isBandTransition = (event: Event) =>
      event.target instanceof Element && event.target.closest(HEADER_BANDS) !== null;
    // A transition whose element leaves the page never ends; the follow stops on its own regardless.
    let followTimeout = 0;
    const stopFollowing = () => {
      following = 0;
      followTimeout = 0;
    };
    const transitionStarted = (event: Event) => {
      if (!isBandTransition(event)) return;
      following += 1;
      window.clearTimeout(followTimeout);
      followTimeout = window.setTimeout(stopFollowing, 2000);
      if (followFrame === 0) {
        followFrame = window.requestAnimationFrame(follow);
      }
    };
    const transitionStopped = (event: Event) => {
      if (!isBandTransition(event)) return;
      following = Math.max(0, following - 1);
      schedule();
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    shell.addEventListener("transitionrun", transitionStarted);
    shell.addEventListener("transitionend", transitionStopped);
    shell.addEventListener("transitioncancel", transitionStopped);
    const observer = new ResizeObserver(schedule);
    for (const band of shell.querySelectorAll<HTMLElement>(HEADER_BANDS)) {
      observer.observe(band);
    }
    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      if (followFrame !== 0) {
        window.cancelAnimationFrame(followFrame);
      }
      window.clearTimeout(followTimeout);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      shell.removeEventListener("transitionrun", transitionStarted);
      shell.removeEventListener("transitionend", transitionStopped);
      shell.removeEventListener("transitioncancel", transitionStopped);
      observer.disconnect();
    };
  }, [active, elementRef]);
}
