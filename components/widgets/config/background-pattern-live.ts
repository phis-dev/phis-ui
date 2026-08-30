import type { PhiBackgroundDirection } from "./background";
import {
  PHI_CORE_BACKGROUND_PATTERN_KEYS,
  type PhiBackgroundNoiseGrain,
  type PhiBackgroundPatternKey,
  type PhiBackgroundPatternLayer,
  type PhiBackgroundPatternValues,
} from "./background-pattern-contract";

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

function patternColor(opacity: number) {
  return `rgba(255, 255, 255, ${opacity})`;
}

export function resolvePhiBackgroundPatternLiveLayer(
  patternKey: PhiBackgroundPatternKey,
  values: PhiBackgroundPatternValues,
  opacity: number,
): PhiBackgroundPatternLayer | null {
  const scale = resolveScale(values);
  const color = patternColor(opacity);

  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.stripes) {
    const lineWidth = Math.max(1, scale / 4);
    return {
      images: [
        `repeating-linear-gradient(${resolveDirection(values)}, ${color} 0, ${color} ${lineWidth}px, transparent ${lineWidth}px, transparent ${scale}px)`,
      ],
      repeats: ["repeat"],
    };
  }
  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.grid) {
    return {
      images: [
        `linear-gradient(${color} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      ],
      sizes: [`${scale}px ${scale}px`, `${scale}px ${scale}px`],
      repeats: ["repeat", "repeat"],
    };
  }
  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.dots) {
    const dotSize = Math.max(1, Math.min(3, scale / 5));
    return {
      images: [
        `radial-gradient(circle, ${color} 0 ${dotSize}px, transparent ${dotSize + 0.5}px)`,
      ],
      sizes: [`${scale}px ${scale}px`],
      repeats: ["repeat"],
    };
  }
  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.checker) {
    return {
      images: [
        `conic-gradient(${color} 25%, transparent 0 50%, ${color} 0 75%, transparent 0)`,
      ],
      sizes: [`${scale * 2}px ${scale * 2}px`],
      repeats: ["repeat"],
    };
  }
  if (patternKey === PHI_CORE_BACKGROUND_PATTERN_KEYS.crosshatch) {
    const direction = directionToDegrees(resolveDirection(values));
    return {
      images: [
        `repeating-linear-gradient(${direction}deg, ${color} 0 1px, transparent 1px ${scale}px)`,
        `repeating-linear-gradient(${direction + 90}deg, ${color} 0 1px, transparent 1px ${scale}px)`,
      ],
      repeats: ["repeat", "repeat"],
    };
  }
  return null;
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
    images: [`url("data:image/svg+xml,${encodeURIComponent(noiseSvg)}")`],
    sizes: [`${tileSize}px ${tileSize}px`],
    positions: ["0 0"],
    repeats: ["repeat"],
  };
}
