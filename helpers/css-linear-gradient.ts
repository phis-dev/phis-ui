/**
 * A CSS `linear-gradient(...)` read into a direction and stops, or why it cannot be one.
 *
 * One reader for every place that edits a gradient: the Background stores what it returns, and the
 * colour picker offers to edit only what it can read -- the picker had a second parser that accepted
 * corners and two-position stops the Background then refused.
 */
export type PhiCssLinearGradientDirection = "to right" | "to left" | "to bottom" | "to top" | `${number}deg`;

export type PhiCssLinearGradientStop = {
  color: string;
  percent: number;
};

export type PhiCssLinearGradient = {
  direction: PhiCssLinearGradientDirection;
  stops: PhiCssLinearGradientStop[];
};

/**
 * `null` means the string is no gradient at all and may still be a colour or an image; a gradient that
 * cannot be held is a problem, never a colour.
 */
export type PhiCssLinearGradientReading =
  | { gradient: PhiCssLinearGradient; problem?: undefined }
  | { gradient?: undefined; problem: string };

function splitPhiCssGradientArguments(input: string) {
  const stops: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of input) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      stops.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) stops.push(current.trim());
  return stops;
}

const PHI_CSS_NUMBER = "[-+]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
const PHI_CSS_ANGLE = new RegExp(`^(${PHI_CSS_NUMBER})(deg|grad|rad|turn)$`, "i");
const PHI_CSS_GRADIENT_STOP = new RegExp(`^(.+?)(?:\\s+(${PHI_CSS_NUMBER})%)?$`);
const PHI_CSS_DEGREES_PER_UNIT = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 } as const;

/**
 * The first argument, when it is a direction.
 *
 * Only an angle or `to <side>` is one. Everything else is the first colour stop -- `red 0%` included,
 * which read as a direction used to swallow the first stop and fall back to `to right`. A direction the
 * Base cannot hold (a corner, an unreadable angle) is a problem rather than a stop.
 */
function readPhiCssGradientDirection(
  part: string,
): { direction: PhiCssLinearGradientDirection } | { problem: string } | null {
  const side = part.match(/^to\s+(.+)$/i);
  if (side) {
    const target = side[1].trim().toLowerCase();
    return target === "right" || target === "left" || target === "bottom" || target === "top"
      ? { direction: `to ${target}` }
      : { problem: `Gradient direction "${part}" is not supported; use an angle or one side.` };
  }
  const angle = part.match(PHI_CSS_ANGLE);
  if (!angle) {
    return null;
  }
  const unit = angle[2].toLowerCase() as keyof typeof PHI_CSS_DEGREES_PER_UNIT;
  const degrees = Number(angle[1]) * PHI_CSS_DEGREES_PER_UNIT[unit];
  return Number.isFinite(degrees)
    ? { direction: `${Math.round(degrees * 1000) / 1000}deg` }
    : { problem: `Gradient angle "${part}" is not a number.` };
}

type PhiCssGradientStopReading = { color: string; percent: number | null };

function readPhiCssGradientStop(part: string): PhiCssGradientStopReading | null {
  const match = part.match(PHI_CSS_GRADIENT_STOP);
  const color = match?.[1]?.trim();
  if (!match || !color) {
    return null;
  }
  // A colour is one token outside its parentheses; anything left over is a second position or a length.
  let bare = color;
  while (/\([^()]*\)/.test(bare)) bare = bare.replace(/\([^()]*\)/g, "");
  if (/\s/.test(bare)) {
    return null;
  }
  const percent = match[2] == null ? null : Number(match[2]);
  return percent == null || Number.isFinite(percent) ? { color, percent } : null;
}

/**
 * Positions for stops that name none, the way CSS places them: the first at 0, the last at 100, and
 * any run in between evenly spaced between its neighbours.
 */
function placePhiCssGradientStops(
  stops: readonly PhiCssGradientStopReading[],
): PhiCssLinearGradientStop[] {
  const percents = stops.map((stop) => stop.percent);
  percents[0] ??= 0;
  percents[percents.length - 1] ??= 100;
  let previous = 0;
  while (previous < percents.length - 1) {
    let next = previous + 1;
    while (percents[next] == null) next += 1;
    const start = percents[previous] as number;
    const end = percents[next] as number;
    for (let index = previous + 1; index < next; index += 1) {
      percents[index] = start + ((end - start) * (index - previous)) / (next - previous);
    }
    previous = next;
  }
  return stops.map((stop, index) => ({ color: stop.color, percent: percents[index] as number }));
}

export function readPhiCssLinearGradient(css: string): PhiCssLinearGradientReading | null {
  const background = css.trim();
  const kind = background.match(/^([a-z-]*gradient)\(/i)?.[1]?.toLowerCase();
  if (!kind) {
    return null;
  }
  if (kind !== "linear-gradient") {
    return { problem: `A Background gradient is linear; "${kind}" is not supported.` };
  }
  if (!background.endsWith(")")) {
    return { problem: "The gradient is not closed." };
  }

  const parts = splitPhiCssGradientArguments(background.slice("linear-gradient(".length, -1));
  const direction = parts.length > 0 ? readPhiCssGradientDirection(parts[0]) : null;
  if (direction && "problem" in direction) {
    return { problem: direction.problem };
  }
  const stopParts = direction ? parts.slice(1) : parts;
  if (stopParts.length < 2) {
    return { problem: "A gradient needs at least two colour stops." };
  }
  const stops = stopParts.map(readPhiCssGradientStop);
  const unreadable = stops.findIndex((stop) => stop === null);
  if (unreadable >= 0) {
    return { problem: `Gradient stop "${stopParts[unreadable]}" is not a colour with a percentage.` };
  }
  return {
    gradient: {
      // What CSS draws when a gradient names no direction.
      direction: direction?.direction ?? "to bottom",
      stops: placePhiCssGradientStops(stops as PhiCssGradientStopReading[]),
    },
  };
}
