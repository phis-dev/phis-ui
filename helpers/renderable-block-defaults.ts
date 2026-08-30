import type {
  PhiRenderableBlockAnchor,
  PhiRenderableBlockBase,
  PhiRenderableBlockEffects,
  PhiRenderableBlockTransition,
  PhiRenderableBlockViewportEffect,
  PhiRenderableBlockVisibility,
} from "../types";
import { PHI_VIEWER_ACCESS_ANYONE } from "../types/access";

export const PHI_RENDERABLE_BLOCK_DEFAULT_RENDER_MODE = "live" as const;
export const PHI_RENDERABLE_BLOCK_DEFAULT_VISIBILITY: PhiRenderableBlockVisibility = "visible";
export const PHI_RENDERABLE_BLOCK_DEFAULT_ACCESS_POLICY = PHI_VIEWER_ACCESS_ANYONE;
export const PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_FLAGS = 0;
export const PHI_RENDERABLE_BLOCK_DEFAULT_ENABLED = true;
export const PHI_RENDERABLE_BLOCK_DEFAULT_DEBUG_MODE = false;
export const PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR: PhiRenderableBlockAnchor = {
  horizontal: "left",
  vertical: "top",
};
export const PHI_RENDERABLE_BLOCK_DEFAULT_Z_INDEX = 0;
export const PHI_RENDERABLE_BLOCK_DEFAULT_OPACITY = 1;
export const PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION: PhiRenderableBlockTransition = {
  type: "fade",
  mode: "in",
  axis: "z",
  direction: "bottom",
  distance: 200,
  angleDeg: 90,
  scale: 0.96,
  origin: "center",
  originOffsetX: null,
  originOffsetY: null,
  perspectivePx: 800,
  durationMs: 1000,
  delayMs: 0,
  easing: "ease-out",
};
export const PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_EFFECT: PhiRenderableBlockViewportEffect = {
  axis: "y",
  property: "translate",
  from: 0,
  to: 200,
  unit: "px",
  rangeStart: "enter",
  rangeEnd: "exit",
  easing: "linear",
  clamp: true,
};
export const PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS: PhiRenderableBlockEffects = {
  opacity: 1,
  transitionTrigger: "on_mount",
  transitionOnce: true,
  transitions: [],
  viewportEffects: [],
};

export function createPhiRenderableBlockDefaults(): PhiRenderableBlockBase {
  return {
    renderMode: PHI_RENDERABLE_BLOCK_DEFAULT_RENDER_MODE,
    visibility: PHI_RENDERABLE_BLOCK_DEFAULT_VISIBILITY,
    accessPolicy: PHI_RENDERABLE_BLOCK_DEFAULT_ACCESS_POLICY,
    viewportFlags: PHI_RENDERABLE_BLOCK_DEFAULT_VIEWPORT_FLAGS,
    enabled: PHI_RENDERABLE_BLOCK_DEFAULT_ENABLED,
    debugMode: PHI_RENDERABLE_BLOCK_DEFAULT_DEBUG_MODE,
    anchor: PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR,
    zIndex: PHI_RENDERABLE_BLOCK_DEFAULT_Z_INDEX,
    opacity: PHI_RENDERABLE_BLOCK_DEFAULT_OPACITY,
    effects: PHI_RENDERABLE_BLOCK_DEFAULT_EFFECTS,
  };
}
