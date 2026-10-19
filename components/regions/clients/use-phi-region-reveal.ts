"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type RefObject } from "react";

import type { PhiCmsRegionReveal } from "../../../types/cms-presets";
import {
  PHI_SHELL_HEADER_TOP_EXTENT_PROPERTY,
  PHI_SHELL_HEADER_TOP_STACK_PROPERTY,
} from "../../root/phi-shell-chrome-overlay";

/** How far the page has to move before its direction counts, so a trembling wheel does not flicker. */
const PHI_REGION_REVEAL_SCROLL_SLACK = 4;

const PHI_NO_HOVER_QUERY = "(hover: none)";

function subscribePhiNoHover(onChange: () => void) {
  const query = window.matchMedia(PHI_NO_HOVER_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readPhiNoHover() {
  return window.matchMedia(PHI_NO_HOVER_QUERY).matches;
}

/**
 * Whether the scroll position has the band in view, or `null` where the pointer decides instead.
 *
 * `scroll-up` follows the page: in view at the top, away while the visitor reads down, back the moment
 * they scroll up. `hover` is the pointer's, and CSS answers it (`shell.css`); a device that has no
 * hover gets the scroll rule, because a band that waits for a pointer it will never see is a band
 * nobody reaches.
 */
export function usePhiRegionRevealed(reveal: PhiCmsRegionReveal): boolean | null {
  const [revealed, setRevealed] = useState(true);
  const noHover = useSyncExternalStore(subscribePhiNoHover, readPhiNoHover, () => false);
  const followsScroll = reveal === "scroll-up" || (reveal === "hover" && noHover);

  useEffect(() => {
    if (!followsScroll) {
      return undefined;
    }
    let last = window.scrollY;
    let frame = 0;
    const read = () => {
      frame = 0;
      const current = window.scrollY;
      if (current <= 0) {
        setRevealed(true);
      } else if (current > last + PHI_REGION_REVEAL_SCROLL_SLACK) {
        setRevealed(false);
      } else if (current < last - PHI_REGION_REVEAL_SCROLL_SLACK) {
        setRevealed(true);
      } else {
        return;
      }
      last = current;
    };
    const onScroll = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(read);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [followsScroll]);

  if (reveal === "always") {
    return true;
  }
  return followsScroll ? revealed : null;
}

/**
 * What `header_top` tells the Shell about the room it takes, while the browser decides it.
 *
 * The Header pane and the sticky bands below are its siblings, so it publishes on the Shell element
 * they share (SHELL.md "Region visibility per Page"): `extent` is the height its track holds, `stack`
 * the part of the viewport's top a `scroll-up` band holds right now. The server writes both for the
 * first Page; this keeps them true after every link and every scroll. A band that is gone leaves zeros
 * behind, never nothing, because nothing would fall back to the server's first answer.
 */
export function usePhiShellHeaderTopRoom({
  active,
  present,
  reveal,
  revealed,
  elementRef,
  placeholderRef,
}: {
  active: boolean;
  present: boolean;
  reveal: PhiCmsRegionReveal;
  revealed: boolean | null;
  elementRef: RefObject<HTMLElement | null>;
  placeholderRef: RefObject<HTMLElement | null>;
}) {
  useLayoutEffect(() => {
    if (!active) {
      return undefined;
    }
    const element = elementRef.current;
    const shell = (element ?? placeholderRef.current)?.closest<HTMLElement>("[data-phi-shell-layout]");
    if (!shell) {
      return undefined;
    }
    const publish = () => {
      const extent = present && element && reveal !== "hover" ? element.offsetHeight : 0;
      element?.style.setProperty("--phi-region-reveal-extent", `${element.offsetHeight}px`);
      shell.style.setProperty(PHI_SHELL_HEADER_TOP_EXTENT_PROPERTY, `${extent}px`);
      shell.style.setProperty(
        PHI_SHELL_HEADER_TOP_STACK_PROPERTY,
        `${reveal === "scroll-up" && revealed !== false ? extent : 0}px`,
      );
    };
    publish();
    const observer = present && element ? new ResizeObserver(publish) : null;
    if (observer && element) {
      observer.observe(element);
    }
    return () => {
      observer?.disconnect();
      shell.style.setProperty(PHI_SHELL_HEADER_TOP_EXTENT_PROPERTY, "0px");
      shell.style.setProperty(PHI_SHELL_HEADER_TOP_STACK_PROPERTY, "0px");
    };
  }, [active, present, reveal, revealed, elementRef, placeholderRef]);
}
