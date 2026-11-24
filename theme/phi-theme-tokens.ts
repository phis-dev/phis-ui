import { PHI_SPACE } from "./antd-css-var-contract";
import type { GlobalToken } from "antd/es/theme/interface";

import type { PhiThemePalette } from "./phi-theme-presets";
import { PHI_CONTAINER_BREAKPOINT_REGION } from "./phi-container-breakpoints";

/**
 * The token vocabulary of this house, stated once.
 *
 * The names are Ant Design's spelling and they stay that way: `colorPrimary`, `paddingSM` and
 * `controlHeight` are this house's words too, a Site has them stored under those names, and the
 * Theme workspace writes them under those names. Nothing here renames anything.
 *
 * What this file adds is the boundary. Until it existed the Client read from `GlobalToken`, an open
 * surface of some four hundred names, so the ones actually in use were an accident of what somebody
 * typed rather than something the package promised. Below is the promise: every name a render may
 * read, and no other. A Widget that wants one that is not here adds it here first, which is the
 * moment somebody decides whether the house has that word.
 *
 * The value types come from Ant Design, and deliberately only in the line that derives them. That is
 * the bridge in one place and it is also the drift check: a name Ant Design drops or renames stops
 * compiling here, in the list, rather than in the forty files that read it. When Ant Design is one day
 * swapped out, this derivation becomes an explicit record and nothing above it moves -- the names are
 * the contract, the thing that computes their values is not.
 *
 * Who may still speak Ant Design directly is a separate question, and `scripts/validate-control-boundaries.mjs`
 * answers it: the alias resolver, the root adapter, the two font helpers and this file.
 */
export const PHI_THEME_TOKEN_KEYS = [
  // Colour: surfaces, lines and fills.
  "colorBgContainer",
  "colorBgElevated",
  "colorBgMask",
  "colorBgSpotlight",
  "colorBorder",
  "colorBorderSecondary",
  "colorSplit",
  "colorFillAlter",
  "colorFill",
  "colorBgLayout",
  "colorFillQuaternary",
  "colorFillSecondary",
  "colorFillTertiary",

  // Colour: text, from the base the mode seeds to the shades derived from it.
  "colorText",
  "colorTextBase",
  "colorTextHeading",
  "colorTextSecondary",
  "colorTextTertiary",
  "colorTextQuaternary",
  "colorTextDescription",
  "colorTextDisabled",
  "colorTextLabel",
  "colorTextPlaceholder",
  "colorTextLightSolid",

  // Colour: the brand, in the ten shades a palette derives from the one seed.
  "colorPrimary",
  "colorPrimaryBg",
  "colorPrimaryBgHover",
  "colorPrimaryBorder",
  "colorPrimaryBorderHover",
  "colorPrimaryHover",
  "colorPrimaryActive",
  "colorPrimaryText",
  "colorPrimaryTextHover",
  "colorPrimaryTextActive",

  // Colour: status and links.
  "colorInfo",
  "colorInfoBg",
  "colorInfoBgHover",
  "colorInfoBorder",
  "colorInfoBorderHover",
  "colorInfoText",
  "colorInfoTextHover",
  "colorSuccess",
  "colorSuccessBg",
  "colorSuccessBgHover",
  "colorSuccessBorder",
  "colorSuccessBorderHover",
  "colorSuccessText",
  "colorWarning",
  "colorWarningBg",
  "colorWarningBgHover",
  "colorWarningBorder",
  "colorWarningBorderHover",
  "colorWarningText",
  "colorError",
  "colorErrorBg",
  // The three a danger text and link read, now that PhiTypographyControl draws them itself.
  "colorErrorText",
  "colorErrorTextHover",
  "colorErrorTextActive",
  "colorLink",
  "colorLinkHover",
  "colorLinkActive",

  // Space.
  "padding",
  "paddingXXS",
  "paddingXS",
  "paddingSM",
  "paddingMD",
  "paddingLG",
  "paddingXL",
  "margin",
  "marginXXS",
  "marginXS",
  "marginSM",
  "marginMD",
  "marginLG",
  "marginXL",
  "marginXXL",
  "sizeXS",
  "sizeSM",
  "sizeMD",
  "sizeLG",

  // Shape: corners, lines and depth.
  "borderRadius",
  "borderRadiusXS",
  "borderRadiusSM",
  "borderRadiusLG",
  "borderRadiusOuter",
  "lineWidth",
  // The bold rule: an Anchor's rail and the like. Content set beside such a rail lines up with it.
  "lineWidthBold",
  "lineType",
  "boxShadow",
  "boxShadowSecondary",
  "boxShadowTertiary",

  // The height a Control stands at.
  "controlHeight",
  "controlHeightXS",
  "controlHeightSM",
  "controlHeightLG",

  // Type.
  "fontFamily",
  "fontFamilyCode",
  "fontSize",
  "fontSizeSM",
  "fontSizeLG",
  "fontSizeXL",
  // All five heading steps: PhiTypographyControl draws titles itself and reads each.
  "fontSizeHeading1",
  "fontSizeHeading2",
  "fontSizeHeading3",
  "fontSizeHeading4",
  "fontSizeHeading5",
  "fontWeightStrong",
  "lineHeight",
  "lineHeightSM",
  "lineHeightLG",
  "lineHeightHeading1",
  "lineHeightHeading2",
  "lineHeightHeading3",
  "lineHeightHeading4",
  "lineHeightHeading5",

  // Motion.
  "motionDurationMid",
  "motionDurationSlow",
  "motionEaseInOut",
  "motionEaseOut",
] as const;

