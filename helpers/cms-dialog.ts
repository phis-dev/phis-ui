import type { PhiFormDescriptor } from "@phis/contracts/forms";

import { resolvePhiFormColumnStep } from "../components/forms/form-descriptor-contract";
import { PHI_SPACE } from "../theme/antd-css-var-contract";
import { PHI_CONTAINER_BREAKPOINT_REGION } from "../theme/phi-container-breakpoints";
import { PHI_SURFACE_WASH } from "./surface-presets";
import { PHI_LAYOUT } from "../theme/phi-tokens";

/*
 * What every dialog looks like, said once.
 *
 * A dialog is an Overlay with a body and a row of actions (OVERLAYS.md, "Structured dialogs"). Its footer
 * was always canonical -- the `overlay-actions` Layout preset, checked by the descriptor compiler -- and
 * its body and its buttons were not, so thirty dialogs drew four different bodies and three different
 * button rows. These are the other two halves of that contract, for a Preset that builds its dialog node
 * by node; `dialog` on `createPhiCmsPresetNodes` builds all of it from them.
 *
 * - The body is the zone's ground: the Theme's wash, the base step in from the edge and the small step
 *   between what stands in it. It has no corner of its own -- the Modal has the one there is
 *   (`styles/layout.css`).
 *   A body its content fills to the edge -- an image to crop, a canvas to draw on -- takes the bleed body
 *   instead: the same ground, no inset, and its content draws no corner of its own either.
 * - The actions are one compact group, labelled, at the medium size: a dialog asks one question and its
 *   answers belong together.
 * - The width is as wide as its Form needs: the narrowest width that keeps a Form's labels beside its
 *   fields for one of one column, and the room its columns need for one that has columns. A table or an
 *   editor states a wider one; a dialog with no Form takes the reading measure. It is the width of the Overlay's `size`, a block's length (OVERLAYS.md, "Presentation config"),
 *   and the Modal holds it inside the viewport itself, so a phone gets the full width less the gutter
 *   without a second value.
 */

/** The body Layout's config: a vertical Flex with the `panel` creation preset under it. */
export const PHI_DIALOG_BODY_CONFIG = {
  margin: 0,
  padding: PHI_SPACE.base,
  surface: PHI_SURFACE_WASH,
} as const;

/** The body of a dialog whose content runs to its edges: the dialog's ground, without the inset. */
export const PHI_DIALOG_BLEED_BODY_CONFIG = {
  margin: 0,
  padding: 0,
  surface: PHI_SURFACE_WASH,
} as const;

/** The Command Toolbar in the footer, less its key, buttons and routes. */
export const PHI_DIALOG_COMMANDS_CONFIG = {
  compact: true,
  showLabels: true,
  controlSize: "medium",
} as const;

/**
 * A dialog's width where it names none and holds no Form it was handed: the reading measure. A dialog
 * with a Form takes the Form's width (`resolvePhiDialogFormGeometry`); a wider one -- a table, a preview
 * -- says so, and takes its width from the same sequence (`PHI_LAYOUT`). A dialog states it as
 * `size: { width: PHI_DIALOG_WIDTH }`.
 */
export const PHI_DIALOG_WIDTH = PHI_LAYOUT.contentMax;

/**
 * A dialog's width where its Form stands in one column.
 *
 * The reading measure is the room two columns need; one column in it is a strip of labels and a run of
 * inputs far longer than anything typed into them. The narrow width is not `contentMaxNarrow` itself,
 * though: that is where a Form turns `medium` and puts its labels beside the fields
 * (`PHI_FORM_RESPONSIVE_MIN_WIDTH.medium`, the same 377), and the Form stands inside the body's inset.
 * So it is that measure plus the inset on both sides -- the Theme's `base` step, whatever it is set to.
 */
export const PHI_DIALOG_WIDTH_SINGLE_COLUMN =
  `calc(${PHI_LAYOUT.contentMaxNarrow}px + 2 * ${PHI_DIALOG_BODY_CONFIG.padding})`;

/**
 * A dialog's width where its Form has columns, by how many it has.
 *
 * The reading measure was the width of a Form of two columns, and it was too narrow for either kind
 * (owner, 2026-11-26). Inside the body's inset it leaves the Form 568px: a Form that places its fields side
 * by side only from `wide` -- 610px of Form -- stood in one column there every time, and one whose halves
 * stand from `medium` (the `PHI_FORM_SIDE_*_HALF` pairs, the Shop's listing) gave each label about 85px,
 * where a label of one long word broke inside it. The Modules that met it stated a dialog of their own.
 * So the dialog takes the width the columns need, and the Form stands `wide` in it:
 * - two: 987, the step of the house sequence after the reading measure (`PHI_CONTAINER_BREAKPOINT_REGION`),
 *   which leaves the Form 945 -- two columns of the 377 at which a label stands beside its field, and
 *   room between them;
 * - three or more: a Page's width (`PHI_LAYOUT.pageMax`, 1220), the widest a column of content gets.
 *
 * Both stop at `PHI_DIALOG_MAX_WIDTH` of the window, and where the window leaves less the Form measures
 * less and lays itself out for what it has: under 610px it is `medium`, and its columns fall back to
 * what it states there (FORMS.md, "Layout and placement").
 */
const PHI_DIALOG_WIDTH_COLUMNS = {
  two: PHI_CONTAINER_BREAKPOINT_REGION,
  three: PHI_LAYOUT.pageMax,
} as const;

/** The share of the window a dialog sized for a Form's columns never exceeds. */
const PHI_DIALOG_MAX_WIDTH = "90vw";

/**
 * Whether a Form stands in one column wherever it can stand in two.
 *
 * Read off the descriptor at the two widths that put labels beside fields, `medium` and `wide`
 * (`resolvePhiFormColumnCount`): a field whose label and control together leave part of the row free
 * leaves room for a field beside it, and that is a Form of two columns -- whether a second field stands
 * there or not, since the half was meant for one. A field takes the layout's label column into its extent
 * even where it draws no label, as it does on the grid (`labelSlot` in `resolvePhiFormGridPlacement`), so
 * a checkbox under the inputs is still a field of the one column. At `compact` every Form is one column,
 * and it says nothing.
 */
export function isPhiFormSingleColumn(descriptor: PhiFormDescriptor) {
  return resolvePhiFormColumnStep(descriptor) == null;
}

/**
 * The geometry a dialog takes for the Form in its body, as the Overlay's `size` and `maxSize` pairs.
 *
 * One column: `PHI_DIALOG_WIDTH_SINGLE_COLUMN`. Columns, at either width that has them: the width they
 * need (`PHI_DIALOG_WIDTH_COLUMNS`), no more than `PHI_DIALOG_MAX_WIDTH` of the window. The Form itself is not capped below it: its own cap, where its placement states none,
 * grows with the same columns (`resolvePhiFormHouseMaxWidth`).
 */
export function resolvePhiDialogFormGeometry(descriptor: PhiFormDescriptor): {
  size: { width: number | string };
  maxSize?: { width: string };
} {
  const step = resolvePhiFormColumnStep(descriptor);
  if (step == null) return { size: { width: PHI_DIALOG_WIDTH_SINGLE_COLUMN } };
  return {
    size: { width: step.columns >= 3 ? PHI_DIALOG_WIDTH_COLUMNS.three : PHI_DIALOG_WIDTH_COLUMNS.two },
    maxSize: { width: PHI_DIALOG_MAX_WIDTH },
  };
}
