import type {
  PhiFormFieldPlacementDescriptor,
  PhiFormGridRange,
} from "@phis/contracts/forms";
import {
  PHI_FORM_GRID_LAST_LINE,
  assertPhiFormGridRange,
  statedPhiFormGridRange,
  type PhiFormResponsiveMode,
  type PhiResolvedFormLayout,
} from "@phis/contracts/forms";
import {
  PHI_CONTAINER_BREAKPOINT_COL3,
  PHI_CONTAINER_BREAKPOINT_CONTENT,
} from "../../theme/phi-container-breakpoints";

/*
 * What a descriptor may say, and the parser that decides it, are `@phis/contracts/forms`: phis-server
 * stores descriptors and reads them by the same rules. What stays below is how this renderer turns the
 * grid into rows and CSS, which is nobody else's business.
 */
export {
  PHI_FORM_DEFAULT_LAYOUT,
  PHI_FORM_GRID_LAST_LINE,
  PHI_FORM_RESPONSIVE_MODES,
  PHI_FORM_ROW_END_HALF,
  PHI_FORM_ROW_FULL,
  PHI_FORM_SIDE_END_HALF,
  PHI_FORM_SIDE_START_HALF,
  PHI_FORM_STACKED_END_HALF,
  PHI_FORM_STACKED_FULL,
  PHI_FORM_STACKED_LAYOUT,
  assertPhiFormLabelSetKey,
  createPhiFormLabelText,
  createPhiFormLiteralText,
  parsePhiFormDescriptor,
  phiFormFlowHalfColumns,
  resolvePhiFormLayout,
  resolvePhiFormResponsiveGridRange,
  resolvePhiFormText,
  type PhiFormResponsiveMode,
  type PhiResolvedFormLayout,
  type PhiResolvedFormResponsiveGridRange,
} from "@phis/contracts/forms";

export function shouldPhiFormSubmitOnKeyDown(input: {
  key: string;
  defaultPrevented: boolean;
  isComposing: boolean;
  multiline: boolean;
  contentEditable: boolean;
  managedKeyboardScope: boolean;
}) {
  return input.key === "Enter" &&
    !input.defaultPrevented &&
    !input.isComposing &&
    !input.multiline &&
    !input.contentEditable &&
    !input.managedKeyboardScope;
}

/**
 * How wide the form itself has to be for each set of ranges, in pixels.
 *
 * Its own width, not the window's: a form is measured where it stands, and a 480px dialog on a desk
 * monitor fell under `screenSM` and stacked its labels on a row with room for three of them. What a
 * label beside a short input actually needs is about a third of the width; below that the input is left
 * too little to type in.
 *
 * Both numbers come off the container-breakpoint scale. `medium` was 360 and is 377, seventeen pixels
 * that change nothing -- the narrowest form anybody authors is the 400px login dialog, and it stays on
 * the near side. `wide` was 768 and is 610, which is `contentMax`: a form wider than that has left the
 * content column, and 768 could be reached from nowhere in particular. No shipped descriptor tells its
 * `medium` and `wide` ranges apart, so today the upper threshold decides nothing at all; it is put
 * where it will mean something when one does.
 *
 * The upper one is reachable, which took saying: the Form Widget's cap measures the same box this query
 * measures, so a form capped at `contentMax` reads `contentMax` here. While the cap was the block's
 * `maxSize`, every box the Widget drew took its inset off that measure first -- 568 inside a `card` --
 * and a form in a box could not reach `wide` at all, whatever its descriptor said (see `FORMS.md`).
 *
 * The comparison itself is made by the container queries in `styles/layout.css`, and these numbers are
 * the same numbers. They are declared here so the contract states them and the tests can read them --
 * if one side changes, the other has to be changed with it.
 */
export const PHI_FORM_RESPONSIVE_MIN_WIDTH = {
  medium: PHI_CONTAINER_BREAKPOINT_COL3,
  wide: PHI_CONTAINER_BREAKPOINT_CONTENT,
} as const;

/**
 * Whether two ranges claim any of the same tracks.
 *
 * Between a field's own label and control this is not a fault but the statement that they stand under
 * each other: two elements that both want columns 1-25 cannot share a row, and that is exactly how a
 * stacked field is written. Between two different fields it means they would be drawn on top of each
 * other, which is why fields are placed as whole units.
 */
export function phiFormGridRangesOverlap(a: PhiFormGridRange, b: PhiFormGridRange) {
  return a.start < b.end && b.start < a.end;
}

