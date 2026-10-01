/**
 * Where a Layout's outline comes from: nowhere, the Theme, or the Layout's own border fields.
 *
 * A file of its own because the drawing reads it on the client: every block sits in a slot frame whose
 * layout box resolves the source (`phi-layout-contract.ts`). Kept beside the Layout config parsers it
 * pulled all of them into every page's scripts -- the parsers, the defaults table, the background
 * reader -- for three small names.
 */
export const PHI_CMS_BORDER_SOURCES = ["none", "theme", "custom"] as const;

export type PhiCmsBorderSource = (typeof PHI_CMS_BORDER_SOURCES)[number];

export function readPhiCmsBorderSource(value: unknown): PhiCmsBorderSource | undefined {
  return typeof value === "string" && (PHI_CMS_BORDER_SOURCES as readonly string[]).includes(value)
    ? value as PhiCmsBorderSource
    : undefined;
}

/**
 * The source a stored Layout answers with when it never stated one.
 *
 * A configured border means the author drew a line, so that is `custom`; anything else is `none`. The
 * rule is stated once and read wherever a source is needed, so the Inspector and the drawing cannot
 * come to different conclusions about a Layout that predates the field.
 */
export function resolvePhiCmsBorderSource(
  source: PhiCmsBorderSource | undefined,
  border: unknown,
): PhiCmsBorderSource {
  if (source) {
    return source;
  }
  const hasBorder = typeof border === "string"
    ? border.trim().length > 0 && border !== "none"
    // A radius is not a line. A Layout that only ever had its corners set never drew an outline, and
    // reading it as `custom` would put it in the one state where the corners stop following the shape.
    : border != null && typeof border === "object"
      && (["borderWidth", "borderStyle", "borderColor"] as const)
        .some((key) => (border as Record<string, unknown>)[key] != null);
  return hasBorder ? "custom" : "none";
}
