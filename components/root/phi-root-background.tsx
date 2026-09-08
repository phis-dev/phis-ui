import type { CSSProperties } from "react";

import { resolvePhiBackgroundWidgetStyle } from "../widgets/config/background";
import type { PhiSiteThemeRoot } from "../../types/site-theme";
import type { PhiThemeMode } from "../../theme/phi-theme-presets";

/**
 * The Theme Root Background layer (SHELL.md "Root Background and Shell Backdrop Layers").
 *
 * Painted exactly once, fixed to the viewport so it does not scroll with Page content, and behind
 * everything else in the Root Layout: `z-index: -1` keeps it under the in-flow content, and the
 * `.ant-app` ground above it is transparent (styles/root.css) so this layer owns the page ground.
 * An unconfigured mode falls back to the resolved Ant Design layout background, which is what the
 * `.ant-app` rule painted before this layer existed -- the fallback look is unchanged.
 *
 * Motion is inert here by construction: the layer is viewport-fixed, so there is nothing to move
 * against, and no motion layer is mounted for it.
 */
/**
 * What the ground paints, without the geometry of the layer that paints it.
 *
 * `null` where the mode has no configured ground, which is the caller's cue to use the resolved Ant
 * Design layout background -- the layer below does it with a CSS variable, the Theme preview with the
 * token it has already resolved. Separated so both ask this one question about a mode rather than
 * each reaching into `root.background` and deciding for itself what an empty one means.
 */
export function resolvePhiRootBackgroundPaintStyle(
  root: PhiSiteThemeRoot | null | undefined,
  mode: PhiThemeMode,
): CSSProperties | null {
  const configured = mode === "dark" ? root?.background?.dark : root?.background?.light;
  return configured ? resolvePhiBackgroundWidgetStyle(configured) : null;
}

export function resolvePhiRootBackgroundLayerStyle(
  root: PhiSiteThemeRoot | null | undefined,
  mode: PhiThemeMode,
): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex: -1,
    pointerEvents: "none",
    background: "var(--ant-color-bg-layout)",
    ...(resolvePhiRootBackgroundPaintStyle(root, mode) ?? {}),
  };
}

export function PhiRootBackgroundLayer({
  root,
  mode,
}: {
  root: PhiSiteThemeRoot | null | undefined;
  mode: PhiThemeMode;
}) {
  return (
    <div
      aria-hidden
      data-phi-root-background="true"
      style={resolvePhiRootBackgroundLayerStyle(root, mode)}
    />
  );
}
