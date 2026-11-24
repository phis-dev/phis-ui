import {
  PHI_FORM_GRID_LAST_LINE,
  resolvePhiFormLayout,
  type PhiFormDescriptor,
} from "@phis/contracts/forms";

import { resolvePhiFormFieldExtent, resolvePhiFormFieldRanges } from "../components/forms/form-descriptor-contract";
import { PHI_SPACE } from "../theme/antd-css-var-contract";
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
 * - The width is as wide as its Form needs: the reading measure for a Form of two columns, the narrowest
 *   width that keeps a Form's labels beside its fields for one of one column. A table or an editor states
 *   a wider one. It is the width of the Overlay's `size`, a block's length (OVERLAYS.md, "Presentation config"),
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
 * A dialog's width where it names none and its Form needs two columns: the reading measure, which is also
 * where a Form's own cap lies, so a Form fills the dialog it opens in. A wider one -- a table, a preview
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

/** The widths at which a Form's labels stand beside its fields, and so the ones that have columns. */
const PHI_DIALOG_FORM_COLUMN_MODES = ["medium", "wide"] as const;

/**
 * Whether a Form stands in one column wherever it can stand in two.
 *
 * Read off the descriptor at the two widths that put labels beside fields, `medium` and `wide`: a field
 * whose label and control together leave part of the row free leaves room for a field beside it, and
 * that is a Form of two columns -- whether a second field stands there or not, since the half was meant
 * for one. A field takes the layout's label column into its extent even where it draws no label, as it
 * does on the grid (`labelSlot` in `resolvePhiFormGridPlacement`), so a checkbox under the inputs is
 * still a field of the one column. At `compact` every Form is one column, and it says nothing.
 */
export function isPhiFormSingleColumn(descriptor: PhiFormDescriptor) {
  const layout = resolvePhiFormLayout(descriptor.layout);
  return descriptor.fields.every((field) => PHI_DIALOG_FORM_COLUMN_MODES.every((mode) => {
    const ranges = resolvePhiFormFieldRanges(layout, field.placement, mode, `fields.${field.key}`);
    const extent = resolvePhiFormFieldExtent(ranges.label, ranges.control);
    return extent.start === 1 && extent.end === PHI_FORM_GRID_LAST_LINE;
  }));
}

/** The width a dialog takes for the Form in its body: `PHI_DIALOG_WIDTH_SINGLE_COLUMN` or `PHI_DIALOG_WIDTH`. */
export function resolvePhiDialogFormWidth(descriptor: PhiFormDescriptor): number | string {
  return isPhiFormSingleColumn(descriptor) ? PHI_DIALOG_WIDTH_SINGLE_COLUMN : PHI_DIALOG_WIDTH;
}
