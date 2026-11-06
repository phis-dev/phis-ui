/**
 * The Theme's gradients: three named slots, like the ten custom colours, that a control can take its
 * ground from instead of from one colour.
 *
 * A gradient belongs to a mode for the reason a mode seed does: the ground that reads as a brand on a
 * light page -- a deep burgundy run -- is a hole in a dark one, where the same brand reads as gold. So a
 * palette states each slot per mode (`modes[mode].gradients`), and a slot it leaves out is derived from
 * the mode's own colours, which is what lets every Theme offer all three without anybody drawing them.
 *
 * They reach the page as Ant Design tokens -- `phiGradient1` and its `phiGradient1Text` -- and Ant Design
 * writes every token as a custom property under the Theme's class (`--ant-phi-gradient-1`). That is the
 * whole transport: the root writes both modes, a Surface tone writes its own mode on its box, and the
 * Theme workspace's preview writes the draft's, so a control that reads the property is in the right mode
 * wherever it stands without asking which one that is.
 */

export const PHI_THEME_GRADIENT_KEYS = ["gradient1", "gradient2", "gradient3"] as const;
export type PhiThemeGradientKey = (typeof PHI_THEME_GRADIENT_KEYS)[number];

export type PhiThemeGradientDirection = "to right" | "to left" | "to bottom" | "to top" | `${number}deg`;

/** The same shape a Background's gradient Base has, so the one editor draws and reads both. */
export type PhiThemeGradientStop = { color: string; percent: number };

export type PhiThemeGradient = {
  direction: PhiThemeGradientDirection;
  stops: PhiThemeGradientStop[];
  /**
   * Which of the Theme's two text colours stands on it (`PhiThemeGradientInks`); absent, whichever reads
   * better where it reads worst. No colour of its own: words on a run read like the Theme's other words,
   * and follow when the Theme's text colours change.
   */
  text?: PhiThemeGradientTextTone;
};

export const PHI_THEME_GRADIENT_TEXT_TONES = ["light", "dark"] as const;
export type PhiThemeGradientTextTone = (typeof PHI_THEME_GRADIENT_TEXT_TONES)[number];

/**
 * The Theme's two text colours for words on a run, in one mode: `light` is the text it sets on a solid
 * coloured ground (`colorTextLightSolid`), `dark` the darker of its text and its ground -- its text in
 * light mode, its ground in dark mode, where the text is the light one.
 */
export type PhiThemeGradientInks = Record<PhiThemeGradientTextTone, string>;

/**
 * A slot as a palette states it: a whole run, or only which text colour stands on the run the slot
 * derives -- so choosing the words does not freeze the palette's colours into the slot.
 */
export type PhiThemeGradientSlot = PhiThemeGradient | { text: PhiThemeGradientTextTone };

export type PhiThemeGradientPalette = Partial<Record<PhiThemeGradientKey, PhiThemeGradientSlot>>;

function isPhiThemeGradientKey(value: unknown): value is PhiThemeGradientKey {
  return typeof value === "string" && (PHI_THEME_GRADIENT_KEYS as readonly string[]).includes(value);
}

/** A slot as a value a control or a widget config may store; anything else reads as no gradient. */
export function readPhiThemeGradientKey(value: unknown): PhiThemeGradientKey | undefined {
  return isPhiThemeGradientKey(value) ? value : undefined;
}

function isGradientDirection(value: unknown): value is PhiThemeGradientDirection {
  return typeof value === "string"
    && (["to right", "to left", "to bottom", "to top"].includes(value) || /^-?\d+(\.\d+)?deg$/.test(value));
}

/** The text tone a stored slot states, with or without a run of its own. */
export function readPhiThemeGradientTextTone(value: unknown): PhiThemeGradientTextTone | undefined {
  const text = value && typeof value === "object" ? (value as { text?: unknown }).text : undefined;
  return PHI_THEME_GRADIENT_TEXT_TONES.find((tone) => tone === text);
}