/**
 * The names this house adds to Ant Design's set.
 *
 * `buildPhiThemeTokens` hands Ant Design the whole structural scale, `paddingXXL` included, and the
 * cssVar pass emits a variable for every token it is given -- so `--phi-padding-xxl` is on the page
 * even though `AliasToken` has no such field. The name is therefore real, usable from CSS, and
 * invisible to the type, which is exactly why it has to be stated somewhere.
 *
 * It is a separate list and not one more entry above, because `PhiThemeTokens` is cut from Ant
 * Design's type and a name Ant Design does not know cannot be cut from it. A Client Component that
 * needs one of these reads it as a CSS variable, the way a Server Component does.
 *
 * `pageMax` is how wide a Page may get (theme/phi-tokens.ts, `PHI_LAYOUT.pageMax`); a Page reads it
 * as `PHI_PAGE.max`. `layoutGap` is the gap of a Layout that states none (`PHI_LAYOUT.layoutGap`), read
 * as `PHI_LAYOUT_GAP`.
 *
 * The `gradient*` names are the Theme's gradient slots and the primary Buttons' run
 * (theme/phi-theme-gradients.ts): tokens of this package's own, laid over the resolved ones so Ant
 * Design writes them per mode and per Surface tone like every other. The `custom*` names are the
 * palette's custom colours, laid over the same way (theme/phi-theme-palette.ts). `linkExternalMark` is
 * the `display` of the mark behind a link that leaves the Site (theme/phi-link-mark.ts). The
 * `surfaceShadow*` names are what a Surface's `soft` and `strong` steps draw (theme/phi-surface-shadow.ts).
 * `inverseGround` is what a Surface toned `inverse` stands on (theme/phi-theme-inverse-ground.ts).
 */
export const PHI_THEME_OWN_TOKEN_KEYS = [
  "paddingXXL",
  "pageMax",
  "pagePaddingTopPhone",
  "pagePaddingRightPhone",
  "pagePaddingBottomPhone",
  "pagePaddingLeftPhone",
  "pagePaddingTopTablet",
  "pagePaddingRightTablet",
  "pagePaddingBottomTablet",
  "pagePaddingLeftTablet",
  "pagePaddingTopDesktop",
  "pagePaddingRightDesktop",
  "pagePaddingBottomDesktop",
  "pagePaddingLeftDesktop",
  "signedInPagePaddingTopPhone",
  "signedInPagePaddingRightPhone",
  "signedInPagePaddingBottomPhone",
  "signedInPagePaddingLeftPhone",
  "signedInPagePaddingTopTablet",
  "signedInPagePaddingRightTablet",
  "signedInPagePaddingBottomTablet",
  "signedInPagePaddingLeftTablet",
  "signedInPagePaddingTopDesktop",
  "signedInPagePaddingRightDesktop",
  "signedInPagePaddingBottomDesktop",
  "signedInPagePaddingLeftDesktop",
  "layoutGap",
  "gradient1",
  "gradient1Text",
  "gradient2",
  "gradient2Text",
  "gradient3",
  "gradient3Text",
  "primaryButtonGradient",
  "primaryButtonGradientHover",
  "primaryButtonGradientActive",
  "primaryButtonGradientText",
  "linkExternalMark",
  "surfaceShadowSoft",
  "surfaceShadowStrong",
  "inverseGround",
  "custom1",
  "custom2",
  "custom3",
  "custom4",
  "custom5",
  "custom6",
  "custom7",
  "custom8",
  "custom9",
  "custom10",
] as const;

