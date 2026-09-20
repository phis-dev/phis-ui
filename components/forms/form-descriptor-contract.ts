import type {
  PhiFormDescriptor,
  PhiFormFieldDescriptor,
  PhiFormFieldPlacementDescriptor,
  PhiFormGridRange,
  PhiFormLabelSetKey,
  PhiFormLayoutDescriptor,
  PhiFormOptionDescriptor,
  PhiFormResponsiveGridRange,
  PhiFormSuccessDescriptor,
  PhiFormTextDescriptor,
  PhiFormValidationRuleDescriptor,
} from "../../types/form-descriptor";
import {
  PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  PHI_FORM_GRID_TRACKS,
} from "../../types/form-descriptor";
import {
  resolvePhiResponsiveValue,
  type PhiResponsiveValue,
} from "../../types/responsive";
import {
  collectPhiRuntimeValueConditions,
  readPhiRuntimeConditionExpression,
} from "../../types/runtime-condition";
import { isPhiSpacingToken, type PhiSpacingToken } from "../../types/spacing";
import { parsePhiControlOptionsProviderConfig } from "../controls/phi-control-options";

/** The last grid line, one past the last track, because `end` is exclusive. */
export const PHI_FORM_GRID_LAST_LINE = PHI_FORM_GRID_TRACKS + 1;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRequiredString(value: unknown, path: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${path} must be a non-empty string.`);
  }
  return normalized;
}

function readOptionalString(value: unknown, path: string) {
  if (value == null) {
    return undefined;
  }
  return readRequiredString(value, path);
}

function readProviderKey(value: unknown, path: string) {
  const key = readRequiredString(value, path);
  if (!key.includes("/")) {
    throw new Error(`${path} must use a namespaced package/key form.`);
  }
  return key as `${string}/${string}`;
}

function readTextDescriptor(value: unknown, path: string): PhiFormTextDescriptor {
  if (!isRecord(value)) {
    throw new Error(`${path} must be a Form text descriptor.`);
  }
  if (value.kind === "literal") {
    return { kind: "literal", value: typeof value.value === "string" ? value.value : "" };
  }
  if (value.kind === "label" || value.kind === "config") {
    return {
      kind: value.kind,
      key: readRequiredString(value.key, `${path}.key`),
      fallback: typeof value.fallback === "string" ? value.fallback : "",
    };
  }
  throw new Error(`${path}.kind must be "literal", "label" or "config".`);
}

function readGridRange(value: unknown, path: string): PhiFormGridRange | undefined {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(`${path} must be a grid range object.`);
  }
  return assertGridRange(
    {
      start: typeof value.start === "number" ? value.start : Number.NaN,
      end: typeof value.end === "number" ? value.end : Number.NaN,
    },
    path,
  );
}

function readResponsiveGridRange(
  value: unknown,
  path: string,
): PhiFormResponsiveGridRange | undefined {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(`${path} must be a responsive grid range object.`);
  }
  return {
    compact: readGridRange(value.compact, `${path}.compact`),
    medium: readGridRange(value.medium, `${path}.medium`),
    wide: readGridRange(value.wide, `${path}.wide`),
  };
}

function readFormConditionExpression(value: unknown, path: string) {
  if (value == null) return undefined;
  const expression = readPhiRuntimeConditionExpression(value);
  if (!expression) throw new Error(`${path} must be a valid runtime condition expression.`);
  for (const condition of collectPhiRuntimeValueConditions(expression)) {
    if (condition.source !== "form" && condition.source !== "controller") {
      throw new Error(`${path} may use only form or controller condition sources.`);
    }
  }
  return expression;
}

function readResponsiveGap(value: unknown, path: string): PhiResponsiveValue<PhiSpacingToken> | undefined {
  if (value == null) return undefined;
  if (!isRecord(value)) throw new Error(`${path} must be a responsive spacing object.`);
  const readToken = (entry: unknown, entryPath: string) => {
    if (entry == null) return undefined;
    if (!isPhiSpacingToken(entry)) throw new Error(`${entryPath} must be a Phi spacing token.`);
    return entry;
  };
  return {
    compact: readToken(value.compact, `${path}.compact`),
    medium: readToken(value.medium, `${path}.medium`),
    wide: readToken(value.wide, `${path}.wide`),
  };
}

function readValidationRule(value: unknown, path: string): PhiFormValidationRuleDescriptor {
  if (!isRecord(value)) {
    throw new Error(`${path} must be a validation rule object.`);
  }
  return {
    providerKey: readProviderKey(value.providerKey, `${path}.providerKey`),
    message: value.message == null ? undefined : readTextDescriptor(value.message, `${path}.message`),
    config: value.config == null
      ? undefined
      : isRecord(value.config)
        ? value.config
        : (() => { throw new Error(`${path}.config must be an object.`); })(),
  };
}

function readOption(value: unknown, path: string): PhiFormOptionDescriptor {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an option object.`);
  }
  return {
    value: readRequiredString(value.value, `${path}.value`),
    label: readTextDescriptor(value.label, `${path}.label`),
    description: value.description == null
      ? undefined
      : readTextDescriptor(value.description, `${path}.description`),
    disabled: typeof value.disabled === "boolean" ? value.disabled : undefined,
    icon: readOptionalString(value.icon, `${path}.icon`),
  };
}

