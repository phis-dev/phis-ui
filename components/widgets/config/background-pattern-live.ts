import type { PhiBackgroundDirection } from "./background";
import {
  PHI_CORE_BACKGROUND_PATTERN_KEYS,
  type PhiBackgroundNoiseGrain,
  type PhiBackgroundPatternInk,
  type PhiBackgroundPatternKey,
  type PhiBackgroundPatternLayer,
  type PhiBackgroundPatternValues,
} from "./background-pattern-contract";

/**
 * The rendered form of a Pattern Overlay.
 *
 * Every Pattern is one SVG image rather than a stack of CSS gradients, because the ink may be a
 * gradient and a CSS colour stop only takes a colour: there is nowhere in `repeating-linear-gradient`
 * to put another gradient. Inside an SVG the two are separable -- the shapes become a mask and the ink
 * fills a rectangle through it -- so the layer stays a single `background-image` and no surface needs
 * an extra element to carry it.
 *
 * The image spans the painting area rather than tiling, so a gradient ink runs across the whole surface
 * instead of restarting in every tile. The shapes keep their own size in pixels regardless: the SVG
 * carries no `viewBox`, so one user unit stays one pixel of the area it is painted into.
 */

export const PHI_BACKGROUND_PATTERN_DEFAULT_INK: PhiBackgroundPatternInk = {
  kind: "color",
  color: "#ffffff",
};

/**
 * A colour Overlay starts black, where a Pattern starts white.
 *
 * The two inks answer different questions. A Pattern has to be visible against the ground it is drawn
 * on; a wash is reached for to hold a picture down, so the first thing it should do is darken. A
 * lightening wash or a colour cast is one pick away.
 */
export const PHI_BACKGROUND_COLOR_OVERLAY_DEFAULT_INK: PhiBackgroundPatternInk = {
  kind: "color",
  color: "#000000",
};

function resolveScale(values: PhiBackgroundPatternValues, fallback = 12) {
  const value = values.scale;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(2, Math.min(64, value))
    : fallback;
}

function resolveDirection(values: PhiBackgroundPatternValues): PhiBackgroundDirection {
  const value = values.direction;
  return typeof value === "string" && (
    value === "to right" ||
    value === "to left" ||
    value === "to bottom" ||
    value === "to top" ||
    /^-?\d+(?:\.\d+)?deg$/.test(value)
  )
    ? value as PhiBackgroundDirection
    : "45deg";
}

function directionToDegrees(direction: PhiBackgroundDirection) {
  if (direction.endsWith("deg")) return Number.parseFloat(direction);
  if (direction === "to top") return 0;
  if (direction === "to right") return 90;
  if (direction === "to bottom") return 180;
  return 270;
}

/**
 * One tiled family of shapes, in the coordinates of its own tile.
 *
 * Crosshatch is the reason this is a list: two line families at different angles cannot share a tile,
 * and an SVG `pattern` carries one transform. Each family becomes its own `pattern`, and the mask
 * simply paints them over one another.
 */
type PhiBackgroundPatternShapeFamily = {
  tile: number;
  rotate?: number;
  shapes: string;
};

function resolvePatternShapeFamilies(
  patternKey: PhiBackgroundPatternKey,
  values: PhiBackgroundPatternValues,
): readonly PhiBackgroundPatternShapeFamily[] | null {
  const scale = resolveScale(values);

  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.stripes) {
    const lineWidth = Math.max(1, scale / 4);
    return [{
      tile: scale,
      rotate: directionToDegrees(resolveDirection(values)),
      shapes: `<rect width="${scale}" height="${lineWidth}" fill="#fff"/>`,
    }];
  }

  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.grid) {
    return [{
      tile: scale,
      shapes: `<rect width="${scale}" height="1" fill="#fff"/><rect width="1" height="${scale}" fill="#fff"/>`,
    }];
  }

  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.dots) {
    const radius = Math.max(1, Math.min(3, scale / 5));
    const center = scale / 2;
    return [{
      tile: scale,
      shapes: `<circle cx="${center}" cy="${center}" r="${radius}" fill="#fff"/>`,
    }];
  }

  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.checker) {
    return [{
      tile: scale * 2,
      shapes: [
        `<rect width="${scale}" height="${scale}" fill="#fff"/>`,
        `<rect x="${scale}" y="${scale}" width="${scale}" height="${scale}" fill="#fff"/>`,
      ].join(""),
    }];
  }

  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.crosshatch) {
    const degrees = directionToDegrees(resolveDirection(values));
    return [degrees, degrees + 90].map((rotate) => ({
      tile: scale,
      rotate,
      shapes: `<rect width="${scale}" height="1" fill="#fff"/>`,
    }));
  }

  return null;
}

