import type { GlobalToken } from "antd/es/theme/interface";

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
  "colorSuccess",
  "colorWarning",
  "colorError",
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
  "marginXXS",
  "marginXS",
  "marginSM",
  "sizeXS",
  "sizeSM",
  "sizeMD",
  "sizeLG",

  // Shape: corners, lines and depth.
  "borderRadius",
  "borderRadiusSM",
  "borderRadiusLG",
  "lineWidth",
  "lineType",
  "boxShadowSecondary",
  "boxShadowTertiary",

  // The height a Control stands at.
  "controlHeight",
  "controlHeightSM",
  "controlHeightLG",

  // Type.
  "fontFamily",
  "fontFamilyCode",
  "fontSize",
  "fontSizeSM",
  "fontSizeLG",
  "fontSizeXL",
  "fontSizeHeading2",
  "fontSizeHeading3",
  "fontWeightStrong",
  "lineHeight",
  "lineHeightLG",
  "lineHeightHeading2",

  // Motion.
  "motionDurationMid",
  "motionDurationSlow",
  "motionEaseInOut",
  "motionEaseOut",
] as const;

export type PhiThemeTokenKey = (typeof PHI_THEME_TOKEN_KEYS)[number];

/**
 * The resolved Theme, in the names above and their Ant Design value types.
 *
 * This is what `usePhiConfig().token` hands a Client Component and what the Server's own token record
 * is cut from, so both sides read one list rather than two that drift.
 */
export type PhiThemeTokens = Pick<GlobalToken, PhiThemeTokenKey>;
