/**
 * Which font slot a page's headings take.
 *
 * The Theme names five families -- body, serif, mono, accent, display -- and until a Theme says which of
 * them headings wear, a display family did nothing anywhere a widget did not ask for it by name. This is
 * that one decision, stored beside the families rather than among them: a slot holds a family, and this
 * holds a choice between slots.
 *
 * It reaches `h1` to `h3` and nothing smaller. Those are what a page's headings are in this package --
 * the page title, the titles of content widgets, the headings Markdown and HTML bring -- while the
 * interfaces of the Builder and the Admin title their panels at level four and five and their dialogs
 * with no heading element at all. Smaller headings stay on the body font on purpose as well: a display
 * face set at the size of a label is the first thing to become unreadable.
 */

export const PHI_THEME_HEADING_FONTS = ["body", "serif", "display"] as const;
export type PhiThemeHeadingFont = (typeof PHI_THEME_HEADING_FONTS)[number];

export type PhiThemeTypography = {
  /** Absent means body, which is what a heading renders in when nothing is said. */
  headings?: PhiThemeHeadingFont | null;
};

/** The custom property a heading reads its family from; unset, a heading inherits like any text. */
export const PHI_THEME_HEADING_FONT_VARIABLE = "--phi-font-heading";

export function readPhiThemeHeadingFont(typography: PhiThemeTypography | null | undefined): PhiThemeHeadingFont {
  const value = typography?.headings;
  return value === "serif" || value === "display" ? value : "body";
}

/**
 * The family headings are set in, or nothing when they follow the body font.
 *
 * Nothing rather than the body stack: an unset variable leaves the heading inheriting, which is exactly
 * the body font, and a Theme that never chose keeps rendering precisely as it did. A slot that names no
 * family falls back to the body font as well -- display to body, not to serif, so "display without a
 * family" means the same here as in the widgets' font helper.
 */
export function resolvePhiThemeHeadingFontFamily(
  typography: PhiThemeTypography | null | undefined,
  stacks: { serif?: string | null; display?: string | null },
): string | undefined {
  switch (readPhiThemeHeadingFont(typography)) {
    case "serif":
      return stacks.serif?.trim() || undefined;
    case "display":
      return stacks.display?.trim() || undefined;
    default:
      return undefined;
  }
}
