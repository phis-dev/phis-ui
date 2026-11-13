"use client";

import { useEffect, useMemo, useRef } from "react";

import type { PhiRenderableBlockViewportEffect } from "../../types";
import { PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT } from "../../helpers/renderable-block-defaults";

type ViewportEffectRuntimeValues = {
  x: string;
  y: string;
  rotateX: string;
  rotateY: string;
  rotateZ: string;
  scale: string;
  opacity: string | null;
  perspective: string | null;
};

function resolveRangePoint(
  point: PhiRenderableBlockViewportEffect["rangeStart"] | PhiRenderableBlockViewportEffect["rangeEnd"],
  rect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
  axis: "x" | "y",
) {
  const viewportSize = axis === "x" ? viewportWidth : viewportHeight;
  const targetSize = axis === "x" ? rect.width : rect.height;

  /*
   * A number is a share of the viewport along the axis, where the block's leading edge stands: 0 the top
   * (or left) edge, 1 the bottom (or right) -- the same 0..1 the config reader keeps it to. It was taken
   * as pixels here, so every number landed within a pixel of the top and the effect became a switch.
   */
  if (typeof point === "number" && Number.isFinite(point)) {
    return point * viewportSize;
  }

  if (point === "center") {
    return viewportSize / 2 - targetSize / 2;
  }

  if (point === "exit") {
    return targetSize > viewportSize ? 0 : -targetSize;
  }

  return viewportSize;
}

function applyEasing(progress: number, easing: PhiRenderableBlockViewportEffect["easing"]) {
  if (easing === "ease-in") {
    return progress * progress;
  }
  if (easing === "ease-out") {
    return 1 - Math.pow(1 - progress, 2);
  }
  if (easing === "ease-in-out" || easing === "ease") {
    return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  }
  return progress;
}

function resolveProgress(
  effect: PhiRenderableBlockViewportEffect,
  rect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
) {
  // `z` has no extent on the page, so a turn about it follows the page's own scroll direction.
  const axis = (effect.axis ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.axis) === "x" ? "x" : "y";
  const targetStart = axis === "x" ? rect.left : rect.top;
  const rangeStart = resolveRangePoint(
    effect.rangeStart ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.rangeStart,
    rect,
    viewportWidth,
    viewportHeight,
    axis,
  );
  const rangeEnd = resolveRangePoint(
    effect.rangeEnd ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.rangeEnd,
    rect,
    viewportWidth,
    viewportHeight,
    axis,
  );
  const distance = rangeEnd - rangeStart;
  const rawProgress = distance === 0 ? 1 : (targetStart - rangeStart) / distance;
  const clampedProgress = effect.clamp === false ? rawProgress : Math.min(1, Math.max(0, rawProgress));

  return applyEasing(clampedProgress, effect.easing ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.easing);
}

function formatViewportEffectValue(value: number, unit: PhiRenderableBlockViewportEffect["unit"]) {
  if (unit === "") {
    return String(value);
  }
  return `${value}${unit ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.unit ?? "px"}`;
}

/**
 * Where the block lies in the viewport as laid out, before its own transform.
 *
 * The effect moves, turns and scales the block, so its drawn box is a product of the last answer: a turn
 * seen in perspective makes the box taller, which moves its top, which moves the progress, which moves
 * the turn. Measured that way the block swung between two states on every scroll -- plainly so in Firefox
 * on a strongly turned picture. The layout box is what the scroll alone moves. Transforms of ancestors
 * are not undone; a viewport effect inside a transformed parent is measured as laid out there.
 */
function readViewportLayoutRect(target: HTMLElement): DOMRect {
  let left = 0;
  let top = 0;
  for (let node: HTMLElement | null = target; node; node = node.offsetParent as HTMLElement | null) {
    left += node.offsetLeft;
    top += node.offsetTop;
    if (!node.offsetParent && getComputedStyle(node).position === "fixed") {
      return new DOMRect(left, top, target.offsetWidth, target.offsetHeight);
    }
  }
  // Scrolled boxes between the block and the page move it as the window's scroll does.
  for (let node = target.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    left -= node.scrollLeft;
    top -= node.scrollTop;
  }
  return new DOMRect(left - window.scrollX, top - window.scrollY, target.offsetWidth, target.offsetHeight);
}