/** The Page inset's names, per band and side (`PHI_LAYOUT.pagePadding`, `PHI_PAGE.padding`). */
export const PHI_THEME_PAGE_PADDING_BANDS = ["Phone", "Tablet", "Desktop"] as const;
export const PHI_THEME_PAGE_PADDING_SIDES = ["Top", "Right", "Bottom", "Left"] as const;
/** Whose inset a token is: Public's (`pagePadding…`) or the signed-in Areas' (`signedInPagePadding…`). */
export const PHI_THEME_PAGE_PADDING_SCOPES = ["pagePadding", "signedInPagePadding"] as const;
type PhiThemePagePaddingTokenKey =
  `${(typeof PHI_THEME_PAGE_PADDING_SCOPES)[number]}${(typeof PHI_THEME_PAGE_PADDING_SIDES)[number]}${(typeof PHI_THEME_PAGE_PADDING_BANDS)[number]}`;
const PHI_THEME_PAGE_PADDING_TOKEN_KEYS: readonly PhiThemePagePaddingTokenKey[] = PHI_THEME_PAGE_PADDING_SCOPES.flatMap((scope) =>
  PHI_THEME_PAGE_PADDING_BANDS.flatMap((band) => PHI_THEME_PAGE_PADDING_SIDES.map((side) => `${scope}${side}${band}` as const)));

export type PhiThemeTokenKey = (typeof PHI_THEME_TOKEN_KEYS)[number];

/**
 * The resolved Theme, in the names above and their Ant Design value types.
 *
 * This is what `usePhiConfig().token` hands a Client Component and what the Server's own token record
 * is cut from, so both sides read one list rather than two that drift.
 */
export type PhiThemeTokens = Pick<GlobalToken, PhiThemeTokenKey>;

/**
 * The colours a palette seeds, shared by both modes.
 *
 * Ant Design derives the rest from these six. Everything else a palette wants to say outright is an
 * override, which is held to the vocabulary above -- the difference matters, because a seed is an
 * input to the derivation and an override is a result of it stated by hand.
 */
const PHI_THEME_PALETTE_SEED_KEYS = [
  "colorPrimary",
  "colorInfo",
  "colorSuccess",
  "colorWarning",
  "colorError",
  "colorLink",
] as const;

/**
 * What `style.token` may hold beyond the vocabulary: Ant Design's own seed flags.
 *
 * `wireframe` is not a token with a value on the page, it is the switch that decides how Ant Design
 * derives the rest. The Theme workspace writes it, so a Site has it stored, so it is said here.
 */
const PHI_THEME_STYLE_SEED_KEYS = [
  "wireframe",
] as const;

function readPhiThemeVocabularyViolations(
  record: Record<string, unknown> | null | undefined,
  allowed: ReadonlySet<string>,
  source: string,
  slot: string,
) {
  return Object.keys(record ?? {})
    .filter((name) => !allowed.has(name))
    .map((name) => `${source}: ${slot} states "${name}", which is not a Theme token name this package has.`);
}

const PHI_THEME_TOKEN_NAMES: ReadonlySet<string> = new Set<string>([
  ...PHI_THEME_TOKEN_KEYS,
  ...PHI_THEME_OWN_TOKEN_KEYS,
]);
const PHI_THEME_PALETTE_SEED_NAMES: ReadonlySet<string> = new Set<string>(PHI_THEME_PALETTE_SEED_KEYS);
const PHI_THEME_STYLE_TOKEN_NAMES: ReadonlySet<string> = new Set<string>([
  ...PHI_THEME_TOKEN_KEYS,
  ...PHI_THEME_OWN_TOKEN_KEYS,
  ...PHI_THEME_STYLE_SEED_KEYS,
]);

