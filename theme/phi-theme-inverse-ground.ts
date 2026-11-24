import { isPhiRecord } from "../helpers/is-record";
import type { PhiSiteThemeInverseGround } from "../types/site-theme";
import type { PhiThemeMode } from "./phi-theme-presets";

/**
 * The Inverse Ground (THEME.md "Ground"): what a Surface toned `inverse` stands on.
 *
 * An inverse box is drawn in the other mode than the page's (LAYOUTING.md "Surface tone"). It used to
 * stand on that mode's Chrome Overlay where it took the Theme's ground, and the Chrome is the frame's: a
 * glass frame -- phis.dev's is 55 % white or ink -- gave the inverted words the page's own ground beneath
 * a thin pane, light text on a light page. So the Theme states, per mode, one opaque colour an inverse box
 * stands on, and a mode that states none stands on that mode's container ground (`colorBgContainer`), the
 * ground an inverse box without a Background of its own always painted.
 *
 * It rides as a token of this package's own (`inverseGround`), so Ant Design writes it as
 * `--phi-inverse-ground` per mode and per Surface tone like every other token: inside an inverse box the
 * tone's class carries the other mode's tokens, and the variable there is that mode's ground.
 */

/** What an inverse box paints as its ground, as the variable the stylesheet and every resolver read. */
export const PHI_INVERSE_GROUND = "var(--phi-inverse-ground)";

const PHI_THEME_INVERSE_GROUND_MODES = ["light", "dark"] as const satisfies readonly PhiThemeMode[];

const PHI_CSS_HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu;
const PHI_CSS_COLOR_FUNCTION = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(([^()]*)\)$/iu;
const PHI_CSS_ALPHA = /^(\d*\.?\d+)(%?)$/u;

function isPhiOpaqueAlpha(alpha: string) {
  const match = PHI_CSS_ALPHA.exec(alpha.trim());
  if (!match) return false;
  const value = Number.parseFloat(match[1]!);
  return match[2] === "%" ? value >= 100 : value >= 1;
}

/**
 * Whether a CSS colour is a stated, opaque value: a hex colour or a colour function with no alpha below
 * one. A name, a variable or anything the server cannot read as a colour is not: an unreadable value
 * would make the box's ground fall away in the browser, which is the very thing this ground exists to
 * prevent.
 */
export function isPhiOpaqueCssColor(value: string): boolean {
  const color = value.trim();
  if (PHI_CSS_HEX_COLOR.test(color)) {
    const digits = color.slice(1);
    if (digits.length === 4) return digits[3]!.toLowerCase() === "f";
    if (digits.length === 8) return digits.slice(6).toLowerCase() === "ff";
    return true;
  }
  const call = PHI_CSS_COLOR_FUNCTION.exec(color);
  if (!call) return false;
  const args = call[1]!;
  const slash = args.split("/");
  if (slash.length > 2) return false;
  if (slash.length === 2) return isPhiOpaqueAlpha(slash[1]!);
  const commas = args.split(",");
  if (commas.length === 4) return isPhiOpaqueAlpha(commas[3]!);
  return commas.length === 1 || commas.length === 3;
}

/**
 * The stored Inverse Ground, read strictly: absent is none stated; anything else must be a record of the
 * two modes, each absent or an opaque colour. A wrong shape is an error, not a ground quietly dropped.
 */
export function readPhiThemeInverseGround(value: unknown): PhiSiteThemeInverseGround | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isPhiRecord(value)) {
    throw new Error(`The Inverse Ground must state its colours per mode, got ${JSON.stringify(value)}.`);
  }
  const unknownKeys = Object.keys(value).filter(
    (key) => !(PHI_THEME_INVERSE_GROUND_MODES as readonly string[]).includes(key),
  );
  if (unknownKeys.length > 0) {
    throw new Error(`The Inverse Ground has unknown modes: ${unknownKeys.join(", ")}.`);
  }
  const ground: PhiSiteThemeInverseGround = {};
  for (const mode of PHI_THEME_INVERSE_GROUND_MODES) {
    const color = value[mode];
    if (color === undefined || color === null) continue;
    if (typeof color !== "string" || !isPhiOpaqueCssColor(color)) {
      throw new Error(`The Inverse Ground's ${mode} colour must be an opaque CSS colour, got ${JSON.stringify(color)}.`);
    }
    ground[mode] = color.trim();
  }
  return ground;
}

/**
 * The ground an inverse box in `mode` stands on: the Theme's stated colour, else the mode's own container
 * ground. `token` is the mode's resolved Ant Design tokens, which every Theme has.
 */
export function resolvePhiThemeInverseGround(
  inverse: PhiSiteThemeInverseGround | null | undefined,
  mode: PhiThemeMode,
  token: Record<string, unknown>,
): string {
  const stated = readPhiThemeInverseGround(inverse)?.[mode];
  if (stated) return stated;
  const container = token.colorBgContainer;
  if (typeof container !== "string" || !container.trim()) {
    throw new Error(`The resolved ${mode} Theme has no colorBgContainer to stand an inverse box on.`);
  }
  return container;
}

/** The token one mode writes (`--phi-inverse-ground`). */
export function buildPhiThemeInverseGroundTokens(
  inverse: PhiSiteThemeInverseGround | null | undefined,
  mode: PhiThemeMode,
  token: Record<string, unknown>,
) {
  return { inverseGround: resolvePhiThemeInverseGround(inverse, mode, token) };
}
