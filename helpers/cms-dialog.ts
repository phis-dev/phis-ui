import { PHI_SPACE } from "../theme/antd-css-var-contract";
import { PHI_SURFACE_WASH } from "./surface-presets";

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
 * - The actions are one compact group, labelled, at the medium size: a dialog asks one question and its
 *   answers belong together.
 * - The width is the reading measure of a form, full width less the gutter on a phone.
 */

/** The body Layout's config: a vertical Flex with the `panel` creation preset under it. */
export const PHI_DIALOG_BODY_CONFIG = {
  gap: PHI_SPACE.sm,
  margin: 0,
  padding: PHI_SPACE.base,
  surface: PHI_SURFACE_WASH,
} as const;

/** The Command Toolbar in the footer, less its key, buttons and routes. */
export const PHI_DIALOG_COMMANDS_CONFIG = {
  compact: true,
  showLabels: true,
  controlSize: "medium",
} as const;

/** A dialog's width where it names none. A wider one -- a table, a preview -- says so. */
export const PHI_DIALOG_WIDTH = { compact: "calc(100vw - 32px)", medium: 560, wide: 600 } as const;
