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
  primaryBg: "var(--ant-color-primary-bg)",
  primaryBgHover: "var(--ant-color-primary-bg-hover)",
  primaryBorder: "var(--ant-color-primary-border)",
  primaryBorderHover: "var(--ant-color-primary-border-hover)",
  primaryHover: "var(--ant-color-primary-hover)",
  primary: "var(--ant-color-primary)",
  primaryActive: "var(--ant-color-primary-active)",
  primaryTextHover: "var(--ant-color-primary-text-hover)",
  primaryText: "var(--ant-color-primary-text)",
  primaryTextActive: "var(--ant-color-primary-text-active)",
  link: "var(--ant-color-link)",
  linkHover: "var(--ant-color-link-hover)",
  /* The text ladder, likewise the picker's text swatches. */
  textBase: "var(--ant-color-text-base)",
  text: "var(--ant-color-text)",
  textSecondary: "var(--ant-color-text-secondary)",
  textTertiary: "var(--ant-color-text-tertiary)",
  textQuaternary: "var(--ant-color-text-quaternary)",
  textHeading: "var(--ant-color-text-heading)",
  textLabel: "var(--ant-color-text-label)",
  textDescription: "var(--ant-color-text-description)",
  textPlaceholder: "var(--ant-color-text-placeholder)",
  textDisabled: "var(--ant-color-text-disabled)",
  textLightSolid: "var(--ant-color-text-light-solid)",
  bgContainer: "var(--ant-color-bg-container)",
  bgLayout: "var(--ant-color-bg-layout)",
  bgElevated: "var(--ant-color-bg-elevated)",
  bgSpotlight: "var(--ant-color-bg-spotlight)",
  fill: "var(--ant-color-fill)",
  fillSecondary: "var(--ant-color-fill-secondary)",
  fillTertiary: "var(--ant-color-fill-tertiary)",
  fillQuaternary: "var(--ant-color-fill-quaternary)",
  border: "var(--ant-color-border)",
  borderSecondary: "var(--ant-color-border-secondary)",
  linkActive: "var(--ant-color-link-active)",
  split: "var(--ant-color-split)",
  error: "var(--ant-color-error)",
  success: "var(--ant-color-success)",
  warning: "var(--ant-color-warning)",
  /*
   * The palette's ten custom colours, per mode, written by the Theme as tokens of its own
   * (`phiCustom1` ... `phiCustom10`, theme/phi-theme-palette.ts).
   */
  custom1: "var(--ant-phi-custom-1)",
  custom2: "var(--ant-phi-custom-2)",
  custom3: "var(--ant-phi-custom-3)",
  custom4: "var(--ant-phi-custom-4)",
  custom5: "var(--ant-phi-custom-5)",
  custom6: "var(--ant-phi-custom-6)",
  custom7: "var(--ant-phi-custom-7)",
  custom8: "var(--ant-phi-custom-8)",
  custom9: "var(--ant-phi-custom-9)",
  custom10: "var(--ant-phi-custom-10)",
} as const;

/**
 * Every distance a Phi surface states, inside a frame (`padding`) and between two things (`gap`), on the
 * one scale (`theme/phi-tokens.ts`, `PHI_PADDING`). Ant Design's `--ant-margin-*` family carries the
 * same values and stays Ant Design's own.
 */
export const PHI_SPACE = {
  xxs: "var(--ant-padding-xxs)",
  xs: "var(--ant-padding-xs)",
  sm: "var(--ant-padding-sm)",
  base: "var(--ant-padding)",
  md: "var(--ant-padding-md)",
  lg: "var(--ant-padding-lg)",
  xl: "var(--ant-padding-xl)",
  xxl: "var(--ant-padding-xxl)",
} as const;

export const PHI_RADIUS = {
  xxs: "var(--ant-border-radius-xs)",
  xs: "var(--ant-border-radius-sm)",
  sm: "var(--ant-border-radius)",
  base: "var(--ant-border-radius-lg)",
  md: "var(--ant-border-radius-lg)",
  lg: "var(--ant-border-radius-lg)",
  xl: "var(--ant-border-radius-outer)",
  xxl: "var(--ant-border-radius-outer)",
} as const;

export const PHI_CONTROL = {
  sm: "var(--ant-control-height-sm)",
  md: "var(--ant-control-height)",
  lg: "var(--ant-control-height-lg)",
} as const;

export const PHI_SHADOW = {
  primary: "var(--ant-box-shadow)",
  secondary: "var(--ant-box-shadow-secondary)",
  tertiary: "var(--ant-box-shadow-tertiary)",
} as const;

export const PHI_FONT_SIZE = {
  base: "var(--ant-font-size)",
  sm: "var(--ant-font-size-sm)",
  lg: "var(--ant-font-size-lg)",
  xl: "var(--ant-font-size-xl)",
  heading2: "var(--ant-font-size-heading-2)",
  heading4: "var(--ant-font-size-heading-4)",
  heading3: "var(--ant-font-size-heading-3)",
} as const;

export const PHI_LINE_HEIGHT = {
  base: 1.5,
  lg: 1.6,
  heading2: 1.25,
} as const;
