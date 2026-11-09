export const PHI_CSS_LENGTH_UNITS = ["px", "%", "em", "rem", "vw", "vh"] as const;

export type PhiCssLengthUnit = (typeof PHI_CSS_LENGTH_UNITS)[number];
export type PhiCssLength = number | `${number}${PhiCssLengthUnit}`;

export type PhiCssLengthPart = {
  value: number;
  unit: PhiCssLengthUnit;
};

const CSS_LENGTH_PATTERN = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(px|%|em|rem|vw|vh)$/;
const BARE_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

export function readPhiCssLengthPart(value: unknown): PhiCssLengthPart | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value, unit: "px" } : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  // `Number("")` is 0 and `Number("0x1f")` is 31: a field emptied in the Inspector read as "0px", and a
  // hex literal as a length. Only a decimal, with or without a unit, is one.
  if (!trimmed) {
    return null;
  }
  if (BARE_NUMBER_PATTERN.test(trimmed)) {
    return { value: Number(trimmed), unit: "px" };
  }

  const match = CSS_LENGTH_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const parsedValue = Number(match[1]);
  return Number.isFinite(parsedValue)
    ? { value: parsedValue, unit: match[2] as PhiCssLengthUnit }
    : null;
}

export function serializePhiCssLength(
  value: number,
  unit: PhiCssLengthUnit,
): PhiCssLength | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  return unit === "px" ? value : `${value}${unit}`;
}

export function readPhiLengthValue(value: unknown): PhiCssLength | null {
  const part = readPhiCssLengthPart(value);
  return part ? serializePhiCssLength(part.value, part.unit) : null;
}