/**
 * A stored Theme, held to the vocabulary before anything is derived from it.
 *
 * Read strictly, the way a stored Widget config is: a name this package does not have is a mistake
 * somebody made, and deriving a Theme past it hides the mistake -- the page comes up, nothing reports
 * anything, and one thing an author set is simply not there. The throw names the key and where it
 * stood, because a Theme is folded from several places and "colorPrimry" says nothing about which.
 *
 * Mode seeds are checked against `PHI_THEME_PALETTE_MODE_SEED_KEYS`, which is the list that already
 * decides what belongs to a mode rather than to the palette as a whole.
 */
export function assertPhiThemeVocabulary({
  palette,
  styleToken,
  modeSeedKeys,
  source,
}: {
  palette?: PhiThemePalette | null;
  styleToken?: Record<string, unknown> | null;
  modeSeedKeys: readonly string[];
  /** What is being read -- a Site record, a Module's block -- so the message can say whose key it is. */
  source: string;
}) {
  const modeSeedNames = new Set<string>(modeSeedKeys);
  const violations = [
    ...readPhiThemeVocabularyViolations(palette?.seed, PHI_THEME_PALETTE_SEED_NAMES, source, "the palette seed"),
    ...readPhiThemeVocabularyViolations(styleToken, PHI_THEME_STYLE_TOKEN_NAMES, source, "the style token"),
  ];

  for (const [mode, modeConfig] of Object.entries(palette?.modes ?? {})) {
    violations.push(
      ...readPhiThemeVocabularyViolations(modeConfig?.seed, modeSeedNames, source, `the ${mode} seed`),
      ...readPhiThemeVocabularyViolations(modeConfig?.overrides, PHI_THEME_TOKEN_NAMES, source, `the ${mode} override`),
    );
  }

  violations.push(...readPhiThemePageMaxViolations(styleToken, source));
  violations.push(...readPhiThemePagePaddingViolations(styleToken, source));
  violations.push(...readPhiThemeLayoutGapViolations(styleToken, source));

  if (violations.length > 0) {
    throw new Error(violations.join(" "));
  }
}

/**
 * A Page's maximum is a number of pixels and at least the width from which a Region counts as wide.
 *
 * Narrower, no Page could ever be wide: a Grid of four columns or anything else that answers to the
 * Region threshold would never draw its wide form, and nothing would say why.
 */
/**
 * A Page's inset is a step of the spacing scale on each side and band, or none: the Page column reads it
 * as a length, and a word it cannot resolve would leave the side at no padding with nothing to say why.
 */
function readPhiThemePagePaddingViolations(styleToken: Record<string, unknown> | null | undefined, source: string) {
  const steps = new Set<unknown>([...Object.values(PHI_SPACE), 0, "0"]);
  return PHI_THEME_PAGE_PADDING_TOKEN_KEYS.flatMap((key) => {
    const value = styleToken?.[key];
    if (value == null || steps.has(value)) return [];
    return [`${source}: the style token states ${key} as ${JSON.stringify(value)}, which is not a step of the spacing scale.`];
  });
}

/** A Layout's gap is a step of the spacing scale, or none, for the same reason as a Page's inset. */
function readPhiThemeLayoutGapViolations(styleToken: Record<string, unknown> | null | undefined, source: string) {
  const value = styleToken?.layoutGap;
  if (value == null || new Set<unknown>([...Object.values(PHI_SPACE), 0, "0"]).has(value)) return [];
  return [`${source}: the style token states layoutGap as ${JSON.stringify(value)}, which is not a step of the spacing scale.`];
}

function readPhiThemePageMaxViolations(styleToken: Record<string, unknown> | null | undefined, source: string) {
  const value = styleToken?.pageMax;
  if (value == null) return [];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return [`${source}: the style token states pageMax as ${JSON.stringify(value)}, which is not a number of pixels.`];
  }
  if (value < PHI_CONTAINER_BREAKPOINT_REGION) {
    return [`${source}: the style token states pageMax ${value}, narrower than ${PHI_CONTAINER_BREAKPOINT_REGION}, from which a Region counts as wide.`];
  }
  return [];
}
