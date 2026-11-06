"use client";

import { useEffect, type RefObject } from "react";

/**
 * The room each Header band holds, published on the Shell for a Page with a Hero.
 *
 * A Hero starts at the top of the window, behind the Header bands (`styles/shell.css`, "Hero at the
 * top"): the Header rows hold no room there, so each band is set down by the bands above it, and the
 * Hero's content and the Header's glass pane take the bands' sum. The grid itself does not depend on any
 * of it -- a late value moves a band or the Hero's words for a frame, never the page below.
 *
 * The Shell is handed the configured heights by the server (`phi-cms-root-layout.tsx`); this measures
 * what the bands actually hold, `header_bottom` included, which the Area never sees. A band's room is
 * its height less what it gives back below itself -- a `header_top` that reveals on hover takes none.
 */
const PHI_SHELL_HEADER_BANDS = [
  ["header_top", "--phi-shell-band-top"],
  ["header_main", "--phi-shell-band-main"],
  ["header_bottom", "--phi-shell-band-bottom"],
] as const;

function readBandRoom(shell: HTMLElement, regionKey: string) {
  const band = shell.querySelector<HTMLElement>(`:scope > [data-phi-region-key="${regionKey}"]:not([hidden])`);
  if (!band) {
    return 0;
  }
  const givenBack = Number.parseFloat(getComputedStyle(band).marginBlockEnd) || 0;
  return Math.max(0, Math.round(band.offsetHeight + givenBack));
}

export function usePhiShellHeaderBands({
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
      for (const [regionKey, property] of PHI_SHELL_HEADER_BANDS) {
        const next = `${readBandRoom(shell, regionKey)}px`;
        if (shell.style.getPropertyValue(property) !== next) {
          shell.style.setProperty(property, next);
        }
      }
    };
    const schedule = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(publish);
      }
    };
    publish();
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    for (const band of shell.querySelectorAll<HTMLElement>(':scope > [data-phi-region-key^="header_"]')) {
      observer.observe(band);
    }
    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [active, elementRef]);
}
