import {
  PHI_CONTROL_HEIGHTS,
  PHI_LAYOUT,
  PHI_RADII,
  PHI_PADDING as PHI_PADDING_VALUES,
  PHI_MARGIN as PHI_MARGIN_VALUES,
} from "./phi-tokens";
import { PHI_CONTROL, PHI_MARGIN, PHI_SPACE } from "./antd-css-var-contract";

export type PhiThemeTokenOptions = {
  wireframe?: boolean;
  colorPrimary?: string;
  colorInfo?: string;
  colorSuccess?: string;
  colorWarning?: string;
  fontFamily?: string;
  overrides?: Record<string, unknown>;
};

export type PhiComponentTokenOptions = {
  layout?: {
    siderBg?: string;
    headerBg?: string;
    bodyBg?: string;
    triggerBg?: string;
    overrides?: Record<string, unknown>;
  };
  menu?: Record<string, unknown>;
  overrides?: Record<string, Record<string, unknown>>;
};

export type PhiThemeTokens = {
  paddingXXS: number;
  paddingXS: number;
  paddingSM: number;
  padding: number;
  paddingMD: number;
  paddingLG: number;
  paddingXL: number;
  paddingXXL: number;
  marginXXS: number;
  marginXS: number;
  marginSM: number;
  margin: number;
  marginMD: number;
  marginLG: number;
  marginXL: number;
  marginXXL: number;
  borderRadiusSM: number;
  borderRadius: number;
  borderRadiusLG: number;
  controlHeightSM: number;
  controlHeight: number;
  controlHeightLG: number;
  fontSize: number;
  fontFamily?: string;
  colorPrimary?: string;
  colorLink?: string;
  colorInfo?: string;
  colorSuccess?: string;
  colorWarning?: string;
  colorText?: string;
  colorTextHeading?: string;
  wireframe: boolean;
  [key: string]: unknown;
};
export type PhiComponentTokens = Record<string, Record<string, unknown>>;

export const PHI_DEFAULT_ANTD_FONT_SIZE = 12;

export function buildPhiThemeTokens(options: PhiThemeTokenOptions = {}): PhiThemeTokens {
  return {
    paddingXXS: PHI_PADDING_VALUES.xxs,
    paddingXS: PHI_PADDING_VALUES.xs,
    paddingSM: PHI_PADDING_VALUES.sm,
    padding: PHI_PADDING_VALUES.base,
    paddingMD: PHI_PADDING_VALUES.md,
    paddingLG: PHI_PADDING_VALUES.lg,
    paddingXL: PHI_PADDING_VALUES.xl,
    paddingXXL: PHI_PADDING_VALUES.xxl,
    marginXXS: PHI_MARGIN_VALUES.xxs,
    marginXS: PHI_MARGIN_VALUES.xs,
    marginSM: PHI_MARGIN_VALUES.sm,
    margin: PHI_MARGIN_VALUES.base,
    marginMD: PHI_MARGIN_VALUES.md,
    marginLG: PHI_MARGIN_VALUES.lg,
    marginXL: PHI_MARGIN_VALUES.xl,
    marginXXL: PHI_MARGIN_VALUES.xxl,
    borderRadiusSM: PHI_RADII.xs,
    borderRadius: PHI_RADII.sm,
    borderRadiusLG: PHI_RADII.base,
    controlHeightSM: PHI_CONTROL_HEIGHTS.sm,
    controlHeight: PHI_CONTROL_HEIGHTS.md,
    controlHeightLG: PHI_CONTROL_HEIGHTS.lg,
    fontSize: PHI_DEFAULT_ANTD_FONT_SIZE,
    fontFamily: options.fontFamily,
    colorPrimary: options.colorPrimary ?? "#E05A2A",
    colorLink: "#7088BA",
    colorText: "#223A61",
    colorTextHeading: "#5A73A4",
    colorInfo: options.colorInfo,
    colorSuccess: options.colorSuccess,
    colorWarning: options.colorWarning,
    wireframe: options.wireframe ?? true,
    ...options.overrides,
  };
}

export function buildPhiThemeStructuralTokens(options: PhiThemeTokenOptions = {}) {
  return Object.fromEntries(
    Object.entries(buildPhiThemeTokens(options)).filter(([key]) => !key.startsWith("color")),
  ) as Record<string, unknown>;
}

export function buildPhiComponentTokens(
  options: PhiComponentTokenOptions = {},
): PhiComponentTokens {
  return {
    Layout: {
      headerHeight: PHI_LAYOUT.headerHeight,
      siderBg: options.layout?.siderBg,
      headerBg: options.layout?.headerBg,
      bodyBg: options.layout?.bodyBg,
      triggerBg: options.layout?.triggerBg,
      ...options.layout?.overrides,
    },
    Menu: {
      itemHeight: PHI_CONTROL.md,
      itemPaddingInline: PHI_SPACE.base,
      itemMarginBlock: PHI_MARGIN.sm,
      itemMarginInline: PHI_MARGIN.sm,
      ...options.menu,
    },
    ...options.overrides,
  };
}
