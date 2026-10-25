/**
 * Whose words a text Widget holds, which decides the store that translates them.
 *
 * A Preset's text is the platform's: the same sentence on every installation, translated once in the
 * global store, which only the operator edits. Text an author wrote on a Site is the Site's and goes to
 * the Site's store. The Preset says so by writing `textSource: "preset"` beside its words; the Builder
 * drops the marker the moment an author changes one of the Widget's texts, and from then on all of them
 * are the Site's.
 *
 * A marker rather than a translation done by the Preset itself: adopting a Preset stores the tree it
 * built, so a Preset that translated its words would freeze one locale into the Site's copy.
 */
export const PHI_TEXT_SOURCE_PRESET = "preset" as const;

export type PhiTextSource = typeof PHI_TEXT_SOURCE_PRESET;

export function readPhiTextSource(value: unknown): PhiTextSource | undefined {
  return value === PHI_TEXT_SOURCE_PRESET ? value : undefined;
}

/** Whether a Builder edit of this field ends the Preset's ownership of the Widget's words. */
export function isPhiAuthoredTextField(field: { type?: string }) {
  return field.type === "string";
}