/**
 * The ink as an SVG paint, plus the gradient definition it needs.
 *
 * The endpoints follow the CSS reading of the angle -- zero points up, degrees run clockwise -- so a
 * Pattern ink and a Background Base gradient given the same direction lean the same way.
 */
function resolvePatternInkPaint(ink: PhiBackgroundPatternInk) {
  if (ink.kind === "color") {
    return { defs: "", paint: ink.color };
  }

  const radians = (directionToDegrees(ink.direction) * Math.PI) / 180;
  const dx = Math.sin(radians) / 2;
  const dy = Math.cos(radians) / 2;
  const stops = ink.stops
    .map((stop) => `<stop offset="${stop.percent}%" stop-color="${stop.color}"/>`)
    .join("");

  return {
    defs: `<linearGradient id="phi-ink" x1="${0.5 - dx}" y1="${0.5 + dy}" x2="${0.5 + dx}" y2="${0.5 - dy}">${stops}</linearGradient>`,
    paint: "url(#phi-ink)",
  };
}

function encodeSvgLayer(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function resolvePhiBackgroundPatternLiveLayer(
  patternKey: PhiBackgroundPatternKey,
  values: PhiBackgroundPatternValues,
  opacity: number,
  ink: PhiBackgroundPatternInk = PHI_BACKGROUND_PATTERN_DEFAULT_INK,
): PhiBackgroundPatternLayer | null {
  const families = resolvePatternShapeFamilies(patternKey, values);
  if (!families) {
    return null;
  }

  const inkPaint = resolvePatternInkPaint(ink);
  const patterns = families
    .map((family, index) => [
      `<pattern id="phi-shape-${index}" width="${family.tile}" height="${family.tile}" patternUnits="userSpaceOnUse"`,
      family.rotate ? ` patternTransform="rotate(${family.rotate})"` : "",
      `>${family.shapes}</pattern>`,
    ].join(""))
    .join("");
  const maskLayers = families
    .map((_, index) => `<rect width="100%" height="100%" fill="url(#phi-shape-${index})"/>`)
    .join("");
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">',
    `<defs>${patterns}${inkPaint.defs}<mask id="phi-mask">${maskLayers}</mask></defs>`,
    `<rect width="100%" height="100%" fill="${inkPaint.paint}" mask="url(#phi-mask)" opacity="${Math.max(0, Math.min(1, opacity))}"/>`,
    "</svg>",
  ].join("");

  return {
    images: [encodeSvgLayer(svg)],
    sizes: ["100% 100%"],
    positions: ["0 0"],
    repeats: ["no-repeat"],
  };
}

/**
 * The rendered form of a colour Overlay: the ink over the whole painting area, nothing masked out.
 *
 * It is an SVG like the other two rather than a CSS gradient, so that a gradient ink leans the way the
 * same direction leans everywhere else and the Overlay's opacity stays one attribute instead of being
 * mixed into every stop.
 */
export function resolvePhiBackgroundColorLiveLayer(
  ink: PhiBackgroundPatternInk,
  opacity: number,
): PhiBackgroundPatternLayer {
  const inkPaint = resolvePatternInkPaint(ink);
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">',
    inkPaint.defs ? `<defs>${inkPaint.defs}</defs>` : "",
    `<rect width="100%" height="100%" fill="${inkPaint.paint}" opacity="${Math.max(0, Math.min(1, opacity))}"/>`,
    "</svg>",
  ].join("");

  return {
    images: [encodeSvgLayer(svg)],
    sizes: ["100% 100%"],
    positions: ["0 0"],
    repeats: ["no-repeat"],
  };
}

export function resolvePhiBackgroundNoiseLiveLayer(
  grain: PhiBackgroundNoiseGrain,
  opacity: number,
): PhiBackgroundPatternLayer {
  const frequency = grain === "fine" ? 0.9 : grain === "medium" ? 0.5 : 0.24;
  const tileSize = grain === "fine" ? 48 : grain === "medium" ? 72 : 96;
  const noiseSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}">`,
    '<filter id="noise">',
    `<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="1" stitchTiles="stitch"/>`,
    '<feColorMatrix type="saturate" values="0"/>',
    '</filter>',
    `<rect width="100%" height="100%" filter="url(#noise)" opacity="${opacity}"/>`,
    '</svg>',
  ].join("");
  return {
    images: [encodeSvgLayer(noiseSvg)],
    sizes: [`${tileSize}px ${tileSize}px`],
    positions: ["0 0"],
    repeats: ["repeat"],
  };
}
