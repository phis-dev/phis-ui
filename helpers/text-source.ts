import { readPhiConfigFieldTextRegister } from "./config-text-fields";
import type { PhiCmsConfigField } from "../types/cms-plugins";

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

/**
 * The Site's words written by a Preset: what the Site configured -- its contact address, its name --
 * placed into a Widget by a Module's Preset. Stated, not left out, so that a Module's Preset says of
 * every Widget with text whose words it holds (`helpers/preset-text-source-check.ts`); it is read like
 * no marker at all, and the Site's store translates them.
 */
export const PHI_TEXT_SOURCE_SITE = "site" as const;

export type PhiTextSource = typeof PHI_TEXT_SOURCE_PRESET | typeof PHI_TEXT_SOURCE_SITE;

export function readPhiTextSource(value: unknown): PhiTextSource | undefined {
  return value === PHI_TEXT_SOURCE_PRESET || value === PHI_TEXT_SOURCE_SITE ? value : undefined;
}

/**
 * Whether a Builder edit of this field ends the Preset's ownership of the Widget's words: a text
 * field's, or a list's whose entries hold text -- a select's options.
 */
export function isPhiAuthoredTextField(field: PhiCmsConfigField): boolean {
  if (field.type === "collection") return field.itemFields.some(isPhiAuthoredTextField);
  return readPhiConfigFieldTextRegister(field) != null;
}
