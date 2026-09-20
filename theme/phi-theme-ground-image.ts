/**
 * The picture the core "Phis" ground paints, one per mode.
 *
 * Soft colour fields in the Phis palette -- the orange of the brand, the blue of the text base, the
 * green of the success colour -- and nothing drawn over them. It used to carry a wordmark as an
 * outline. A wordmark is a mark, and a mark belongs to the Site that owns it rather than to the floor
 * every installation falls back to; whoever installs phis gets the colours, not somebody else's name.
 *
 * Inline is the condition: the floor may depend on nothing that can go missing, and a data URL is code
 * rather than a file, so it can never be absent the way an Asset or a static file could. URL-encoded
 * rather than base64 so the drawing stays readable here.
 *
 * `preserveAspectRatio="xMidYMid slice"` is what lets three fixed fields cover a window of any shape:
 * the picture is cropped to the viewport rather than squeezed into it.
 */

/** A colour field: a radial fade from `color` at `opacity` to nothing, placed by percentage. */
function field(id: string, cx: string, cy: string, r: string, color: string, opacity: string) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">`
    + `<stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/>`
    + `<stop offset="1" stop-color="${color}" stop-opacity="0"/>`
    + `</radialGradient>`;
}

const SHEET = `width="1600" height="1000"`;

function ground(bg: string, orange: string, blue: string, green: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">`
    + `<defs>`
    + field("a", "18%", "22%", "55%", orange, ".9")
    + field("b", "84%", "30%", "50%", blue, ".8")
    + field("c", "55%", "95%", "60%", green, ".75")
    + `</defs>`
    + `<rect ${SHEET} fill="${bg}"/>`
    + `<rect ${SHEET} fill="url(#a)"/>`
    + `<rect ${SHEET} fill="url(#b)"/>`
    + `<rect ${SHEET} fill="url(#c)"/>`
    + `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PHI_THEME_PHIS_GROUND_IMAGE_LIGHT = ground("#FFF8F4", "#F7CDB9", "#CFDAF2", "#D2E9DC");

export const PHI_THEME_PHIS_GROUND_IMAGE_DARK = ground("#050914", "#5A2A18", "#182A55", "#12352A");
