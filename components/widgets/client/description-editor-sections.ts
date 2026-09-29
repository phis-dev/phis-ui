/**
 * Which parts of the Description Widget's editor stand, decided from what is stored -- never from the
 * draft being typed.
 *
 * A part that came and went with the draft would unmount the field under the caret: the first
 * character typed into an empty title swapped the tree and took the focus with it, and clearing the
 * last text took the field away before its blur could write the empty value. So an editing author is
 * offered every part, empty or not, and the eyebrow's pill follows the stored value, which changes
 * only once the field has been left.
 *
 * Read-only rendering keeps to what has text: a visitor is not shown empty placeholders.
 */
export type PhiDescriptionEditorStoredText = {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideItems: readonly string[];
};

export type PhiDescriptionEditorSections = {
  /** The eyebrow sits in its pill; otherwise it is a plain field. */
  eyebrowTag: boolean;
  /** The title and the description, which stand and fall together. */
  heading: boolean;
  /** The aside title and its items. */
  aside: boolean;
};

export function resolvePhiDescriptionEditorSections(
  stored: PhiDescriptionEditorStoredText,
  editable: boolean,
): PhiDescriptionEditorSections {
  return {
    eyebrowTag: stored.eyebrow.length > 0,
    heading: editable || stored.title.length > 0 || stored.description.length > 0,
    aside: editable || stored.asideTitle.length > 0 || stored.asideItems.length > 0,
  };
}
