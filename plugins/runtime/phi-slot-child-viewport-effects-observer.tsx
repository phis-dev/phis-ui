"use client";

import { useEffect, useRef } from "react";

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

  if (typeof point === "number" && Number.isFinite(point)) {
    return point;
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
  const axis = effect.axis ?? PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT.axis ?? "y";
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

function resolveViewportEffectValues(
  effects: readonly PhiRenderableBlockViewportEffect[],
  target: HTMLElement,
): ViewportEffectRuntimeValues {
  const rect = target.getBoundingClientRect();
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
      } else {
        values.rotateY = rotateValue;
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

  useEffect(() => {
    const marker = markerRef.current;
    const target = marker?.parentElement;
    if (!target || effects.length === 0 || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    let active = false;
    let frameId: number | null = null;

    const update = () => {
      frameId = null;
      if (!active) {
        return;
      }

      applyViewportEffectValues(target, resolveViewportEffectValues(effects, target));
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

    target.style.setProperty("--phi-effects-viewport-scale", "1");
    observer.observe(target);
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize);
    scheduleUpdate();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [effects]);

  return <span ref={markerRef} hidden data-phi-effects-viewport-observer="true" />;
}
