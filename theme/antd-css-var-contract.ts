/**
 * Serializable references for Server Component styles and persisted default
 * config. These point at Ant Design's SSR-extracted CSS variables; they do not
 * define a second Phi token source. Client Components should use
 * `usePhiConfig().token` when they need the resolved value in JavaScript.
 */
export const PHI_COLOR = {
  /*
   * The primary colour's ladder, as the Theme derives it per mode -- the same ten the colour picker offers
   * as the Theme's primary swatches, so a colour picked there is stored as its role and follows the Theme.
   */
  primaryBg: "var(--phi-color-primary-bg)",
  primaryBgHover: "var(--phi-color-primary-bg-hover)",
  primaryBorder: "var(--phi-color-primary-border)",
  primaryBorderHover: "var(--phi-color-primary-border-hover)",
  primaryHover: "var(--phi-color-primary-hover)",
  primary: "var(--phi-color-primary)",
  primaryActive: "var(--phi-color-primary-active)",
  primaryTextHover: "var(--phi-color-primary-text-hover)",
  primaryText: "var(--phi-color-primary-text)",
  primaryTextActive: "var(--phi-color-primary-text-active)",
  link: "var(--phi-color-link)",
  linkHover: "var(--phi-color-link-hover)",
  /* The text ladder, likewise the picker's text swatches. */
  textBase: "var(--phi-color-text-base)",
  text: "var(--phi-color-text)",
  textSecondary: "var(--phi-color-text-secondary)",
  textTertiary: "var(--phi-color-text-tertiary)",
  textQuaternary: "var(--phi-color-text-quaternary)",
  textHeading: "var(--phi-color-text-heading)",
  textLabel: "var(--phi-color-text-label)",
  textDescription: "var(--phi-color-text-description)",
  textPlaceholder: "var(--phi-color-text-placeholder)",
  textDisabled: "var(--phi-color-text-disabled)",
  textLightSolid: "var(--phi-color-text-light-solid)",
  bgContainer: "var(--phi-color-bg-container)",
  bgLayout: "var(--phi-color-bg-layout)",
  bgElevated: "var(--phi-color-bg-elevated)",
  bgSpotlight: "var(--phi-color-bg-spotlight)",
  fill: "var(--phi-color-fill)",
  fillSecondary: "var(--phi-color-fill-secondary)",
  fillTertiary: "var(--phi-color-fill-tertiary)",
  fillQuaternary: "var(--phi-color-fill-quaternary)",
  border: "var(--phi-color-border)",
  borderSecondary: "var(--phi-color-border-secondary)",
  linkActive: "var(--phi-color-link-active)",
  split: "var(--phi-color-split)",
  error: "var(--phi-color-error)",
  success: "var(--phi-color-success)",
  warning: "var(--phi-color-warning)",
  /*
   * The palette's ten custom colours, per mode, written by the Theme as tokens of its own
   * (`custom1` ... `custom10`, theme/phi-theme-palette.ts).
   */
  custom1: "var(--phi-custom-1)",
  custom2: "var(--phi-custom-2)",
  custom3: "var(--phi-custom-3)",
  custom4: "var(--phi-custom-4)",
  custom5: "var(--phi-custom-5)",
  custom6: "var(--phi-custom-6)",
  custom7: "var(--phi-custom-7)",
  custom8: "var(--phi-custom-8)",
  custom9: "var(--phi-custom-9)",
  custom10: "var(--phi-custom-10)",
} as const;

/**
 * Every distance a Phi surface states, inside a frame (`padding`) and between two things (`gap`), on the
 * one scale (`theme/phi-tokens.ts`, `PHI_PADDING`). Ant Design's `--phi-margin-*` family carries the
 * same values and stays Ant Design's own.
 */
export const PHI_SPACE = {
  xxs: "var(--phi-padding-xxs)",
  xs: "var(--phi-padding-xs)",
  sm: "var(--phi-padding-sm)",
  base: "var(--phi-padding)",
  md: "var(--phi-padding-md)",
  lg: "var(--phi-padding-lg)",
  xl: "var(--phi-padding-xl)",
  xxl: "var(--phi-padding-xxl)",
} as const;

/**
 * How wide a Page may get: the Theme's `pageMax` (theme/phi-tokens.ts, `PHI_LAYOUT.pageMax`).
 *
 * A Page states this reference and not the number, so the Theme's answer reaches every Page, an edited
 * copy included -- a number written into a preset tree stays what it was the day the copy was made.
 */
export const PHI_PAGE = {
  max: "var(--phi-page-max)",
  /*
   * How far a Page's content stands in, per side: the Theme's `pagePadding<Side><Band>` for the band the
   * screen is in, chosen by styles/shell.css ("Page inset"). Outside a Shell, where no band is chosen,
   * the desktop answer.
   */
  padding: {
    top: "var(--phi-page-inset-top, var(--phi-page-padding-top-desktop))",
    right: "var(--phi-page-inset-right, var(--phi-page-padding-right-desktop))",
    bottom: "var(--phi-page-inset-bottom, var(--phi-page-padding-bottom-desktop))",
    left: "var(--phi-page-inset-left, var(--phi-page-padding-left-desktop))",
  },
  /*
   * The same in the signed-in Areas -- App and the staff Areas: the Theme's `signedInPagePadding<Side><Band>`
   * for the band the screen is in.
   */
  signedInPadding: {
    top: "var(--phi-signed-in-page-inset-top, var(--phi-signed-in-page-padding-top-desktop))",
    right: "var(--phi-signed-in-page-inset-right, var(--phi-signed-in-page-padding-right-desktop))",
    bottom: "var(--phi-signed-in-page-inset-bottom, var(--phi-signed-in-page-padding-bottom-desktop))",
    left: "var(--phi-signed-in-page-inset-left, var(--phi-signed-in-page-padding-left-desktop))",
  },
} as const;

/**
 * The gap of a Layout that states none: the Theme's `layoutGap` (theme/phi-tokens.ts, `PHI_LAYOUT.layoutGap`,
 * `sm` unless the Theme says otherwise). A Layout's defaults read it, so a Layout without a gap of its own
 * follows the Theme; a preset leaves the gap out rather than stating this.
 */
export const PHI_LAYOUT_GAP = "var(--phi-layout-gap)";

export const PHI_RADIUS = {
  xxs: "var(--phi-border-radius-xs)",
  xs: "var(--phi-border-radius-sm)",
  sm: "var(--phi-border-radius)",
  base: "var(--phi-border-radius-lg)",
  md: "var(--phi-border-radius-lg)",
  lg: "var(--phi-border-radius-lg)",
  xl: "var(--phi-border-radius-outer)",
  xxl: "var(--phi-border-radius-outer)",
} as const;

export const PHI_CONTROL = {
  sm: "var(--phi-control-height-sm)",
  md: "var(--phi-control-height)",
  lg: "var(--phi-control-height-lg)",
} as const;

export const PHI_FONT_SIZE = {
  base: "var(--phi-font-size)",
  sm: "var(--phi-font-size-sm)",
  lg: "var(--phi-font-size-lg)",
  xl: "var(--phi-font-size-xl)",
  heading2: "var(--phi-font-size-heading-2)",
  heading4: "var(--phi-font-size-heading-4)",
  heading3: "var(--phi-font-size-heading-3)",
} as const;

export const PHI_LINE_HEIGHT = {
  base: 1.5,
  lg: 1.6,
  heading2: 1.25,
} as const;
