import type { CSSProperties } from "react";

import {
  normalizePhiBackgroundWidgetConfig,
  resolvePhiBackgroundEffect,
  resolvePhiBackgroundWidgetStyle,
  type PhiBackgroundMotionMode,
  type PhiCmsBackgroundWidgetConfig,
} from "../widgets/config/background";
import type { PhiLayoutEffectId } from "../../types/layout-style";
import type { PhiSiteThemeRoot } from "../../types/site-theme";
import type { PhiThemeMode } from "../../theme/phi-theme-presets";

/**
 * The Shell Chrome Overlay (SHELL.md "Root Background and Shell Backdrop Layers").
 *
 * One site-owned ground shared by the Header, Sider and Footer Regions, published as custom properties
 * on the Root Layout element and consumed by those Regions in `styles/shell.css`. It is not a layer of
 * its own: the Shell grid tiles completely, so the Chrome Regions already are the frame around Content
 * and Hero, and letting them paint it keeps every sticky, collapsed and viewport-hidden case correct
 * without measuring anything.
 *
 * What the Regions cannot do for themselves is agree on where the picture starts. The overlay is drawn
 * with `background-attachment: fixed` so every Region shows its own window onto one viewport-sized
 * painting: a gradient runs from the Header into the Sider, and a Pattern keeps its grid across the
 * seam.
 */

/**
 * The Effects the overlay offers and honours, which is `glass` alone.
 *
 * The overlay is not a layer above the Chrome, it is the Chrome's own ground, so an Effect here acts on
 * the Region itself: `blur` and `dim` are `filter`, which would blur and darken the Header's own text,
 * and `tint` is an inset Shadow that would fight the Region's Shadow. `glass` is the one that acts on
 * what is behind the Region, which is exactly what a shared frame over a scrolling Page wants.
 */
export const PHI_SHELL_CHROME_OVERLAY_EFFECTS: readonly PhiLayoutEffectId[] = ["glass"];

/**
 * The Base kinds the overlay offers and honours.
 *
 * `image` is withheld. The overlay is a treatment laid over the Theme Root Background, not a second
 * ground: anchored to the viewport, a picture here would be cut against the picture behind the Content
 * along the frame edge, and it would hide the Root Background exactly where the frame is. Everything a
 * frame legitimately wants is a colour with alpha, a gradient, a Pattern, or `glass`, and each of those
 * lets the ground beneath keep reading. A Region that really wants a picture authors one locally, which
 * paints over the Theme anyway.
 */
export const PHI_SHELL_CHROME_OVERLAY_BASE_KINDS: readonly PhiCmsBackgroundWidgetConfig["base"]["kind"][] = [
  "none",
  "color",
  "gradient",
];

/**
 * Motion is not offered: the overlay is anchored to the viewport, so nothing it could travel against
 * ever moves. Same reason `fixed` is withheld from the Root Background.
 */
export const PHI_SHELL_CHROME_OVERLAY_MOTION_MODES: readonly PhiBackgroundMotionMode[] = ["static"];

export type PhiShellChromeOverlayVariables = Record<`--phi-shell-chrome-${string}`, string>;

/**
 * The Regions that paint the overlay.
 *
 * The Shell grid tiles completely, so once Content and Hero are taken out what is left is exactly the
 * frame. Content and Hero stay out because the overlay would paint over their content, and a Drawer is
 * an Overlay surface rather than Shell chrome.
 */
export const PHI_SHELL_CHROME_OVERLAY_REGION_KEYS: readonly string[] = [
  "header_top",
  "header_main",
  "header_bottom",
  "sider_left",
  "sider_right",
  "footer_top",
  "footer_main",
  "footer_bottom",
];

/**
 * Whether this Region paints the shared overlay, which it does only while it authored nothing itself.
 *
 * A Region that authored its own chrome paints over the Theme, and that is how an Area keeps a look of
 * its own. Authored means every carrier, not just one: the structured Background config, the plain
 * ground string a Region or the Shell record can set, and the Region's own Effect. Reading only the
 * first let the Builder's Sider take the Site's overlay on top of the container ground it paints on
 * purpose, which is what this exists to prevent.
 */
export function phiRegionUsesShellChromeOverlay({
  regionKey,
  backgroundConfig,
  effect,
  grounds,
}: {
  regionKey: string;
  backgroundConfig?: unknown;
  effect?: PhiLayoutEffectId | null;
  grounds: readonly (string | number | null | undefined)[];
}): boolean {
  return (
    PHI_SHELL_CHROME_OVERLAY_REGION_KEYS.includes(regionKey) &&
    backgroundConfig == null &&
    effect == null &&
    grounds.every((ground) => ground == null)
  );
}

function readPhiShellChromeOverlayConfig(
  root: PhiSiteThemeRoot | null | undefined,
  mode: PhiThemeMode,
): PhiCmsBackgroundWidgetConfig | null {
  return (mode === "dark" ? root?.chrome?.dark : root?.chrome?.light) ?? null;
}

/**
 * The overlay as this surface renders it, narrowed to what it offers.
 *
 * A stored value is never rewritten. A Base or an Effect the overlay does not offer simply resolves
 * away, which is what a record still carrying an image from before it was withheld renders here, and
 * what the Control shows for it.
 */