function resolveViewportEffectValues(
  effects: readonly PhiRenderableBlockViewportEffect[],
  target: HTMLElement,
): ViewportEffectRuntimeValues {
  const rect = readViewportLayoutRect(target);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const values: ViewportEffectRuntimeValues = {
    x: "0px",
    y: "0px",
    rotateX: "0deg",
    rotateY: "0deg",
    rotateZ: "0deg",
    scale: "1",
    opacity: null,
    perspective: null,
  };

  for (const effect of effects) {
    const property = effect.property ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.property ?? "translate";
    const axis = effect.axis ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.axis ?? "y";
    const from = effect.from ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.from ?? 0;
    const to = effect.to ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.to ?? 0;
    const progress = resolveProgress(effect, rect, viewportWidth, viewportHeight);
    const nextValue = from + (to - from) * progress;

    if (property === "opacity") {
      values.opacity = String(nextValue);
      continue;
    }

    if (property === "scale") {
      values.scale = String(nextValue);
      continue;
    }

    if (property === "rotate") {
      const rotateValue = formatViewportEffectValue(nextValue, effect.unit ?? "deg");
      if (axis === "x") {
        values.rotateX = rotateValue;
      } else if (axis === "z") {
        values.rotateZ = rotateValue;
      } else {
        values.rotateY = rotateValue;
      }
      // A turn about `x` or `y` tilts into the page only when seen from a distance; the first that names one
      // holds for the element, as one transform has one eye.
      const perspectivePx = effect.perspectivePx ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.perspectivePx;
      if (axis !== "z" && values.perspective == null && perspectivePx) {
        values.perspective = `perspective(${perspectivePx}px)`;
      }
      continue;
    }

    const translateValue = formatViewportEffectValue(nextValue, effect.unit ?? "px");
    if (axis === "x") {
      values.x = translateValue;
    } else {
      values.y = translateValue;
    }
  }

  return values;
}

function applyViewportEffectValues(target: HTMLElement, values: ViewportEffectRuntimeValues) {
  target.style.setProperty("--phi-effects-viewport-x", values.x);
  target.style.setProperty("--phi-effects-viewport-y", values.y);
  target.style.setProperty("--phi-effects-viewport-rotate-x", values.rotateX);
  target.style.setProperty("--phi-effects-viewport-rotate-y", values.rotateY);
  target.style.setProperty("--phi-effects-viewport-rotate-z", values.rotateZ);
  target.style.setProperty("--phi-effects-viewport-scale", values.scale);
  if (values.perspective == null) {
    target.style.removeProperty("--phi-effects-viewport-perspective");
  } else {
    target.style.setProperty("--phi-effects-viewport-perspective", values.perspective);
  }
  if (values.opacity == null) {
    target.style.removeProperty("--phi-effects-viewport-opacity");
  } else {
    target.style.setProperty("--phi-effects-viewport-opacity", values.opacity);
  }
}

export function PhiSlotChildViewportEffectsObserver({
  effects,
}: {
  effects: readonly PhiRenderableBlockViewportEffect[];
}) {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  /*
   * The frame resolves the effects anew on every render, so the list is a new array each time. Keyed by
   * what it says, the observer and its listeners are built once per set of effects instead of per
   * render -- which also reset the scale to 1 every time.
   */
  const effectsKey = JSON.stringify(effects);
  const stableEffects = useMemo(
    () => JSON.parse(effectsKey) as readonly PhiRenderableBlockViewportEffect[],
    [effectsKey],
  );

  useEffect(() => {
    const marker = markerRef.current;
    const target = marker?.parentElement;
    if (!target || stableEffects.length === 0 || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    let active = false;
    let frameId: number | null = null;

    const update = () => {
      frameId = null;
      if (!active) {
        return;
      }

      applyViewportEffectValues(target, resolveViewportEffectValues(stableEffects, target));
    };
    const scheduleUpdate = () => {
      if (frameId != null) {
        return;
      }
      frameId = window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        active = Boolean(entry?.isIntersecting);
        if (active) {
          scheduleUpdate();
          return;
        }

        if (frameId != null) {
          window.cancelAnimationFrame(frameId);
          frameId = null;
        }
      },
      { rootMargin: "50% 50% 50% 50%", threshold: 0 },
    );
    const handleScrollOrResize = () => scheduleUpdate();
    /*
     * The block's own size moves its range: an image that arrives after the first measure gives the block
     * its height only then. Without a second measure the effect kept the value it worked out against the
     * empty box until the first scroll -- in Firefox, where images arrive after the first frame, the
     * picture stood in a later state and jumped on the first scroll away from the top.
     */
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);

    target.style.setProperty("--phi-effects-viewport-scale", "1");
    observer.observe(target);
    resizeObserver?.observe(target);
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize);
    scheduleUpdate();

    return () => {
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [stableEffects]);

  return <span ref={markerRef} hidden data-phi-effects-viewport-observer="true" />;
}
