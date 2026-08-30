/**
 * Serializable references for Server Component styles and persisted default
 * config. These point at Ant Design's SSR-extracted CSS variables; they do not
 * define a second Phi token source. Client Components should use
 * `usePhiConfig().token` when they need the resolved value in JavaScript.
 */
export const PHI_COLOR = {
  primary: "var(--ant-color-primary)",
  primaryHover: "var(--ant-color-primary-hover)",
  primaryActive: "var(--ant-color-primary-active)",
  link: "var(--ant-color-link)",
  linkHover: "var(--ant-color-link-hover)",
  text: "var(--ant-color-text)",
  textSecondary: "var(--ant-color-text-secondary)",
  textTertiary: "var(--ant-color-text-tertiary)",
  textHeading: "var(--ant-color-text-heading)",
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
} as const;

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

export const PHI_MARGIN = {
  xxs: "var(--ant-margin-xxs)",
  xs: "var(--ant-margin-xs)",
  sm: "var(--ant-margin-sm)",
  base: "var(--ant-margin)",
  md: "var(--ant-margin-md)",
  lg: "var(--ant-margin-lg)",
  xl: "var(--ant-margin-xl)",
  xxl: "var(--ant-margin-xxl)",
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

export const PHI_MOTION = {
  durationMid: "var(--ant-motion-duration-mid)",
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
