import type { PhiControlOption } from "../../controls/phi-control-options";
import type { PhiThemeTokens } from "../../../theme/phi-theme-tokens";
import { PHI_FONT_SIZES } from "../../../theme/phi-tokens";
import type { PhiWidgetFontSizeKey } from "../../../types/site-theme";

/** The sizes a Widget can name, offered and read back from one list -- see the families' list for why. */
export const PHI_WIDGET_FONT_SIZE_OPTIONS: readonly PhiControlOption<PhiWidgetFontSizeKey>[] = [
  { value: "inherit", label: "Inherit" },
  { value: "xs", label: "XS" },
  { value: "sm", label: "SM" },
  { value: "base", label: "Base" },
  { value: "lg", label: "LG" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "XXL" },
];

export function readPhiWidgetFontSize(value: unknown): PhiWidgetFontSizeKey | undefined {
  return typeof value === "string"
    ? PHI_WIDGET_FONT_SIZE_OPTIONS.find((option) => option.value === value)?.value
    : undefined;
}

export function resolvePhiWidgetFontSize(
  fontSize: PhiWidgetFontSizeKey | null | undefined,
  token: PhiThemeTokens,
  defaultFontSize: PhiWidgetFontSizeKey = "inherit",
): number | undefined {
  switch (fontSize ?? defaultFontSize) {
    // `xs`, `xxl`: no Ant Design token, so the scale's own fixed size (`theme/phi-tokens.ts`).
    case "xs":
      return PHI_FONT_SIZES.xs;
    case "sm":
      return token.fontSizeSM;
    case "base":
      return token.fontSize;
    case "lg":
      return token.fontSizeLG;
    case "xl":
      return token.fontSizeXL;
    case "xxl":
      return PHI_FONT_SIZES.xxl;
    default:
      return undefined;
  }
}
