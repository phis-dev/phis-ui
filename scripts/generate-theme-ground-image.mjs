import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/*
 * Generates theme/phi-theme-ground-image.ts: the two inline SVGs the core "Phis" ground paints.
 *
 * The wordmark "phi/s" is a monoline stroke drawing, not type. Letters are drawn upright on a baseline
 * at y=0 (ascender 400, x-height 400/phi, descender 120) and sheared as one group by 14 degrees, so the
 * stem of the i and the slash lean at exactly the same angle. Round caps make every terminal a pill.
 * Two lines tie the word together: the ascender line, shared by the h, the dot of the i and the top of
 * the slash, and the descender line, shared by the foot of the p and the bottom of the slash.
 * The outline is the wide stroke with the same path, drawn narrower, masked out of it -- one path
 * element on each side, so overlaps inside a letter union cleanly instead of showing inner edges.
 * The mask lives in letter space and the transform sits on the group, never on the masked path: a
 * transform on the referencing element would be applied to the mask content a second time.
 *
 * Run with `node scripts/generate-theme-ground-image.mjs` after changing the drawing or the colours.
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
const WORD = [
  // p: stem from the x-height line to the descender line, bowl as a stadium closed at the x-height line
  `M ${P_LEFT} ${X} V ${DESCENDER}`,
  `M ${P_LEFT} ${X} H ${P_LEFT + LETTER_WIDTH - P_R} A ${P_R} ${P_R} 0 0 1 ${P_LEFT + LETTER_WIDTH - P_R} 0 H ${P_LEFT}`,
  // h: stem from the ascender line, shoulder a half circle topping out at the x-height line
  `M ${H_LEFT} ${-ASCENDER} V 0`,
  `M ${H_LEFT} ${X + 90} A 90 90 0 0 1 ${H_LEFT + LETTER_WIDTH} ${X + 90} V 0`,
  // i: body stem and a pill for the dot, the dot's top on the ascender line
  `M ${I_LEFT} ${X} V 0`, `M ${I_LEFT} ${-ASCENDER} V ${-ASCENDER + 8}`,
  // slash: from the ascender line to the descender line
  `M ${SLASH_LEFT} ${-ASCENDER} V ${DESCENDER}`,
  // s: two circles, tangent to the x-height line at the top and the baseline below; three quarters of
  // the upper one from its right side over the top down to the waist, then three quarters of the lower
  // one from the waist over the right side and the bottom to its left side
  `M ${S_CX + S_R} ${X + S_R} A ${S_R} ${S_R} 0 0 0 ${S_CX - S_R} ${X + S_R} A ${S_R} ${S_R} 0 0 0 ${S_CX} ${X + 2 * S_R} `
    + `A ${S_R} ${S_R} 0 0 1 ${S_CX + S_R} ${-S_R} A ${S_R} ${S_R} 0 0 1 ${S_CX - S_R} ${-S_R}`,
].join(" ");
const OUTER_STROKE = 64;
const INNER_STROKE = 58;

const MASK = `<mask id="m" maskUnits="userSpaceOnUse" x="-200" y="-600" width="1800" height="1000"><rect x="-200" y="-600" width="1800" height="1000" fill="#fff"/><path d="${WORD}" fill="none" stroke="#000" stroke-width="${INNER_STROKE}" stroke-linecap="round" stroke-linejoin="round"/></mask>`;

function wordmark(x, y, scale, ink) {
  return `<g transform="translate(${x} ${y}) scale(${scale}) skewX(-14)"><path d="${WORD}" fill="none" stroke="${ink}" stroke-opacity=".09" stroke-width="${OUTER_STROKE}" stroke-linecap="round" stroke-linejoin="round" mask="url(#m)"/></g>`;
}

/** Soft colour fields: brand orange top left, text-base blue top right, success green at the bottom. */
function ground(bg, orange, blue, green, ink) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="a" cx="18%" cy="22%" r="55%"><stop offset="0" stop-color="${orange}" stop-opacity=".9"/><stop offset="1" stop-color="${orange}" stop-opacity="0"/></radialGradient><radialGradient id="b" cx="84%" cy="30%" r="50%"><stop offset="0" stop-color="${blue}" stop-opacity=".8"/><stop offset="1" stop-color="${blue}" stop-opacity="0"/></radialGradient><radialGradient id="c" cx="55%" cy="95%" r="60%"><stop offset="0" stop-color="${green}" stop-opacity=".75"/><stop offset="1" stop-color="${green}" stop-opacity="0"/></radialGradient>${MASK}</defs><rect width="1600" height="1000" fill="${bg}"/><rect width="1600" height="1000" fill="url(#a)"/><rect width="1600" height="1000" fill="url(#b)"/><rect width="1600" height="1000" fill="url(#c)"/>${wordmark(620, 470, 0.9, ink)}${wordmark(70, 890, 0.5, ink)}</svg>`;
}

const light = ground("#FFF8F4", "#F7CDB9", "#CFDAF2", "#D2E9DC", "#223A61");
const dark = ground("#050914", "#5A2A18", "#182A55", "#12352A", "#DCE7F8");
const toDataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../theme/phi-theme-ground-image.ts");
writeFileSync(target, `/**
 * The pictures the core "Phis" ground paints, one per mode.
 *
 * Vector, inline, about two kilobytes each: soft colour fields in the Phis palette -- the orange of
 * the brand, the blue of the text base, the green of the success colour -- with the wordmark "phi/s"
 * drawn over them as an outline. The wordmark is not type: it is a monoline stroke drawing with round
 * caps, so every terminal is a pill, sheared as one group so the stem of the i and the slash lean at
 * the same angle, and outlined by masking the same path drawn narrower out of the wide one. No font is
 * involved, which is what keeps it identical on every machine.
 *
 * Inline is what lets the floor every Site falls back to carry a picture at all: a data URL is code,
 * not a file, so it can never be missing the way an Asset or a static file could.
 *
 * Generated by scripts/generate-theme-ground-image.mjs; edit the drawing there, not here.
 */
export const PHI_THEME_PHIS_GROUND_IMAGE_LIGHT = ${JSON.stringify(toDataUrl(light))};

export const PHI_THEME_PHIS_GROUND_IMAGE_DARK = ${JSON.stringify(toDataUrl(dark))};
`);
console.log(`wrote ${path.relative(process.cwd(), target)} (${light.length} + ${dark.length} bytes of SVG)`);
