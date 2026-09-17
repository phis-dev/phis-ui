/*
 * The wordmark "phi/s" as a monoline stroke drawing, shared by every generator that draws it.
 *
 * Not type: letters are drawn upright on a baseline at y=0 (ascender 400, x-height 400/phi, descender
 * 120) and are meant to be sheared as one group by 14 degrees, so the stem of the i and the slash lean
 * at exactly the same angle. Round caps make every terminal a pill. Two lines tie the word together:
 * the ascender line, shared by the h, the dot of the i and the top of the slash, and the descender
 * line, shared by the foot of the p and the bottom of the slash.
 */

/*
 * Letter geometry, all on one grid and one ratio.
 *
 * The ascender line sits at -400 and the descender line at +120; those two outer lines are fixed. The
 * body between baseline and x-height is the ascender height divided by phi -- the golden ratio the name
 * of the whole thing alludes to -- and the gap between glyphs is that body divided by phi squared.
 * Every curve is a circular arc: the bowl of the p is a stadium whose ends are half circles of the body
 * height, the shoulder of the h a half circle of radius 90, the s two circles stacked between baseline
 * and x-height. p and h share one width. Strokes are equal, so equal path gaps are equal visual gaps.
 */
const PHI = (1 + Math.sqrt(5)) / 2;
const ASCENDER = 400;
const DESCENDER = 120;
const X_HEIGHT = Math.round((ASCENDER / PHI) * 10) / 10;          // 247.2
const GAP = Math.round((X_HEIGHT / (PHI * PHI)) * 10) / 10;      // 94.4
const LETTER_WIDTH = 180;      // p and h, stem to far edge
const S_R = X_HEIGHT / 4;      // two circles between x-height line and baseline
const P_LEFT = 0;
const H_LEFT = P_LEFT + LETTER_WIDTH + GAP;
const I_LEFT = H_LEFT + LETTER_WIDTH + GAP;   // a stem has no width of its own
const SLASH_LEFT = I_LEFT + GAP;              // vertical before the shear, no width of its own
const S_LEFT = SLASH_LEFT + GAP;
const S_CX = S_LEFT + S_R;
const X = -X_HEIGHT;
const P_R = X_HEIGHT / 2;

const P = [
  // p: stem from the x-height line to the descender line, bowl as a stadium closed at the x-height line
  `M ${P_LEFT} ${X} V ${DESCENDER}`,
  `M ${P_LEFT} ${X} H ${P_LEFT + LETTER_WIDTH - P_R} A ${P_R} ${P_R} 0 0 1 ${P_LEFT + LETTER_WIDTH - P_R} 0 H ${P_LEFT}`,
];
const H = [
  // h: stem from the ascender line, shoulder a half circle topping out at the x-height line
  `M ${H_LEFT} ${-ASCENDER} V 0`,
  `M ${H_LEFT} ${X + 90} A 90 90 0 0 1 ${H_LEFT + LETTER_WIDTH} ${X + 90} V 0`,
];
// i: body stem and a pill for the dot, the dot's top on the ascender line
const I = [`M ${I_LEFT} ${X} V 0`, `M ${I_LEFT} ${-ASCENDER} V ${-ASCENDER + 8}`];
// slash: from the ascender line to the descender line
const SLASH_PATH = `M ${SLASH_LEFT} ${-ASCENDER} V ${DESCENDER}`;
// s: two circles, tangent to the x-height line at the top and the baseline below; three quarters of
// the upper one from its right side over the top down to the waist, then three quarters of the lower
// one from the waist over the right side and the bottom to its left side
const S = `M ${S_CX + S_R} ${X + S_R} A ${S_R} ${S_R} 0 0 0 ${S_CX - S_R} ${X + S_R} A ${S_R} ${S_R} 0 0 0 ${S_CX} ${X + 2 * S_R} `
  + `A ${S_R} ${S_R} 0 0 1 ${S_CX + S_R} ${-S_R} A ${S_R} ${S_R} 0 0 1 ${S_CX - S_R} ${-S_R}`;

/** The whole word as one path, for a drawing in a single colour. */
export const WORD = [...P, ...H, ...I, SLASH_PATH, S].join(" ");
/** The letters without the slash, for a drawing that sets the slash in a colour of its own. */
export const LETTERS = [...P, ...H, ...I, S].join(" ");
/** The slash alone. */
export const SLASH = SLASH_PATH;
