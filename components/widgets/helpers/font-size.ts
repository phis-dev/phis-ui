import type { PhiThemeTokens } from "../../../theme/phi-theme-tokens";
import type { PhiWidgetFontSizeKey } from "../../../types/site-theme";

export function resolvePhiWidgetFontSize(
  fontSize: PhiWidgetFontSizeKey | null | undefined,
  token: PhiThemeTokens,
  defaultFontSize: PhiWidgetFontSizeKey = "inherit",
): number | undefined {
  switch (fontSize ?? defaultFontSize) {
    case "xs":
      return token.fontSizeSM;
    case "sm":
      return token.fontSizeSM;
    case "base":
      return token.fontSize;
    case "lg":
      return token.fontSizeLG;
    case "xl":
      return token.fontSizeXL;
    default:
      return undefined;
  }
}
