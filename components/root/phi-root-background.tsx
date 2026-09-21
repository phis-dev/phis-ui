"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { PhiBackgroundMotionLayer } from "../cms/clients/phi-background-motion-layer-lazy";
import {
  normalizePhiBackgroundWidgetConfig,
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
 * ground above it is transparent (styles/root.css) so this layer owns the page ground. An
 * unconfigured mode falls back to the resolved Ant Design layout background, which is what the
 * ground's own rule painted before this layer existed -- the fallback look is unchanged.
 *
 * Motion is the one part this layer resolves differently from a Region: it is the canonical Background
 * contract throughout, but only `parallax` describes something this layer can do. See
 * `PHI_ROOT_BACKGROUND_MOTION_MODES`.
 *
 * A picture does not arrive at once. So the layer is a frame holding one Picture at a time, and a Picture
 * that has to be fetched is painted over the Asset's placeholder -- a few hundred bytes of the picture,
 * scaled up, which is soft enough to read as a blur without a filter, and a filter is what Safari
 * mis-stacks -- and fades in once the browser has it. That holds for a picture from the cache too:
 * until script shows it nobody has seen it, and one that appears at hydration without a fade is exactly
 * the cut this avoids. One carried inline has nothing to wait for and shows at once. A new Picture -- the other mode, or a Theme draft -- joins on top of
 * the one on screen and fades in over it when its picture is there, so a mode switch cross-fades.
 *
 * Waiting is script's business, and the ground must never depend on script: styles/root.css holds a
 * pending picture back only where scripting is enabled, and shows it by itself after a few seconds in
 * case script never gets to it -- a page that failed to hydrate still gets its ground.
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

/** The frame every Picture is painted into: fixed to the viewport, behind everything, on the fallback ground. */
export function resolvePhiRootBackgroundFrameStyle(): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex: -1,
    pointerEvents: "none",
    /*
     * The fallback ground as a longhand, never as the `background` shorthand: it is the colour under
     * every Picture, including the moment before the first one shows.
     */
    backgroundColor: "var(--ant-color-bg-layout)",
  };
}

/** What one mode's ground paints, and what it has to wait for before it can show. */
export type PhiRootBackgroundPicture = {
  /** Identity of the painting. Two modes that paint the same thing share it and never cross-fade. */
  key: string;
  /** The paint of the picture layer, or under motion the host style the moving layer sits in. */
  paint: CSSProperties;
  motion: PhiCmsBackgroundWidgetConfig | null;
  /** The picture the browser has to fetch first. `null` for a colour, a gradient or an inline picture. */
  imageUrl: string | null;
  /** The blurred placeholder of an Asset, shown while `imageUrl` loads. */
  placeholder: CSSProperties | null;
};

