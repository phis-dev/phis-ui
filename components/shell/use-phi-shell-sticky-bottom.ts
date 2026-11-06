"use client";

import { useEffect, type RefObject } from "react";

import { PHI_SHELL_STICKY_BOTTOM_PROPERTY } from "../root/phi-shell-chrome-overlay";

/**
 * How much of the viewport's bottom a stuck `footer_bottom` holds right now, published on the Shell.
 *
 * The counterpart of `usePhiShellStickyTop`. A Sider stuck under the Header is as tall as what is left of
 * the viewport, and with a Footer stuck to the bottom edge what is left ends at the Footer's top -- a
 * Sider that did not know would run behind it, its last entries out of reach. The Footer's height is not
 * a constant (its content wraps on a narrow screen, and at the page's end it stands in the flow higher
 * up), so the edge is measured: the part of the viewport below the band's top, written as
 * `--phi-shell-sticky-bottom` on the Shell element. Unset, a reader falls back to `0px`.
 *
 * Run by the Footer band itself (`phiCmsRegionFooterSticks`), so a Shell without a sticky Footer loads
 * nothing for it, and it takes the property away again when the band stops sticking.
 */
export function usePhiShellStickyBottom({
  active,
  elementRef,
}: {
  active: boolean;
  elementRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const element = elementRef.current;
    const shell = active && element ? element.closest<HTMLElement>("[data-phi-shell-layout]") : null;
    if (!element || !shell) {
      return undefined;
    }
    let frame = 0;
    const publish = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const held = rect.height === 0 ? 0 : Math.max(0, Math.min(window.innerHeight, window.innerHeight - rect.top));
      const next = `${Math.round(held)}px`;
      if (shell.style.getPropertyValue(PHI_SHELL_STICKY_BOTTOM_PROPERTY) !== next) {
        shell.style.setProperty(PHI_SHELL_STICKY_BOTTOM_PROPERTY, next);
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
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      shell.style.removeProperty(PHI_SHELL_STICKY_BOTTOM_PROPERTY);
    };
  }, [active, elementRef]);
}
