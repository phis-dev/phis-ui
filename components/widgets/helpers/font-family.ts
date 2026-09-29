import type { PhiControlOption } from "../../controls/phi-control-options";
import type { PhiThemeTokens } from "../../../theme/phi-theme-tokens";
import type { PhiRootThemeFonts } from "../../root/phi-root-theme-resolver";
import type { PhiWidgetFontFamilyKey } from "../../../types/site-theme";

/**
 * The font slots a Widget can name, as they are offered -- and as they are read back.
 *
 * One list, because a Widget states its family in three places that have to agree: the field it declares,
 * the picker in the authoring toolbar, and the parser that decides whether a stored value is one of the
 * slots at all. Written out three times they were three chances to drift, and the one that drifts
 * silently is the parser: a slot it has not heard of reads as unset.
 */
export const PHI_WIDGET_FONT_FAMILY_OPTIONS: readonly PhiControlOption<PhiWidgetFontFamilyKey>[] = [
  { value: "inherit", label: "Inherit" },
  { value: "system", label: "System" },
  { value: "body", label: "Body" },
  { value: "mono", label: "Mono" },
  { value: "serif", label: "Serif" },
  { value: "accent", label: "Accent" },
  { value: "display", label: "Display" },
];

export function readPhiWidgetFontFamily(value: unknown): PhiWidgetFontFamilyKey | undefined {
  return typeof value === "string"
    ? PHI_WIDGET_FONT_FAMILY_OPTIONS.find((option) => option.value === value)?.value
    : undefined;
}

export function resolvePhiWidgetFontFamily(
  fontFamily: PhiWidgetFontFamilyKey | null | undefined,
  fonts: PhiRootThemeFonts,
  token: PhiThemeTokens,
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
      // Display without a family is the body font, as it is for headings (theme/phi-theme-typography.ts).
      return fonts.display ?? fonts.body ?? token.fontFamily;
    default:
      return undefined;
  }
}