/**
 * Where one field's label and control lie, at one measured width.
 *
 * Decided per mode from what the placement states for that mode:
 * - both parts: each in its own range;
 * - only the control: there is no label column. The field is that one range, and its label, if it has
 *   one, stands above the control inside it;
 * - only the label: there is no control column. The field is the label's range, and whatever control it
 *   draws stands under the label inside it;
 * - neither: the layout's ranges for both.
 *
 * The part left out is never taken from the layout. The two rarely agree: a control moved to 7-19 beside
 * a layout label at 1-9 overlaps it, and the field stacked on two rows without anyone having asked.
 *
 * `stacked` falls out of the ranges rather than being declared: label and control that want the same
 * tracks cannot share a row, so they take two. That is what makes the narrow form and the wide form one
 * contract instead of a layout mode with two branches -- and a one-part placement is always stacked,
 * because both parts stand in the one range it names.
 */
export function resolvePhiFormFieldRanges(
  layout: PhiResolvedFormLayout,
  placement: PhiFormFieldPlacementDescriptor | undefined,
  mode: PhiFormResponsiveMode,
  path: string,
): { label: PhiFormGridRange; control: PhiFormGridRange; stacked: boolean } {
  const statedLabel = statedPhiFormGridRange(placement?.label, mode);
  const statedControl = statedPhiFormGridRange(placement?.control, mode);
  const label = assertPhiFormGridRange(
    statedLabel ?? statedControl ?? layout.label[mode],
    `${path}.label.${mode}`,
  );
  const control = assertPhiFormGridRange(
    statedControl ?? statedLabel ?? layout.control[mode],
    `${path}.control.${mode}`,
  );

  return { label, control, stacked: phiFormGridRangesOverlap(label, control) };
}

/**
 * The tracks a whole field occupies, label and control together.
 *
 * A field is placed as one unit and lays its own parts out inside it, because CSS Grid places items in
 * declaration order and never goes back: a label and a control handed to the grid separately would let
 * the next field's label slide into the gap the last control left. As one unit, two fields side by side
 * are two units side by side, and the order on the page is the order in the descriptor.
 */
export function resolvePhiFormFieldExtent(
  label: PhiFormGridRange,
  control: PhiFormGridRange,
): PhiFormGridRange {
  return {
    start: Math.min(label.start, control.start),
    end: Math.max(label.end, control.end),
  };
}

/**
 * Which row each part of each field stands in, worked out here rather than left to the grid.
 *
 * CSS places items in declaration order and never goes back to fill a gap it has passed, so a form whose
 * fields were handed over as loose labels and controls would let one field's label slide into the space
 * the previous control left. Wrapping each field in a subgrid solved that and cost more than it was
 * worth: `subgrid` is young, and a browser without it does not fail -- it silently drops the line and
 * scatters the form. Rows named outright work everywhere and say what was meant.
 *
 * A field goes on the current row while its tracks are free, and opens a new one when they are not,
 * which is what the grid would have done. A stacked field takes two rows, its label above its control.
 */
export function resolvePhiFormGridPlacement(
  layout: PhiResolvedFormLayout,
  fields: readonly {
    key: string;
    placement?: PhiFormFieldPlacementDescriptor;
    /** A hidden or honeypot field is out of flow and takes no room. */
    inFlow: boolean;
    /**
     * Whether a label cell is drawn for this field at all.
     *
     * A consent whose sentence is the control, or a checkbox that carries its own wording, has nothing
     * to put beside or above itself. Such a field takes its control's tracks and one row -- reserving
     * the label's row would leave an empty band in the middle of the form.
     */
    hasLabel: boolean;
  }[],
  mode: PhiFormResponsiveMode,
) {
  const placements = new Map<string, {
    label: PhiFormGridRange;
    /**
     * The label tracks the layout reserves for this field, whether a label is drawn there or not.
     *
     * `label` is the control's range for a field without one, which is right for everything that asks
     * where cells stand and wrong for the one question of where the field begins: a consent checkbox in
     * the control column of a two-column form starts at the label's line like its neighbours, and
     * measured against its own control it looked like a field opening a second column.
     */
    labelSlot: PhiFormGridRange;
    control: PhiFormGridRange;
    stacked: boolean;
    labelRow: number;
    controlRow: number;
  }>();

  let rowStart = 1;
  let lastRow = 1;
  let taken: PhiFormGridRange[] = [];

  for (const field of fields) {
    const ranges = resolvePhiFormFieldRanges(
      layout,
      field.placement,
      mode,
      `fields.${field.key}`,
    );
    const control = ranges.control;
    // A field with no label cell is its control, and nothing overlaps a cell that is never drawn.
    const label = field.hasLabel ? ranges.label : control;
    const stacked = field.hasLabel && ranges.stacked;
    if (!field.inFlow) {
      placements.set(field.key, {
        label, labelSlot: ranges.label, control, stacked, labelRow: rowStart, controlRow: rowStart,
      });
      continue;
    }

    const extent = resolvePhiFormFieldExtent(label, control);
    if (taken.some((other) => phiFormGridRangesOverlap(extent, other))) {
      rowStart = lastRow + 1;
      taken = [];
    }
    taken.push(extent);

    const controlRow = stacked ? rowStart + 1 : rowStart;
    lastRow = Math.max(lastRow, controlRow);
    placements.set(field.key, {
      label, labelSlot: ranges.label, control, stacked, labelRow: rowStart, controlRow,
    });
  }

  return { placements, nextRow: lastRow + 1 };
}