/** The last `url(...)` of a background, which is the base picture: overlays are listed before it. */
function readPhiBackgroundBaseImageUrl(style: CSSProperties) {
  const matches = [...String(style.backgroundImage ?? "").matchAll(/url\("([^"]+)"\)/g)];
  return matches.at(-1)?.[1] ?? null;
}

export function resolvePhiRootBackgroundPicture(
  root: PhiSiteThemeRoot | null | undefined,
  mode: PhiThemeMode,
): PhiRootBackgroundPicture {
  const configured = readPhiRootBackgroundConfig(root, mode);
  const motion = resolvePhiRootBackgroundMotion(root, mode);
  const normalized = configured ? normalizePhiBackgroundWidgetConfig(configured) : null;
  const base = normalized?.base.kind === "image" ? normalized.base : null;
  /*
   * Under motion the moving layer draws the original, never a variant, so that is the picture to wait
   * for; and the image belongs to the moving layer alone, or a still copy would sit under the one that
   * moves.
   */
  const pictureStyle = normalized && base && motion
    ? resolvePhiBackgroundWidgetStyle({
      ...normalized,
      base: { ...base, variantKey: null, variantVersion: null },
      effect: null,
      motion: null,
    })
    : resolvePhiRootBackgroundPaintStyle(root, mode) ?? {};
  const url = base ? readPhiBackgroundBaseImageUrl(pictureStyle) : null;
  const blurDataUrl = base?.resolvedAsset?.blurDataUrl ?? null;

  return {
    key: JSON.stringify(configured ?? null),
    paint: motion ? resolvePhiBackgroundMotionHostStyle(configured) : pictureStyle,
    motion: motion && configured ? configured : null,
    imageUrl: url && !url.startsWith("data:") ? url : null,
    placeholder: url && blurDataUrl && !url.startsWith("data:")
      ? {
        backgroundImage: `url("${blurDataUrl}")`,
        backgroundSize: base?.size ?? "cover",
        backgroundPosition: "center",
        backgroundRepeat: base?.repeat ?? "no-repeat",
      }
      : null,
  };
}

type PhiRootBackgroundEntry = {
  id: number;
  picture: PhiRootBackgroundPicture;
  /** The picture is there: shown, or waiting. */
  loaded: boolean;
  /** Whether it appears at once: a Theme draft edited in place with nothing to fetch, or an inline picture. */
  instant: boolean;
  /**
   * What waits for the picture: the picture over its placeholder, for the first Picture, which the
   * server rendered; the whole layer over the Picture beneath it, for a later one.
   */
  waits: "picture" | "layer";
};

/** How long a covered Picture stays under the one fading in over it: the fade in root.css and a margin. */
const PHI_ROOT_BACKGROUND_FADE_MS = 450;

const PHI_ROOT_BACKGROUND_FILL: CSSProperties = { position: "absolute", inset: 0 };

export function PhiRootBackgroundLayer({
  root,
  mode,
}: {
  root: PhiSiteThemeRoot | null | undefined;
  mode: PhiThemeMode;
}) {
  const picture = resolvePhiRootBackgroundPicture(root, mode);
  const [entries, setEntries] = useState<PhiRootBackgroundEntry[]>(() => [{
    id: 0,
    picture,
    loaded: picture.imageUrl == null,
    instant: picture.imageUrl == null,
    waits: "picture",
  }]);
  const nextId = useRef(1);
  const lastMode = useRef(mode);
  const top = entries[entries.length - 1];

  /* A different painting joins on top and waits there for its picture. */
  useEffect(() => {
    if (top.picture.key === picture.key) return;
    const modeChanged = lastMode.current !== mode;
    lastMode.current = mode;
    const id = nextId.current++;
    setEntries((current) => [...current, {
      id,
      picture,
      loaded: false,
      instant: !modeChanged && picture.imageUrl == null,
      waits: "layer",
    }]);
    // `picture` is derived from `root` and `mode` on every render; its key is what identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picture.key, top.picture.key, mode]);

  /*
   * Every picture still waiting is fetched, not only the one on top: one that joined before the one
   * beneath had arrived must not leave that one waiting. The load is marked two frames later, so the
   * picture is painted, still hidden, before its fade starts.
   */
  const waiting = entries
    .filter((entry) => !entry.loaded)
    .map((entry) => [entry.id, entry.picture.imageUrl] as const);
  const waitingKey = JSON.stringify(waiting);
  useEffect(() => {
    const frames: number[] = [];
    const images = (JSON.parse(waitingKey) as [number, string | null][]).map(([id, url]) => {
      const markNextFrame = () => {
        frames.push(window.requestAnimationFrame(() => {
          frames.push(window.requestAnimationFrame(() => setEntries((current) => current.map((entry) => (
            entry.id === id ? { ...entry, loaded: true } : entry
          )))));
        }));
      };
      if (!url) {
        markNextFrame();
        return null;
      }
      const image = new Image();
      image.src = url;
      if (image.complete && image.naturalWidth > 0) {
        markNextFrame();
        return image;
      }
      /* A picture that fails shows anyway: the layer then paints exactly what a plain background would. */
      image.onload = markNextFrame;
      image.onerror = markNextFrame;
      return image;
    });
    return () => {
      frames.forEach((frame) => window.cancelAnimationFrame(frame));
      for (const image of images) {
        if (image) image.onload = image.onerror = null;
      }
    };
  }, [waitingKey]);

  /* What the entry on top covers goes once it has faded in over it. */
  useEffect(() => {
    if (entries.length === 1 || !top.loaded) return;
    const id = top.id;
    const timer = window.setTimeout(
      () => setEntries((current) => current.filter((entry) => entry.id >= id)),
      top.instant ? 0 : PHI_ROOT_BACKGROUND_FADE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [entries.length, top.id, top.loaded, top.instant]);

  return (
    <div aria-hidden data-phi-root-background="true" style={resolvePhiRootBackgroundFrameStyle()}>
      {entries.map((entry) => {
        const state = entry.loaded ? "shown" : "pending";
        const instant = entry.instant ? "true" : undefined;
        return (
          <div
            key={entry.id}
            data-phi-root-background-layer="true"
            data-phi-state={entry.waits === "layer" ? state : undefined}
            data-phi-instant={entry.waits === "layer" ? instant : undefined}
            style={{ ...PHI_ROOT_BACKGROUND_FILL, ...entry.picture.placeholder }}
          >
            <div
              data-phi-root-background-picture="true"
              data-phi-state={entry.waits === "picture" ? state : undefined}
              data-phi-instant={entry.waits === "picture" ? instant : undefined}
              style={{ ...PHI_ROOT_BACKGROUND_FILL, isolation: "isolate", ...entry.picture.paint }}
            >
              {entry.picture.motion ? <PhiBackgroundMotionLayer config={entry.picture.motion} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