/** A stored gradient, read strictly: two stops at least, each a colour and a place on the run. */
export function readPhiThemeGradient(value: unknown): PhiThemeGradient | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!isGradientDirection(raw.direction) || !Array.isArray(raw.stops)) return null;
  const stops = raw.stops.flatMap((stop): PhiThemeGradientStop[] => {
    if (!stop || typeof stop !== "object") return [];
    const { color, percent } = stop as Record<string, unknown>;
    return typeof color === "string" && color.trim() && typeof percent === "number" && Number.isFinite(percent)
      ? [{ color: color.trim(), percent: Math.min(100, Math.max(0, percent)) }]
      : [];
  });
  if (stops.length < 2) return null;
  const text = PHI_THEME_GRADIENT_TEXT_TONES.find((tone) => tone === raw.text);
  return { direction: raw.direction, stops, ...(text ? { text } : {}) };
}

function serializePhiThemeGradientCss(gradient: PhiThemeGradient): string {
  return `linear-gradient(${gradient.direction}, ${gradient.stops.map((stop) => `${stop.color} ${stop.percent}%`).join(", ")})`;
}

/*
 * The custom properties, named the way Ant Design names a token's (`token2CSSVar`): `phiGradient1Text`
 * becomes `--ant-phi-gradient-1-text`. Stated once so CSS and controls never spell them differently.
 */
const PHI_THEME_GRADIENT_TOKEN_NAMES: Record<PhiThemeGradientKey, { paint: string; text: string }> = {
  gradient1: { paint: "phiGradient1", text: "phiGradient1Text" },
  gradient2: { paint: "phiGradient2", text: "phiGradient2Text" },
  gradient3: { paint: "phiGradient3", text: "phiGradient3Text" },
};

export const PHI_THEME_GRADIENT_CSS_VARS: Record<PhiThemeGradientKey, { paint: string; text: string }> = {
  gradient1: { paint: "--ant-phi-gradient-1", text: "--ant-phi-gradient-1-text" },
  gradient2: { paint: "--ant-phi-gradient-2", text: "--ant-phi-gradient-2-text" },
  gradient3: { paint: "--ant-phi-gradient-3", text: "--ant-phi-gradient-3-text" },
};

/*
 * The primary Buttons' run when the Theme gives them one, with the filter each pressed state lays over
 * it; `none` in all three otherwise, so the rules in `styles/gradients.css` change nothing on a Theme
 * that never asked for a gradient. The states are filters rather than a second picture: Ant Design
 * transitions every property of a Button, and a picture swapped on hover crossfades badly -- it
 * flickered as the pointer left -- where a filter eases.
 */
const PHI_PRIMARY_BUTTON_GRADIENT_TOKENS = {
  paint: "phiPrimaryButtonGradient",
  hover: "phiPrimaryButtonGradientHover",
  active: "phiPrimaryButtonGradientActive",
  text: "phiPrimaryButtonGradientText",
} as const;

/** A run a little lighter under the pointer, a little darker while it is pressed. */
export const PHI_GRADIENT_HOVER_FILTER = "brightness(1.18) saturate(1.15)";
const PHI_GRADIENT_ACTIVE_FILTER = "brightness(0.88)";

type Rgb = { r: number; g: number; b: number };
type Rgba = Rgb & { a: number };