export function resolvePhiShellChromeOverlayConfig(
  config: unknown,
): PhiCmsBackgroundWidgetConfig {
  const normalized = normalizePhiBackgroundWidgetConfig(config);
  /*
   * The Base is narrowed first and the Effect resolved against the result, not against what is stored.
   * A record carrying an image and a glass reads here as a pane over the Root Background: the image is
   * not honoured, so there is no opaque material left for the glass to be meaningless against.
   */
  const narrowed: PhiCmsBackgroundWidgetConfig = {
    ...normalized,
    base: PHI_SHELL_CHROME_OVERLAY_BASE_KINDS.includes(normalized.base.kind)
      ? normalized.base
      : { kind: "none" },
    motion: null,
  };
  const effect = resolvePhiBackgroundEffect(narrowed);
  return {
    ...narrowed,
    effect: effect && PHI_SHELL_CHROME_OVERLAY_EFFECTS.includes(effect) ? effect : null,
  };
}

/**
 * What the overlay paints for one mode, or `null` where the mode has nothing configured.
 */
export function resolvePhiShellChromeOverlayStyle(
  root: PhiSiteThemeRoot | null | undefined,
  mode: PhiThemeMode,
): CSSProperties | null {
  const configured = readPhiShellChromeOverlayConfig(root, mode);
  return configured
    ? resolvePhiBackgroundWidgetStyle(resolvePhiShellChromeOverlayConfig(configured))
    : null;
}

function assignPhiShellChromeOverlayModeVariables(
  variables: PhiShellChromeOverlayVariables,
  mode: PhiThemeMode,
  style: CSSProperties | null,
) {
  if (!style) {
    return;
  }

  const entries: ReadonlyArray<readonly [string, unknown]> = [
    ["image", style.backgroundImage],
    ["size", style.backgroundSize],
    ["position", style.backgroundPosition],
    ["repeat", style.backgroundRepeat],
    ["color", style.backgroundColor],
    ["filter", style.backdropFilter],
  ];

  for (const [name, value] of entries) {
    if (typeof value === "string" && value.trim()) {
      variables[`--phi-shell-chrome-${name}-${mode}`] = value;
    }
  }
}

/**
 * The overlay as custom properties for both modes at once.
 *
 * Both modes are published rather than the active one, so the switch stays where every other Region
 * value switches it: a CSS rule keyed on `data-phi-theme-mode`. A mode with no overlay publishes
 * nothing and falls through to the Region's own ground.
 */
export function resolvePhiShellChromeOverlayVariables(
  root: PhiSiteThemeRoot | null | undefined,
): PhiShellChromeOverlayVariables {
  const variables: PhiShellChromeOverlayVariables = {};
  assignPhiShellChromeOverlayModeVariables(variables, "light", resolvePhiShellChromeOverlayStyle(root, "light"));
  assignPhiShellChromeOverlayModeVariables(variables, "dark", resolvePhiShellChromeOverlayStyle(root, "dark"));
  return variables;
}

/**
 * One Header band, as the pane's sticky offset needs to see it.
 */
export type PhiShellChromePaneBand = {
  sticky?: boolean;
  offsetTop?: string | number | null;
  height?: string | number | null;
} | null | undefined;

function readPhiShellChromePanePixels(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = /^\s*(-?\d+(?:\.\d+)?)px\s*$/.exec(value);
  return match ? Number(match[1]) : null;
}

/**
 * Where the Header pane sticks, which is the one thing about it the grid cannot answer.
 *
 * Every other case the pane handles falls out of the grid: an absent band collapses its track, a
 * hidden one does the same, a collapsed Sider narrows its column. Sticking does not, because a grid
 * area has no opinion about scrolling.
 *
 * The pane stays one element even where the bands above the first sticky one scroll away, and it does
 * that by sticking at a negative offset instead of splitting in two. A pane over a 55px band that does
 * not stick, above bands that stick at 0, sticks at -55px: it travels up until exactly the part that
 * scrolled away has left the viewport, and what remains standing is the sticky extent. Splitting it
 * would put a seam back at rest, which is what the pane exists to remove.
 *
 * Answers `null` where the offset cannot be known -- no band sticks at all, or a band above the first
 * sticky one has no pixel height to travel by. A pane that does not stick is wrong only while
 * scrolling; a pane that sticks at a guessed offset is wrong the whole time.
 */
export function resolvePhiShellChromePaneStickyTop(
  bands: readonly PhiShellChromePaneBand[],
): string | null {
  const firstSticky = bands.findIndex((band) => band?.sticky === true);
  if (firstSticky < 0) {
    return null;
  }

  let travel = 0;
  for (const band of bands.slice(0, firstSticky)) {
    if (band == null) {
      continue;
    }
    const height = readPhiShellChromePanePixels(band.height);
    if (height == null) {
      return null;
    }
    travel += height;
  }

  const offsetTop = readPhiShellChromePanePixels(bands[firstSticky]?.offsetTop) ?? 0;
  return `${offsetTop - travel}px`;
}