/**
 * Whether a Form Layout above this form may decide where this field's label column ends.
 *
 * Only for a field that is taking the form's own ranges: a field that places itself is saying something
 * about that field, and a Layout deciding the form's columns has no business overruling it. And only
 * for a row that is actually two columns running the full width, because that is the only shape whose
 * single boundary line describes it.
 */
export function phiFormFieldFollowsLayoutColumns(input: {
  placement: PhiFormFieldPlacementDescriptor | undefined;
  label: PhiFormGridRange;
  control: PhiFormGridRange;
  stacked: boolean;
}) {
  return !input.stacked &&
    input.placement?.label == null &&
    input.placement?.control == null &&
    input.label.start === 1 &&
    input.control.end === PHI_FORM_GRID_LAST_LINE;
}

/**
 * Whether this cell is the one that opens a column, and so the one the column gap is laid on.
 *
 * The question is asked per cell because the grid cannot answer it: `column-gap` would fall between a
 * label and its own control as readily as between two fields, and those two distances are not the same
 * one. A cell opens a column when it begins after the row's first line and no other part of its own
 * field begins earlier -- so the label of a field placed at 13-25 opens one, its control at 17-25 does
 * not, and a field stacked in that column opens one with both of its parts, because both begin at 13.
 *
 * A field that starts the row is never moved: there the inset belongs to whatever box the form stands
 * in, and moving the first column would take the form off its own left edge.
 */
export function phiFormCellOpensColumn(range: PhiFormGridRange, sibling: PhiFormGridRange) {
  return range.start > 1 && range.start <= sibling.start;
}

/**
 * `grid-column` for the two halves of a row a Form Layout may move the boundary of.
 *
 * The line is substituted by CSS rather than by us, through the custom property the Form Layout writes.
 * It has to be CSS: the Layout renders on the server and hands this form in as an already-rendered
 * child, so nothing React carries can reach from one to the other. The descriptor's own line stands as
 * the fallback, which is what a form outside any Form Layout uses.
 */
export const PHI_FORM_LABEL_END_PROPERTY = "--phi-form-label-end";

export function phiFormLabelGridColumn(range: PhiFormGridRange, followsLayout: boolean) {
  return followsLayout
    ? `1 / var(${PHI_FORM_LABEL_END_PROPERTY}, ${range.end})`
    : phiFormGridColumn(range);
}

export function phiFormControlGridColumn(range: PhiFormGridRange, followsLayout: boolean) {
  return followsLayout
    ? `var(${PHI_FORM_LABEL_END_PROPERTY}, ${range.start}) / ${PHI_FORM_GRID_LAST_LINE}`
    : phiFormGridColumn(range);
}

/** The `grid-column` shorthand for a range, which is the only form CSS accepts. */
export function phiFormGridColumn(range: PhiFormGridRange) {
  return `${range.start} / ${range.end}`;
}

/** The custom properties the Form Widget writes for the row its submit and links stand in. */
export const PHI_FORM_ACTIONS_COLUMNS_PROPERTY = "--phi-form-actions-columns";

/**
 * Which columns the Widget's submit and its links stand in, at one measured width.
 *
 * `start` means under the inputs and not at the form's left edge, so the row takes the layout's own
 * control range -- the same tracks a field that says nothing about itself puts its control on, read the
 * same way, including the label column a Form Layout may have moved. A form whose labels stand above
 * their controls puts those controls on line 1, and the button goes there with them: the row cannot
 * name the label column outright, because in that form there is none to stand after.
 */
export function phiFormActionsGridColumn(
  layout: PhiResolvedFormLayout,
  mode: PhiFormResponsiveMode,
) {
  const label = layout.label[mode];
  const control = layout.control[mode];
  return phiFormControlGridColumn(control, phiFormFieldFollowsLayoutColumns({
    placement: undefined,
    label,
    control,
    stacked: phiFormGridRangesOverlap(label, control),
  }));
}
