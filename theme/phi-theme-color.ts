/**
 * A colour as a palette states it, read into numbers so two spellings of one colour compare equal.
 *
 * A palette is written by hand, by a picker and by a Module, and each spells a colour its own way:
 * `#1677FF` and `#1677ff`, `#fff` and `#ffffff`, `rgb(22, 119, 255)`. Comparing the strings told the
 * Theme workspace that a colour the author had not changed was theirs.
 */

export type PhiThemeRgba = { r: number; g: number; b: number; a: number };

/* Enough of CSS colour for what a palette states: hex in its four lengths and `rgb()`/`rgba()`. */
export function parsePhiThemeColor(value: string): PhiThemeRgba | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(text)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join("") : hex;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
      a: full.length >= 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1,
    };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+)(%?))?/.exec(text);
  if (!rgb) return null;
  const alpha = rgb[4] == null ? 1 : Number(rgb[4]) / (rgb[5] ? 100 : 1);
  return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: Math.min(1, Math.max(0, alpha)) };
}

/**
 * Whether two values name the same colour: the same channels to the unit and the same alpha to the step
 * an eight-digit hex can say. What does not read as a colour compares as text.
 */
export function isSamePhiThemeColor(left: unknown, right: unknown): boolean {
  if (typeof left !== "string" || typeof right !== "string") return left === right;
  const first = parsePhiThemeColor(left);
  const second = parsePhiThemeColor(right);
  if (!first || !second) return left.trim().toLowerCase() === right.trim().toLowerCase();
  return Math.round(first.r) === Math.round(second.r)
    && Math.round(first.g) === Math.round(second.g)
    && Math.round(first.b) === Math.round(second.b)
    && Math.abs(first.a - second.a) < 0.5 / 255;
}