/* Enough of CSS colour for what a palette states: hex in its four lengths and `rgb()`/`rgba()`. */
function parseColor(value: string): Rgba | null {
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

/** A translucent text colour as it lands on its ground: the near-black `0.88` text is not black. */
function composite(top: Rgba, ground: Rgb): Rgb {
  const mix = (front: number, back: number) => front * top.a + back * (1 - top.a);
  return { r: mix(top.r, ground.r), g: mix(top.g, ground.g), b: mix(top.b, ground.b) };
}

/* What `filter: brightness(n)` does to a colour: each channel scaled and clipped. */
function brighten(colour: Rgb, factor: number): Rgb {
  const scale = (channel: number) => Math.min(255, channel * factor);
  return { r: scale(colour.r), g: scale(colour.g), b: scale(colour.b) };
}

function relativeLuminance({ r, g, b }: Rgb) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastOf(first: Rgb, second: Rgb) {
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

/** How much lighter a gradient Control is under the pointer (`styles/gradients.css`). */
const PHI_GRADIENT_HOVER_BRIGHTNESS = 1.18;

const PHI_GRADIENT_LIGHT_TEXT = "#ffffff";
const PHI_GRADIENT_DARK_TEXT = "rgba(0, 0, 0, 0.88)";

/** The two text colours of one mode's resolved tokens (`PhiThemeGradientInks`). */
export function resolvePhiThemeGradientInks(token: Record<string, unknown>): PhiThemeGradientInks {
  const light = tokenColor(token, "colorTextLightSolid", PHI_GRADIENT_LIGHT_TEXT);
  const candidates = [tokenColor(token, "colorText", PHI_GRADIENT_DARK_TEXT), tokenColor(token, "colorBgBase", PHI_GRADIENT_DARK_TEXT)];
  const darkness = (colour: string) => {
    const parsed = parseColor(colour);
    return parsed ? relativeLuminance(composite(parsed, { r: 255, g: 255, b: 255 })) : Number.POSITIVE_INFINITY;
  };
  const dark = candidates.reduce((darkest, next) => (darkness(next) < darkness(darkest) ? next : darkest));
  return { light, dark: Number.isFinite(darkness(dark)) ? dark : PHI_GRADIENT_DARK_TEXT };
}

/** Where a text colour reads worst on a gradient: the ratio, the stop, and whether under the pointer. */
export type PhiThemeGradientContrast = {
  ratio: number;
  stopIndex: number;
  color: string;
  hover: boolean;
};

/**
 * Where a text colour reads worst on the run. Text crosses the whole run, so the stop it reads worst on
 * decides -- at rest and under the pointer, where the hover filter lightens run and words alike. A
 * translucent text colour is laid on each stop first. `null` where a colour is not one this can read
 * (`hsl()`, a variable): the Theme workspace then says nothing rather than something wrong.
 */
export function resolvePhiThemeGradientContrast(gradient: PhiThemeGradient, text: string): PhiThemeGradientContrast | null {
  const words = parseColor(text);
  if (!words) return null;
  let worst: PhiThemeGradientContrast | null = null;
  for (const [stopIndex, stop] of gradient.stops.entries()) {
    const ground = parseColor(stop.color);
    if (!ground) return null;
    for (const hover of [false, true]) {
      const factor = hover ? PHI_GRADIENT_HOVER_BRIGHTNESS : 1;
      const lit = brighten(ground, factor);
      const ratio = contrastOf(lit, brighten(composite(words, ground), factor));
      if (worst == null || ratio < worst.ratio - 1e-9) {
        worst = { ratio, stopIndex, color: stop.color, hover };
      }
    }
  }
  return worst;
}

/** The weakest contrast a text colour has anywhere on the run, at rest or under the pointer. */
export function resolvePhiThemeGradientWorstContrast(gradient: PhiThemeGradient, text: string): number | null {
  return resolvePhiThemeGradientContrast(gradient, text)?.ratio ?? null;
}

/** Which of the two text colours reads better where the run reads worst for it. */
export function resolvePhiThemeGradientAutoTextTone(
  gradient: PhiThemeGradient,
  inks: PhiThemeGradientInks,
): PhiThemeGradientTextTone {
  const light = resolvePhiThemeGradientWorstContrast(gradient, inks.light) ?? 0;
  const dark = resolvePhiThemeGradientWorstContrast(gradient, inks.dark) ?? 0;
  return light >= dark ? "light" : "dark";
}

function tokenColor(token: Record<string, unknown>, key: string, fallback: string) {
  const value = token[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/**
 * The three slots a mode offers when its palette states none: runs within the mode's own colours, so they
 * belong to whichever brand the Theme carries. The primary's hover into its pressed shade first -- the
 * brand --, the warning colour second because a palette's accent sits there, then the info colour into
 * the primary, a run for the chrome. Three cover what a site asks of a run; a fourth was the third
 * turned round.
 */
function buildPhiThemeDefaultGradients(token: Record<string, unknown>): Record<PhiThemeGradientKey, PhiThemeGradient> {
  const primary = tokenColor(token, "colorPrimary", "#1677ff");
  const primaryHover = tokenColor(token, "colorPrimaryHover", primary);
  const primaryActive = tokenColor(token, "colorPrimaryActive", primary);
  const warning = tokenColor(token, "colorWarning", "#faad14");
  const warningHover = tokenColor(token, "colorWarningHover", warning);
  const warningActive = tokenColor(token, "colorWarningActive", warning);
  const info = tokenColor(token, "colorInfo", primary);
  return {
    gradient1: { direction: "135deg", stops: [{ color: primaryHover, percent: 0 }, { color: primaryActive, percent: 100 }] },
    gradient2: { direction: "135deg", stops: [{ color: warningHover, percent: 0 }, { color: warningActive, percent: 100 }] },
    gradient3: { direction: "135deg", stops: [{ color: info, percent: 0 }, { color: primary, percent: 100 }] },
  };
}

/** Every slot of one mode: what the palette states, the derived run where it states nothing. */
export function resolvePhiThemeGradients(
  stated: PhiThemeGradientPalette | null | undefined,
  token: Record<string, unknown>,
): Record<PhiThemeGradientKey, PhiThemeGradient> {
  const defaults = buildPhiThemeDefaultGradients(token);
  return Object.fromEntries(PHI_THEME_GRADIENT_KEYS.map((key) => {
    const own = readPhiThemeGradient(stated?.[key]);
    const text = readPhiThemeGradientTextTone(stated?.[key]);
    return [key, own ?? (text ? { ...defaults[key], text } : defaults[key])];
  })) as Record<PhiThemeGradientKey, PhiThemeGradient>;
}

/** The text colour on a run: the tone it states, else the one that reads better. */
export function resolvePhiThemeGradientText(gradient: PhiThemeGradient, inks: PhiThemeGradientInks): string {
  return inks[gradient.text ?? resolvePhiThemeGradientAutoTextTone(gradient, inks)];
}

/**
 * The tokens one mode's gradients become, and the primary Buttons' run when the Theme asks for one.
 *
 * Laid over the resolved alias tokens rather than fed to the algorithm: they are not seeds, nothing
 * derives from them, and they are read back only as the custom properties Ant Design writes for them.
 */
export function buildPhiThemeGradientTokens({
  gradients,
  token,
  primaryButtonGradient,
}: {
  gradients: PhiThemeGradientPalette | null | undefined;
  token: Record<string, unknown>;
  primaryButtonGradient?: PhiThemeGradientKey | null;
}): Record<string, string> {
  const resolved = resolvePhiThemeGradients(gradients, token);
  const inks = resolvePhiThemeGradientInks(token);
  const tokens: Record<string, string> = {};
  for (const key of PHI_THEME_GRADIENT_KEYS) {
    const names = PHI_THEME_GRADIENT_TOKEN_NAMES[key];
    tokens[names.paint] = serializePhiThemeGradientCss(resolved[key]);
    tokens[names.text] = resolvePhiThemeGradientText(resolved[key], inks);
  }
  if (primaryButtonGradient && isPhiThemeGradientKey(primaryButtonGradient)) {
    const paint = tokens[PHI_THEME_GRADIENT_TOKEN_NAMES[primaryButtonGradient].paint]!;
    tokens[PHI_PRIMARY_BUTTON_GRADIENT_TOKENS.paint] = paint;
    tokens[PHI_PRIMARY_BUTTON_GRADIENT_TOKENS.hover] = PHI_GRADIENT_HOVER_FILTER;
    tokens[PHI_PRIMARY_BUTTON_GRADIENT_TOKENS.active] = PHI_GRADIENT_ACTIVE_FILTER;
    // Only stated with a run under it: absent, the rule falls back to Ant Design's own primary text.
    tokens[PHI_PRIMARY_BUTTON_GRADIENT_TOKENS.text] = tokens[PHI_THEME_GRADIENT_TOKEN_NAMES[primaryButtonGradient].text]!;
  } else {
    tokens[PHI_PRIMARY_BUTTON_GRADIENT_TOKENS.paint] = "none";
    tokens[PHI_PRIMARY_BUTTON_GRADIENT_TOKENS.hover] = "none";
    tokens[PHI_PRIMARY_BUTTON_GRADIENT_TOKENS.active] = "none";
  }
  return tokens;
}
