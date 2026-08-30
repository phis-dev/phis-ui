import type { CSSProperties } from "react";

import type {
  PhiRenderableBlockBase,
  PhiRenderableBlockTransition,
  PhiRenderableBlockTransitionAxis,
  PhiRenderableBlockTransitionDirection,
  PhiRenderableBlockViewportEffect,
} from "../types";
import { mergeRenderableBlockDefaults } from "./renderable-block-serialization";
import { PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION } from "./renderable-block-defaults";

type PhiRenderableBlockEffectsCssVars = CSSProperties & Record<`--${string}`, string>;

export type PhiRenderableBlockEffectsAttributes = {
  "data-phi-effects-transition"?: string;
  "data-phi-effects-trigger"?: string;
  "data-phi-effects-once"?: string;
  "data-phi-effects-state"?: string;
  "data-phi-effects-viewport"?: string;
  "data-phi-effects-viewport-opacity"?: string;
};

function resolveCssDistance(value: number | string | null | undefined, fallback: number | string) {
  const resolved = value ?? fallback;
  return typeof resolved === "number" ? `${resolved}px` : resolved;
}

function resolveTransitionDistance(
  direction: PhiRenderableBlockTransitionDirection | null | undefined,
  distance: number | string | null | undefined,
) {
  const resolvedDistance = resolveCssDistance(distance, PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.distance ?? 200);
  switch (direction) {
    case "top":
      return { x: "0px", y: `calc(${resolvedDistance} * -1)` };
    case "top-right":
      return { x: resolvedDistance, y: `calc(${resolvedDistance} * -1)` };
    case "right":
      return { x: resolvedDistance, y: "0px" };
    case "bottom-right":
      return { x: resolvedDistance, y: resolvedDistance };
    case "bottom":
      return { x: "0px", y: resolvedDistance };
    case "bottom-left":
      return { x: `calc(${resolvedDistance} * -1)`, y: resolvedDistance };
    case "left":
      return { x: `calc(${resolvedDistance} * -1)`, y: "0px" };
    case "top-left":
      return { x: `calc(${resolvedDistance} * -1)`, y: `calc(${resolvedDistance} * -1)` };
    default:
      return { x: "0px", y: resolvedDistance };
  }
}

function resolveAxisTransform(axis: PhiRenderableBlockTransitionAxis | null | undefined, value: string) {
  switch (axis) {
    case "x":
      return `rotateX(${value})`;
    case "y":
      return `rotateY(${value})`;
    case "z":
    default:
      return `rotateZ(${value})`;
  }
}

function resolveTransitionOrigin(
  origin: PhiRenderableBlockTransition["origin"] | null | undefined,
  offsetX: PhiRenderableBlockTransition["originOffsetX"] | null | undefined,
  offsetY: PhiRenderableBlockTransition["originOffsetY"] | null | undefined,
) {
  const resolvedOrigin = origin ?? undefined;
  const resolvedOffsetX = offsetX == null ? undefined : resolveCssDistance(offsetX, 0);
  const resolvedOffsetY = offsetY == null ? undefined : resolveCssDistance(offsetY, 0);

  return [resolvedOrigin, resolvedOffsetX, resolvedOffsetY].filter(Boolean).join(" ") || undefined;
}

function resolveTransitionStep(
  value: PhiRenderableBlockTransition,
): {
  kind: "opacity" | "transform" | "none";
  fromOpacity?: number;
  toOpacity?: number;
  fromTransform?: string;
  toTransform?: string;
  origin?: string;
  perspectivePx?: number | null;
  durationMs?: number | null;
  delayMs?: number | null;
  easing?: string | null;
} {
  const transition = {
    ...PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION,
    ...value,
  };
  const mode = transition.mode ?? "in";
  const origin = resolveTransitionOrigin(transition.origin, transition.originOffsetX, transition.originOffsetY);

  if (transition.type === "fade") {
    return mode === "out"
      ? { kind: "opacity", fromOpacity: 1, toOpacity: 0, durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing }
      : { kind: "opacity", fromOpacity: 0, toOpacity: 1, durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing };
  }

  if (transition.type === "slide") {
    const distance = resolveTransitionDistance(transition.direction, transition.distance);
    const offset = `translate3d(${distance.x}, ${distance.y}, 0)`;
    return mode === "out"
      ? { kind: "transform", fromTransform: "translate3d(0, 0, 0)", toTransform: offset, durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing }
      : { kind: "transform", fromTransform: offset, toTransform: "translate3d(0, 0, 0)", durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing };
  }

  if (transition.type === "flip") {
    const angle = `${transition.angleDeg ?? 180}deg`;
    const axis = transition.axis === "z" ? "y" : transition.axis;
    const rotate = resolveAxisTransform(axis, angle);
    return mode === "out"
      ? { kind: "transform", fromTransform: resolveAxisTransform(axis, "0deg"), toTransform: rotate, origin, perspectivePx: transition.perspectivePx, durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing }
      : { kind: "transform", fromTransform: rotate, toTransform: resolveAxisTransform(axis, "0deg"), origin, perspectivePx: transition.perspectivePx, durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing };
  }

  if (transition.type === "rotate") {
    const angle = `${transition.angleDeg ?? 360}deg`;
    const rotate = resolveAxisTransform(transition.axis, angle);
    return mode === "out"
      ? { kind: "transform", fromTransform: resolveAxisTransform(transition.axis, "0deg"), toTransform: rotate, origin, perspectivePx: transition.perspectivePx, durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing }
      : { kind: "transform", fromTransform: rotate, toTransform: resolveAxisTransform(transition.axis, "0deg"), origin, perspectivePx: transition.perspectivePx, durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing };
  }

  if (transition.type === "scale") {
    const scale = `scale(${transition.scale ?? 0.96})`;
    return mode === "out"
      ? { kind: "transform", fromTransform: "scale(1)", toTransform: scale, origin, durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing }
      : { kind: "transform", fromTransform: scale, toTransform: "scale(1)", origin, durationMs: transition.durationMs, delayMs: transition.delayMs, easing: transition.easing };
  }

  return { kind: "none" };
}

