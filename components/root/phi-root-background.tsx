import type { CSSProperties } from "react";

import { PhiBackgroundMotionLayer } from "../cms/clients/phi-background-motion-layer-lazy";
import {
  resolvePhiBackgroundMotion,
  resolvePhiBackgroundMotionHostStyle,
  resolvePhiBackgroundWidgetStyle,
  type PhiBackgroundMotion,
  type PhiBackgroundImageSourceKind,
  type PhiBackgroundMotionMode,
  type PhiCmsBackgroundWidgetConfig,
} from "../widgets/config/background";
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
 * Motion is the one part this layer resolves differently from a Region: it is the canonical Background
 * contract throughout, but only `parallax` describes something this layer can do. See
 * `PHI_ROOT_BACKGROUND_MOTION_MODES`.
 */

/**
 * The motion modes the Theme Root Background offers and honours.
 *
 * `fixed` means "hold the image still while the host travels past it", and this layer never travels:
 * it is viewport-fixed by construction, so the mode has nothing to hold still against and would be
 * indistinguishable from `static`. Offering it promised an effect that could not exist, so the Root
 * Background offers `static` and `parallax` alone; every other surface keeps the full contract.
 */
export const PHI_ROOT_BACKGROUND_MOTION_MODES: readonly PhiBackgroundMotionMode[] = [
  "static",
  "parallax",
];

/**
 * Where the Theme Root Background takes its picture from: the Site's Media library, and nothing else.
 *
 * This layer is the ground every Page stands on. An external URL here would make that ground depend
 * on a server nobody in the Site controls, so the Control offers no field for one. A block's inline
 * picture is not an exception to this: it shows, and a saved Theme takes it over into the library.
 */
export const PHI_ROOT_BACKGROUND_IMAGE_SOURCE_KINDS: readonly PhiBackgroundImageSourceKind[] = ["asset"];

function readPhiRootBackgroundConfig(
  root: PhiSiteThemeRoot | null | undefined,
  mode: PhiThemeMode,
): PhiCmsBackgroundWidgetConfig | null {
  return (mode === "dark" ? root?.background?.dark : root?.background?.light) ?? null;
}

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
  const configured = readPhiRootBackgroundConfig(root, mode);
  return configured ? resolvePhiBackgroundWidgetStyle(configured) : null;
}

/**
 * The motion this layer actually runs, which is `parallax` or nothing at all.
 *
 * A record still carrying `fixed` from before it was withdrawn resolves to no motion and paints the
 * static ground it always painted, so the stored value stays readable without ever mounting a layer
 * that could not move.
 */
export function resolvePhiRootBackgroundMotion(
  root: PhiSiteThemeRoot | null | undefined,
  mode: PhiThemeMode,
): PhiBackgroundMotion | null {
  const motion = resolvePhiBackgroundMotion(readPhiRootBackgroundConfig(root, mode));
  return motion && PHI_ROOT_BACKGROUND_MOTION_MODES.includes(motion.mode) ? motion : null;
}

export function resolvePhiRootBackgroundLayerStyle(
  root: PhiSiteThemeRoot | null | undefined,
  mode: PhiThemeMode,
): CSSProperties {
  const motion = resolvePhiRootBackgroundMotion(root, mode);
  return {
    position: "fixed",
    inset: 0,
    zIndex: -1,
    pointerEvents: "none",
    /*
     * The fallback ground as a longhand, never as the `background` shorthand.
     *
     * The paint spread in below emits longhands, and React warns when a rerender has to drop one of
     * those from an element whose shorthand is still set: switching a Root Background from an image to
     * a colour removes `background-image` while `background` stands, which is exactly the warning. The
     * value is a colour, so the longhand says the same thing without the shorthand's silent resets.
     */
    backgroundColor: "var(--ant-color-bg-layout)",
    /*
     * Under motion the image belongs to the moving layer alone. Painting it here as well would leave a
     * second, still copy of the same picture underneath the one that moves. The fallback ground stays:
     * the motion layer is a negative-z child of this fixed, z-indexed box, so it paints above this
     * element's own background and below everything in the Page.
     */
    ...(motion
      ? resolvePhiBackgroundMotionHostStyle(readPhiRootBackgroundConfig(root, mode))
      : resolvePhiRootBackgroundPaintStyle(root, mode) ?? {}),
  };
}

export function PhiRootBackgroundLayer({
  root,
  mode,
}: {
  root: PhiSiteThemeRoot | null | undefined;
  mode: PhiThemeMode;
}) {
  const configured = readPhiRootBackgroundConfig(root, mode);
  const motion = resolvePhiRootBackgroundMotion(root, mode);

  return (
    <div
      aria-hidden
      data-phi-root-background="true"
      style={resolvePhiRootBackgroundLayerStyle(root, mode)}
    >
      {motion && configured ? <PhiBackgroundMotionLayer config={configured} /> : null}
    </div>
  );
}