function assertUniqueKeys(items: readonly { key: string }[], path: string) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.key)) {
      throw new Error(`${path} contains duplicate key "${item.key}".`);
    }
    seen.add(item.key);
  }
}

function readField(value: unknown, path: string): PhiFormFieldDescriptor {
  if (!isRecord(value)) {
    throw new Error(`${path} must be a field object.`);
  }
  const options = Array.isArray(value.options)
    ? value.options.map((option, index) => readOption(option, `${path}.options[${index}]`))
    : undefined;
  if (options) {
    const optionKeys = options.map((option) => ({ key: option.value }));
    assertUniqueKeys(optionKeys, `${path}.options`);
  }
  const optionsProvider = value.optionsProvider == null
    ? undefined
    : parsePhiControlOptionsProviderConfig(value.optionsProvider);
  if (value.optionsProvider != null && !optionsProvider) {
    throw new Error(`${path}.optionsProvider is invalid.`);
  }
  if (value.config != null && !isRecord(value.config)) {
    throw new Error(`${path}.config must be an object.`);
  }
  const placement = value.placement == null
    ? undefined
    : isRecord(value.placement)
      ? {
          label: readResponsiveGridRange(value.placement.label, `${path}.placement.label`),
          control: readResponsiveGridRange(value.placement.control, `${path}.placement.control`),
        }
      : (() => { throw new Error(`${path}.placement must be an object.`); })();

  return {
    key: readRequiredString(value.key, `${path}.key`),
    fieldProviderKey: readProviderKey(value.fieldProviderKey, `${path}.fieldProviderKey`),
    label: value.label == null ? undefined : readTextDescriptor(value.label, `${path}.label`),
    controlLabel: value.controlLabel == null
      ? undefined
      : readTextDescriptor(value.controlLabel, `${path}.controlLabel`),
    description: value.description == null
      ? undefined
      : readTextDescriptor(value.description, `${path}.description`),
    placeholder: value.placeholder == null
      ? undefined
      : readTextDescriptor(value.placeholder, `${path}.placeholder`),
    autoComplete: readOptionalString(value.autoComplete, `${path}.autoComplete`),
    initialValue: value.initialValue,
    options,
    optionsProvider,
    validation: Array.isArray(value.validation)
      ? value.validation.map((rule, index) => readValidationRule(rule, `${path}.validation[${index}]`))
      : undefined,
    visibleWhen: readFormConditionExpression(value.visibleWhen, `${path}.visibleWhen`),
    disabledWhen: readFormConditionExpression(value.disabledWhen, `${path}.disabledWhen`),
    placement,
    config: value.config as Record<string, unknown> | undefined,
  };
}

