/**
 * The Logo a phis installation ships with: an empty frame with "your logo" in it, one per mode.
 *
 * A Set carries a Logo and the core Set is what a Site that has stated nothing runs on, so whatever
 * stands here is the mark every fresh installation wears until somebody replaces it. That is exactly
 * why it is not a mark. A real one belongs to whoever owns it, and putting ours there would both brand
 * somebody else's Site and read as a decision rather than as a blank waiting to be filled. A dashed
 * frame reads as a blank.
 *
 * Three to one, the shape a wordmark tends to have, so that replacing it moves nothing around it. Drawn
 * in the mode's own text base at less than full strength: legible, and quiet enough that nobody mistakes
 * it for a design.
 *
 * Inline, and URL-encoded rather than base64 so the drawing stays readable next to what uses it. A Set
 * lives in code; the save that takes a Logo into a Site's record uploads it into the Media library, so
 * no Site depends on this file for a Logo it kept.
 */

/** The mode's text base, as `PHI_CORE_THEME_PRESET_PLUGINS` states it. */
const LIGHT_INK = "#223A61";
const DARK_INK = "#DCE7F8";

function placeholderLogo(ink: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 160" width="480" height="160">`
    + `<rect x="6" y="6" width="468" height="148" rx="13" fill="none"`
    + ` stroke="${ink}" stroke-opacity=".45" stroke-width="6" stroke-dasharray="21 13"/>`
    + `<text x="240" y="80" fill="${ink}" fill-opacity=".7" font-size="52" font-weight="600"`
    + ` font-family="system-ui, sans-serif" text-anchor="middle" dominant-baseline="central">your logo</text>`
    + `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PHI_THEME_PLACEHOLDER_LOGO_LIGHT = placeholderLogo(LIGHT_INK);

export const PHI_THEME_PLACEHOLDER_LOGO_DARK = placeholderLogo(DARK_INK);
