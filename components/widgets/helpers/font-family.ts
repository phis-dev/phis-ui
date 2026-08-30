import type { GlobalToken } from "antd/es/theme/interface";

import type { PhiRootThemeFonts } from "../../root/phi-root-theme-resolver";
import type { PhiWidgetFontFamilyKey } from "../../../types/site-theme";

export function resolvePhiWidgetFontFamily(
  fontFamily: PhiWidgetFontFamilyKey | null | undefined,
  fonts: PhiRootThemeFonts,
  token: GlobalToken,
): string | undefined {
  switch (fontFamily) {
    case "system":
      return token.fontFamily;
    case "body":
      return fonts.body ?? token.fontFamily;
    case "mono":
      return fonts.mono ?? token.fontFamilyCode;
    case "serif":
      return fonts.serif ?? token.fontFamily;
    case "accent":
      return fonts.accent ?? fonts.body ?? token.fontFamily;
    case "display":
      return fonts.display ?? fonts.serif ?? token.fontFamily;
    default:
      return undefined;
  }
}