export function resolveRenderableBlockEffectsStyle(
  config: Partial<PhiRenderableBlockBase> | null | undefined,
): CSSProperties | undefined {
  const block = mergeRenderableBlockDefaults(config);
  const opacity = block.effects?.opacity;
  const transitions = block.effects?.transitions ?? [];
  const hasOpacity = typeof opacity === "number" && opacity < 1;
  const hasTransition = transitions.length > 0;

  if (!hasOpacity && !hasTransition) {
    return undefined;
  }

  const finalOpacity = typeof opacity === "number" ? opacity : 1;
  const animationNames: string[] = [];
  const animationDurations: string[] = [];
  const animationDelays: string[] = [];
  const animationEasings: string[] = [];
  const animationCompositions: string[] = [];
  let transformOrigin: string | undefined;
  let perspectivePx: number | null | undefined;
  const style: PhiRenderableBlockEffectsCssVars = {};
  let transformIndex = 0;
  let opacityIndex = 0;

  for (const transition of transitions) {
    const step = resolveTransitionStep(transition);
    if (step.kind === "none") {
      continue;
    }
    animationDurations.push(`${step.durationMs ?? PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.durationMs ?? 1000}ms`);
    animationDelays.push(`${step.delayMs ?? 0}ms`);
    animationEasings.push(step.easing ?? "ease-out");

    if (step.kind === "opacity") {
      const index = opacityIndex;
      opacityIndex += 1;
      const cappedIndex = Math.min(index, 7);
      animationNames.push(`phi-renderable-effect-opacity-${cappedIndex}`);
      animationCompositions.push("replace");
      style[`--phi-effects-opacity-${cappedIndex}-from`] = String((step.fromOpacity ?? 1) * finalOpacity);
      style[`--phi-effects-opacity-${cappedIndex}-to`] = String((step.toOpacity ?? 1) * finalOpacity);
    }

    if (step.kind === "transform") {
      const index = transformIndex;
      transformIndex += 1;
      const cappedIndex = Math.min(index, 7);
      animationNames.push(`phi-renderable-effect-transform-${cappedIndex}`);
      animationCompositions.push("add");
      const perspective = step.perspectivePx ? `perspective(${step.perspectivePx}px)` : "";
      style[`--phi-effects-transform-${cappedIndex}-from`] = [perspective, step.fromTransform].filter(Boolean).join(" ") || "none";
      style[`--phi-effects-transform-${cappedIndex}-to`] = [perspective, step.toTransform].filter(Boolean).join(" ") || "none";
    }

    transformOrigin = step.origin ?? transformOrigin;
    perspectivePx = step.perspectivePx ?? perspectivePx;
  }

  if (animationNames.length > 0) {
    style["--phi-effects-animation-name"] = animationNames.join(", ");
    style["--phi-effects-animation-duration"] = animationDurations.join(", ");
    style["--phi-effects-animation-delay"] = animationDelays.join(", ");
    style["--phi-effects-animation-easing"] = animationEasings.join(", ");
    style["--phi-effects-animation-composition"] = animationCompositions.join(", ");
  }
  if (perspectivePx && !transformOrigin) {
    transformOrigin = PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.origin ?? undefined;
  }
  if (transformOrigin) {
    style.transformOrigin = transformOrigin;
  }
  if (hasOpacity) {
    style.opacity = finalOpacity;
  }

  return style;
}

export function resolveRenderableBlockStaticEffectsStyle(
  config: Partial<PhiRenderableBlockBase> | null | undefined,
): CSSProperties | undefined {
  const opacity = mergeRenderableBlockDefaults(config).effects?.opacity;

  return typeof opacity === "number" && opacity < 1
    ? { opacity }
    : undefined;
}

export function resolveRenderableBlockEffectsAttributes(
  config: Partial<PhiRenderableBlockBase> | null | undefined,
): PhiRenderableBlockEffectsAttributes | undefined {
  const block = mergeRenderableBlockDefaults(config);
  const hasTransitions = (block.effects?.transitions?.length ?? 0) > 0;
  const viewportEffects = block.effects?.viewportEffects ?? [];
  const hasViewportEffects = viewportEffects.length > 0;
  const hasViewportOpacity = viewportEffects.some((effect) => effect.property === "opacity");
  if (!hasTransitions && !hasViewportEffects) {
    return undefined;
  }

  return {
    ...(hasTransitions
      ? {
          "data-phi-effects-transition": "composite",
          "data-phi-effects-trigger": block.effects?.transitionTrigger ?? "on_mount",
          "data-phi-effects-once": block.effects?.transitionOnce === false ? "false" : "true",
          ...(block.effects?.transitionTrigger === "on_visible" ? { "data-phi-effects-state": "idle" } : {}),
        }
      : {}),
    ...(hasViewportEffects
      ? {
          "data-phi-effects-viewport": "true",
          ...(hasViewportOpacity ? { "data-phi-effects-viewport-opacity": "true" } : {}),
        }
      : {}),
  };
}

export function resolveRenderableBlockViewportEffects(
  config: Partial<PhiRenderableBlockBase> | null | undefined,
): PhiRenderableBlockViewportEffect[] {
  const block = mergeRenderableBlockDefaults(config);
  return block.effects?.viewportEffects ?? [];
}
