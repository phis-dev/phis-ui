/**
 * The Theme's gradients: four named slots, like the ten custom colours, that a control can take its
 * ground from instead of from one colour.
 *
 * A gradient belongs to a mode for the reason a mode seed does: the ground that reads as a brand on a
 * light page -- a deep burgundy run -- is a hole in a dark one, where the same brand reads as gold. So a
 * palette states each slot per mode (`modes[mode].gradients`), and a slot it leaves out is derived from
 * the mode's own colours, which is what lets every Theme offer all four without anybody drawing them.
 *
 * They reach the page as Ant Design tokens -- `phiGradient1` and its `phiGradient1Text` -- and Ant Design
 * writes every token as a custom property under the Theme's class (`--ant-phi-gradient-1`). That is the
 * whole transport: the root writes both modes, a Surface tone writes its own mode on its box, and the
 * Theme workspace's preview writes the draft's, so a control that reads the property is in the right mode
 * wherever it stands without asking which one that is.
 */

export const PHI_THEME_GRADIENT_KEYS = ["gradient1", "gradient2", "gradient3", "gradient4"] as const;
export type PhiThemeGradientKey = (typeof PHI_THEME_GRADIENT_KEYS)[number];

export type PhiThemeGradientDirection = "to right" | "to left" | "to bottom" | "to top" | `${number}deg`;

/** The same shape a Background's gradient Base has, so the one editor draws and reads both. */
export type PhiThemeGradientStop = { color: string; percent: number };

export type PhiThemeGradient = {
  direction: PhiThemeGradientDirection;
  stops: PhiThemeGradientStop[];
  /** The text that stands on it; absent, whichever of white and near-black reads better on its middle. */
  text?: string;
};

export type PhiThemeGradientPalette = Partial<Record<PhiThemeGradientKey, PhiThemeGradient>>;

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
  const text = typeof raw.text === "string" && raw.text.trim() ? raw.text.trim() : undefined;
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
  gradient4: { paint: "phiGradient4", text: "phiGradient4Text" },
};

export const PHI_THEME_GRADIENT_CSS_VARS: Record<PhiThemeGradientKey, { paint: string; text: string }> = {
  gradient1: { paint: "--ant-phi-gradient-1", text: "--ant-phi-gradient-1-text" },
  gradient2: { paint: "--ant-phi-gradient-2", text: "--ant-phi-gradient-2-text" },
  gradient3: { paint: "--ant-phi-gradient-3", text: "--ant-phi-gradient-3-text" },
  gradient4: { paint: "--ant-phi-gradient-4", text: "--ant-phi-gradient-4-text" },
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
const PHI_GRADIENT_HOVER_FILTER = "brightness(1.18) saturate(1.15)";
const PHI_GRADIENT_ACTIVE_FILTER = "brightness(0.88)";

type Rgb = { r: number; g: number; b: number };

/* Enough of CSS colour for what a palette states: hex in its three lengths and `rgb()`/`rgba()`. */
function parseColor(value: string): Rgb | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(text)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex.slice(0, 3)].map((digit) => digit + digit).join("") : hex.slice(0, 6);
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text);
  return rgb ? { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) } : null;
}

function relativeLuminance({ r, g, b }: Rgb) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function phiContrastRatio(a: string, b: string): number | null {
  const first = parseColor(a);
  const second = parseColor(b);
  if (!first || !second) return null;
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const PHI_GRADIENT_LIGHT_TEXT = "#ffffff";
const PHI_GRADIENT_DARK_TEXT = "rgba(0, 0, 0, 0.88)";

/**
 * The weakest contrast a text colour has anywhere on the run. Text crosses the whole run, so the stop it
 * reads worst on is the one that decides; the Theme workspace warns below 4.5:1.
 */
export function resolvePhiThemeGradientWorstContrast(gradient: PhiThemeGradient, text: string): number | null {
  const ratios = gradient.stops.map((stop) => phiContrastRatio(stop.color, text));
  return ratios.some((ratio) => ratio == null) ? null : Math.min(...(ratios as number[]));
}

function pickReadableText(stops: readonly PhiThemeGradientStop[]) {
  const gradient: PhiThemeGradient = { direction: "90deg", stops: [...stops] };
  const light = resolvePhiThemeGradientWorstContrast(gradient, PHI_GRADIENT_LIGHT_TEXT) ?? 0;
  const dark = resolvePhiThemeGradientWorstContrast(gradient, "#000000") ?? 0;
  return light >= dark ? PHI_GRADIENT_LIGHT_TEXT : PHI_GRADIENT_DARK_TEXT;
}

function tokenColor(token: Record<string, unknown>, key: string, fallback: string) {
  const value = token[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/**
 * The four slots a mode offers when its palette states none: runs within the mode's own colours, so they
 * belong to whichever brand the Theme carries. The primary's hover into its pressed shade first, the
 * warning colour second because a palette's accent sits there, then the info colour into the primary and
 * the primary into the info colour.
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
    gradient4: { direction: "135deg", stops: [{ color: primary, percent: 0 }, { color: info, percent: 100 }] },
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
    return [key, own ?? defaults[key]];
  })) as Record<PhiThemeGradientKey, PhiThemeGradient>;
}

export function resolvePhiThemeGradientText(gradient: PhiThemeGradient): string {
  return gradient.text ?? pickReadableText(gradient.stops);
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
  const tokens: Record<string, string> = {};
  for (const key of PHI_THEME_GRADIENT_KEYS) {
    const names = PHI_THEME_GRADIENT_TOKEN_NAMES[key];
    tokens[names.paint] = serializePhiThemeGradientCss(resolved[key]);
    tokens[names.text] = resolvePhiThemeGradientText(resolved[key]);
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
