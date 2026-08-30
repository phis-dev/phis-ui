import type { GlobalToken } from "antd/es/theme/interface";

import type { PhiWidgetFontSizeKey } from "../../../types/site-theme";

export function resolvePhiWidgetFontSize(
  fontSize: PhiWidgetFontSizeKey | null | undefined,
  token: GlobalToken,
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