export function parsePhiFormDescriptor(value: unknown): PhiFormDescriptor {
  if (!isRecord(value)) {
    throw new Error("Form descriptor must be an object.");
  }
  if (value.schemaVersion !== PHI_FORM_DESCRIPTOR_SCHEMA_VERSION) {
    throw new Error(`Form descriptor schemaVersion must be ${PHI_FORM_DESCRIPTOR_SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(value.fields)) {
    throw new Error("Form descriptor fields must be an array.");
  }
  if ("actions" in value) {
    /*
     * A descriptor describes a form's fields, never what is done with them. Where a form is submitted
     * from is a question about the surface it stands on: a Button Widget beside it, an Overlay footer,
     * a toolbar -- or the Form Widget's own `submit` option, which is config on the Widget and reaches
     * the same `submit` capability those do.
     */
    throw new Error(
      "Form descriptor actions are forbidden; use the Form Widget's submit option or an external Button Widget.",
    );
  }
  if ("presentation" in value) {
    throw new Error("Form descriptor presentation is forbidden; use the owning Layout or Overlay.");
  }
  const fields = value.fields.map((field, index) => readField(field, `fields[${index}]`));
  assertUniqueKeys(fields, "fields");
  const labelSetKey = value.labelSetKey == null
    ? undefined
    : readProviderKey(value.labelSetKey, "labelSetKey") as PhiFormLabelSetKey;
  const layout: PhiFormLayoutDescriptor | undefined = value.layout == null
    ? undefined
    : isRecord(value.layout)
      ? {
          gap: readResponsiveGap(value.layout.gap, "layout.gap"),
          labelAlign: value.layout.labelAlign == null
            ? undefined
            : value.layout.labelAlign === "start" || value.layout.labelAlign === "end"
              ? value.layout.labelAlign
              : (() => { throw new Error("layout.labelAlign must be start or end."); })(),
          label: readResponsiveGridRange(value.layout.label, "layout.label"),
          control: readResponsiveGridRange(value.layout.control, "layout.control"),
        }
      : (() => { throw new Error("layout must be an object."); })();
  if (layout) {
    resolvePhiFormLayout(layout);
  }
  const success: PhiFormSuccessDescriptor | undefined = value.success == null
    ? undefined
    : isRecord(value.success)
      ? {
          title: readTextDescriptor(value.success.title, "success.title"),
          text: value.success.text == null
            ? undefined
            : readTextDescriptor(value.success.text, "success.text"),
          reset: value.success.reset == null ? undefined : value.success.reset === true,
        }
      : (() => { throw new Error("success must be an object."); })();
  return {
    schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
    key: readRequiredString(value.key, "key"),
    labelSetKey,
    fields,
    layout,
    success,
    persistDraft: value.persistDraft == null ? undefined : value.persistDraft === true,
    guard: value.guard == null ? undefined : value.guard === true,
  };
}

/**
 * How wide the form itself has to be for each set of ranges, in pixels.
 *
 * Its own width, not the window's: a form is measured where it stands, and a 480px dialog on a desk
 * monitor fell under `screenSM` and stacked its labels on a row with room for three of them. What a
 * label beside a short input actually needs is about a third of 360px; below that the input is left too
 * little to type in.
 *
 * The comparison itself is made by the container queries in `styles/layout.css`, and these numbers are
 * the same numbers. They are declared here so the contract states them and the tests can read them --
 * if one side changes, the other has to be changed with it.
 */
export const PHI_FORM_RESPONSIVE_MIN_WIDTH = {
  medium: 360,
  wide: 768,
} as const;

/**
 * What a form looks like when it says nothing: labels beside their controls at a third of the width,
 * and stacked once the form is measured narrow, which is the one place a label beside a short input
 * leaves the input no room. Line 9 of 24 is the third; the control takes everything after it.
 *
 * A third is the house column, the one the Login states for itself in `PHI_LOGIN_FORM_LAYOUT_CONFIG`:
 * eight tracks hold a two-word label without wrapping it, and sixteen still read as the wider half.
 */
export const PHI_FORM_DEFAULT_LAYOUT = {
  gap: {
    compact: "sm",
    medium: "base",
    wide: "base",
  },
  labelAlign: "start",
  label: {
    compact: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
    medium: { start: 1, end: 9 },
    wide: { start: 1, end: 9 },
  },
  control: {
    compact: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
    medium: { start: 9, end: PHI_FORM_GRID_LAST_LINE },
    wide: { start: 9, end: PHI_FORM_GRID_LAST_LINE },
  },
} as const satisfies PhiFormLayoutDescriptor;

/**
 * The ranges a form reaches for again and again, named once.
 *
 * A field written as the same range for its label and its control is a stacked field, because the two
 * cannot share a row; the half-width pairs are how a two-column form is said now that `columns` is
 * gone. All three collapse to the full width when the form is measured narrow, which is the only
 * width at which two columns of anything are worse than one.
 */
export const PHI_FORM_ROW_FULL = {
  compact: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
  medium: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
  wide: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
} as const satisfies PhiFormResponsiveGridRange;

export const PHI_FORM_ROW_START_HALF = {
  compact: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
  medium: { start: 1, end: 13 },
  wide: { start: 1, end: 13 },
} as const satisfies PhiFormResponsiveGridRange;

export const PHI_FORM_ROW_END_HALF = {
  compact: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
  medium: { start: 13, end: PHI_FORM_GRID_LAST_LINE },
  wide: { start: 13, end: PHI_FORM_GRID_LAST_LINE },
} as const satisfies PhiFormResponsiveGridRange;

/** Labels above their controls at every width: one range for both parts of every field. */
export const PHI_FORM_STACKED_LAYOUT = {
  label: PHI_FORM_ROW_FULL,
  control: PHI_FORM_ROW_FULL,
} as const satisfies PhiFormLayoutDescriptor;

/** One field of a two-column form whose labels stand above their controls. */
export const PHI_FORM_STACKED_START_HALF = {
  label: PHI_FORM_ROW_START_HALF,
  control: PHI_FORM_ROW_START_HALF,
} as const satisfies PhiFormFieldPlacementDescriptor;

export const PHI_FORM_STACKED_END_HALF = {
  label: PHI_FORM_ROW_END_HALF,
  control: PHI_FORM_ROW_END_HALF,
} as const satisfies PhiFormFieldPlacementDescriptor;

/** One field of a two-column form whose labels stand beside their controls. */
export const PHI_FORM_SIDE_START_HALF = {
  label: {
    compact: { start: 1, end: 7 },
    medium: { start: 1, end: 5 },
    wide: { start: 1, end: 5 },
  },
  control: {
    compact: { start: 7, end: PHI_FORM_GRID_LAST_LINE },
    medium: { start: 5, end: 13 },
    wide: { start: 5, end: 13 },
  },
} as const satisfies PhiFormFieldPlacementDescriptor;

export const PHI_FORM_SIDE_END_HALF = {
  label: {
    compact: { start: 1, end: 7 },
    medium: { start: 13, end: 17 },
    wide: { start: 13, end: 17 },
  },
  control: {
    compact: { start: 7, end: PHI_FORM_GRID_LAST_LINE },
    medium: { start: 17, end: PHI_FORM_GRID_LAST_LINE },
    wide: { start: 17, end: PHI_FORM_GRID_LAST_LINE },
  },
} as const satisfies PhiFormFieldPlacementDescriptor;

/**
 * Two columns filled the way a grid fills them, for a form long enough that saying it per field would
 * be a list of alternations nobody can read or keep correct.
 *
 * A field that brings its own placement keeps it and, where it takes the whole width, starts the next
 * field on a fresh row -- which is what the grid did when the column count decided this and not the
 * field. Authoring sugar over the contract, never a second contract: what it produces is ordinary
 * per-field placement.
 */
export function phiFormFlowHalfColumns(
  fields: readonly PhiFormFieldDescriptor[],
): PhiFormFieldDescriptor[] {
  let atRowStart = true;
  return fields.map((field) => {
    if (field.placement) {
      const claimsWholeRow =
        field.placement.control?.medium?.start === 1 &&
        field.placement.control.medium.end === PHI_FORM_GRID_LAST_LINE;
      atRowStart = claimsWholeRow ? true : !atRowStart;
      return field;
    }
    const placement = atRowStart ? PHI_FORM_SIDE_START_HALF : PHI_FORM_SIDE_END_HALF;
    atRowStart = !atRowStart;
    return { ...field, placement };
  });
}

/** A field that takes the whole row in a form that is otherwise two columns. */
export const PHI_FORM_STACKED_FULL = {
  label: PHI_FORM_ROW_FULL,
  control: PHI_FORM_ROW_FULL,
} as const satisfies PhiFormFieldPlacementDescriptor;

export type PhiResolvedFormResponsiveGridRange = {
  compact: PhiFormGridRange;
  medium: PhiFormGridRange;
  wide: PhiFormGridRange;
};

export const PHI_FORM_RESPONSIVE_MODES = ["compact", "medium", "wide"] as const;

export type PhiFormResponsiveMode = (typeof PHI_FORM_RESPONSIVE_MODES)[number];

export type PhiResolvedFormLayout = {
  gap: {
    compact: PhiSpacingToken;
    medium: PhiSpacingToken;
    wide: PhiSpacingToken;
  };
  labelAlign: "start" | "end";
  label: PhiResolvedFormResponsiveGridRange;
  control: PhiResolvedFormResponsiveGridRange;
};

function assertGridRange(range: PhiFormGridRange, path: string): PhiFormGridRange {
  const { start, end } = range;
  if (!Number.isInteger(start) || start < 1 || start > PHI_FORM_GRID_TRACKS) {
    throw new Error(`${path}.start must be an integer from 1 to ${PHI_FORM_GRID_TRACKS}.`);
  }
  if (!Number.isInteger(end) || end < 2 || end > PHI_FORM_GRID_LAST_LINE) {
    throw new Error(`${path}.end must be an integer from 2 to ${PHI_FORM_GRID_LAST_LINE}.`);
  }
  if (end <= start) {
    throw new Error(`${path}.end must be greater than ${path}.start.`);
  }
  return { start, end };
}

export function createPhiFormLiteralText(value: string): PhiFormTextDescriptor {
  return { kind: "literal", value };
}

export function createPhiFormLabelText(
  key: string,
  fallback: string,
): PhiFormTextDescriptor {
  return { kind: "label", key, fallback };
}

export function resolvePhiFormText(
  text: PhiFormTextDescriptor,
  labels?: Readonly<Record<string, string>>,
  formConfig?: Readonly<Record<string, unknown>>,
) {
  if (text.kind === "literal") {
    return text.value;
  }
  if (text.kind === "config") {
    const value = formConfig?.[text.key];
    return typeof value === "string" && value.trim() ? value : text.fallback;
  }
  return labels?.[text.key] ?? text.fallback;
}

export function assertPhiFormLabelSetKey(
  value: string,
): asserts value is PhiFormLabelSetKey {
  const normalized = value.trim();
  if (!normalized || !normalized.includes("/")) {
    throw new Error(
      `Form label-set key "${value}" must use a namespaced package/key form.`,
    );
  }
}

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

export function resolvePhiFormResponsiveGridRange(
  value: PhiFormResponsiveGridRange | undefined,
  fallback: PhiResolvedFormResponsiveGridRange,
  path: string,
): PhiResolvedFormResponsiveGridRange {
  const resolved = resolvePhiResponsiveValue(value, fallback);
  return {
    compact: assertGridRange(resolved.compact, `${path}.compact`),
    medium: assertGridRange(resolved.medium, `${path}.medium`),
    wide: assertGridRange(resolved.wide, `${path}.wide`),
  };
}

export function resolvePhiFormLayout(
  layout?: PhiFormLayoutDescriptor,
): PhiResolvedFormLayout {
  return {
    gap: resolvePhiResponsiveValue(layout?.gap, PHI_FORM_DEFAULT_LAYOUT.gap),
    labelAlign: layout?.labelAlign ?? PHI_FORM_DEFAULT_LAYOUT.labelAlign,
    label: resolvePhiFormResponsiveGridRange(
      layout?.label,
      PHI_FORM_DEFAULT_LAYOUT.label,
      "layout.label",
    ),
    control: resolvePhiFormResponsiveGridRange(
      layout?.control,
      PHI_FORM_DEFAULT_LAYOUT.control,
      "layout.control",
    ),
  };
}

/**
 * Where one field's label and control lie, at one measured width.
 *
 * A field that says nothing takes the layout's ranges; a field that says something says all of it, so a
 * control moved to 7-19 does not leave its label behind at a width that no longer suits it.
 *
 * `stacked` falls out of the ranges rather than being declared: label and control that want the same
 * tracks cannot share a row, so they take two. That is what makes the narrow form and the wide form one
 * contract instead of a layout mode with two branches.
 */
export function resolvePhiFormFieldRanges(
  layout: PhiResolvedFormLayout,
  placement: PhiFormFieldPlacementDescriptor | undefined,
  mode: PhiFormResponsiveMode,
  path: string,
): { label: PhiFormGridRange; control: PhiFormGridRange; stacked: boolean } {
  const label = resolvePhiFormResponsiveGridRange(
    placement?.label,
    layout.label,
    `${path}.label`,
  )[mode];
  const control = resolvePhiFormResponsiveGridRange(
    placement?.control,
    layout.control,
    `${path}.control`,
  )[mode];

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
      placements.set(field.key, { label, control, stacked, labelRow: rowStart, controlRow: rowStart });
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
    placements.set(field.key, { label, control, stacked, labelRow: rowStart, controlRow });
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
