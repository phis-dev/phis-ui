import type {
  PhiFormColumnCount,
  PhiFormDescriptor,
  PhiFormFieldDescriptor,
  PhiFormGridPlacement,
  PhiFormLabelSetKey,
  PhiFormLayoutDescriptor,
  PhiFormOptionDescriptor,
  PhiFormResponsiveGridPlacement,
  PhiFormTextDescriptor,
  PhiFormValidationRuleDescriptor,
} from "../../types/form-descriptor";
import { PHI_FORM_DESCRIPTOR_SCHEMA_VERSION } from "../../types/form-descriptor";
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

export const PHI_FORM_GRID_COLUMNS = 24;

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
  if (value.kind === "label") {
    return {
      kind: "label",
      key: readRequiredString(value.key, `${path}.key`),
      fallback: typeof value.fallback === "string" ? value.fallback : "",
    };
  }
  throw new Error(`${path}.kind must be "literal" or "label".`);
}

function readGridPlacement(value: unknown, path: string): PhiFormGridPlacement | undefined {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(`${path} must be a grid placement object.`);
  }
  const placement = {
    span: typeof value.span === "number" ? value.span : undefined,
    offset: typeof value.offset === "number" ? value.offset : undefined,
    order: typeof value.order === "number" ? value.order : undefined,
  };
  return assertGridPlacement(placement, path);
}

function readResponsiveGridPlacement(
  value: unknown,
  path: string,
): PhiFormResponsiveGridPlacement | undefined {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(`${path} must be a responsive grid placement object.`);
  }
  return {
    compact: readGridPlacement(value.compact, `${path}.compact`),
    medium: readGridPlacement(value.medium, `${path}.medium`),
    wide: readGridPlacement(value.wide, `${path}.wide`),
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

function readColumns(value: unknown, path: string) {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(`${path} must be a responsive column object.`);
  }
  const readColumn = (entry: unknown, entryPath: string): PhiFormColumnCount | undefined => {
    if (entry == null) {
      return undefined;
    }
    if (entry !== 1 && entry !== 2 && entry !== 3 && entry !== 4) {
      throw new Error(`${entryPath} must be 1, 2, 3, or 4.`);
    }
    return entry;
  };
  return {
    compact: readColumn(value.compact, `${path}.compact`),
    medium: readColumn(value.medium, `${path}.medium`),
    wide: readColumn(value.wide, `${path}.wide`),
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
          cell: readResponsiveGridPlacement(value.placement.cell, `${path}.placement.cell`),
          label: readResponsiveGridPlacement(value.placement.label, `${path}.placement.label`),
          control: readResponsiveGridPlacement(value.placement.control, `${path}.placement.control`),
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
    throw new Error("Form descriptor actions are forbidden; use external Button Widgets.");
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
          columns: readColumns(value.layout.columns, "layout.columns"),
          gap: readResponsiveGap(value.layout.gap, "layout.gap"),
          labelPlacement: value.layout.labelPlacement == null
            ? undefined
            : value.layout.labelPlacement === "top" || value.layout.labelPlacement === "side"
              ? value.layout.labelPlacement
              : (() => { throw new Error("layout.labelPlacement must be top or side."); })(),
          labelAlign: value.layout.labelAlign == null
            ? undefined
            : value.layout.labelAlign === "start" || value.layout.labelAlign === "end"
              ? value.layout.labelAlign
              : (() => { throw new Error("layout.labelAlign must be start or end."); })(),
          labelGrid: readResponsiveGridPlacement(value.layout.labelGrid, "layout.labelGrid"),
          controlGrid: readResponsiveGridPlacement(value.layout.controlGrid, "layout.controlGrid"),
        }
      : (() => { throw new Error("layout must be an object."); })();
  if (layout) {
    resolvePhiFormLayout(layout);
  }
  return {
    schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
    key: readRequiredString(value.key, "key"),
    labelSetKey,
    fields,
    layout,
  };
}

export const PHI_FORM_RESPONSIVE_BREAKPOINTS = {
  compact: "xs",
  medium: "md",
  wide: "lg",
} as const;

export const PHI_FORM_DEFAULT_LAYOUT = {
  columns: {
    compact: 1,
    medium: 1,
    wide: 1,
  },
  gap: {
    compact: "sm",
    medium: "base",
    wide: "base",
  },
  labelPlacement: "side",
  labelAlign: "start",
  labelGrid: {
    compact: { span: 24, offset: 0 },
    medium: { span: 8, offset: 0 },
    wide: { span: 6, offset: 0 },
  },
  controlGrid: {
    compact: { span: 24, offset: 0 },
    medium: { span: 16, offset: 0 },
    wide: { span: 18, offset: 0 },
  },
} as const satisfies PhiFormLayoutDescriptor;

export type PhiResolvedFormResponsiveGridPlacement = {
  compact: PhiFormGridPlacement;
  medium: PhiFormGridPlacement;
  wide: PhiFormGridPlacement;
};

export type PhiFormResponsiveMode = "compact" | "medium" | "wide";

const PHI_FORM_COLUMN_CEILING_BY_MODE = {
  compact: 1,
  medium: 2,
  wide: 4,
} as const satisfies Record<PhiFormResponsiveMode, PhiFormColumnCount>;

export function resolvePhiFormEffectiveColumnCount(
  configuredColumns: PhiFormColumnCount,
  responsiveMode: PhiFormResponsiveMode,
): PhiFormColumnCount {
  return Math.min(
    configuredColumns,
    PHI_FORM_COLUMN_CEILING_BY_MODE[responsiveMode],
  ) as PhiFormColumnCount;
}

export type PhiResolvedFormLayout = {
  columns: {
    compact: 1 | 2 | 3 | 4;
    medium: 1 | 2 | 3 | 4;
    wide: 1 | 2 | 3 | 4;
  };
  gap: {
    compact: PhiSpacingToken;
    medium: PhiSpacingToken;
    wide: PhiSpacingToken;
  };
  labelPlacement: "top" | "side";
  labelAlign: "start" | "end";
  labelGrid: PhiResolvedFormResponsiveGridPlacement;
  controlGrid: PhiResolvedFormResponsiveGridPlacement;
};

function assertGridPlacement(
  placement: PhiFormGridPlacement,
  path: string,
): PhiFormGridPlacement {
  const span = placement.span;
  const offset = placement.offset;
  const order = placement.order;

  if (
    span != null &&
    (!Number.isInteger(span) || span < 1 || span > PHI_FORM_GRID_COLUMNS)
  ) {
    throw new Error(`${path}.span must be an integer from 1 to 24.`);
  }
  if (
    offset != null &&
    (!Number.isInteger(offset) || offset < 0 || offset >= PHI_FORM_GRID_COLUMNS)
  ) {
    throw new Error(`${path}.offset must be an integer from 0 to 23.`);
  }
  if (order != null && !Number.isInteger(order)) {
    throw new Error(`${path}.order must be an integer.`);
  }
  if (
    span != null &&
    offset != null &&
    span + offset > PHI_FORM_GRID_COLUMNS
  ) {
    throw new Error(`${path}.span plus ${path}.offset must not exceed 24.`);
  }

  return placement;
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
) {
  return text.kind === "literal" ? text.value : labels?.[text.key] ?? text.fallback;
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

export function resolvePhiFormResponsiveGridPlacement(
  value: PhiFormResponsiveGridPlacement | undefined,
  fallback: PhiResolvedFormResponsiveGridPlacement,
  path: string,
): PhiResolvedFormResponsiveGridPlacement {
  const resolved = resolvePhiResponsiveValue(value, fallback);
  return {
    compact: assertGridPlacement(resolved.compact, `${path}.compact`),
    medium: assertGridPlacement(resolved.medium, `${path}.medium`),
    wide: assertGridPlacement(resolved.wide, `${path}.wide`),
  };
}

export function resolvePhiFormLayout(
  layout?: PhiFormLayoutDescriptor,
): PhiResolvedFormLayout {
  const columns = resolvePhiResponsiveValue(
    layout?.columns,
    PHI_FORM_DEFAULT_LAYOUT.columns,
  );
  const labelGrid = resolvePhiFormResponsiveGridPlacement(
    layout?.labelGrid,
    PHI_FORM_DEFAULT_LAYOUT.labelGrid,
    "layout.labelGrid",
  );
  const controlGrid = resolvePhiFormResponsiveGridPlacement(
    layout?.controlGrid,
    PHI_FORM_DEFAULT_LAYOUT.controlGrid,
    "layout.controlGrid",
  );
  return {
    columns,
    gap: resolvePhiResponsiveValue(layout?.gap, PHI_FORM_DEFAULT_LAYOUT.gap),
    labelPlacement:
      layout?.labelPlacement ?? PHI_FORM_DEFAULT_LAYOUT.labelPlacement,
    labelAlign: layout?.labelAlign ?? PHI_FORM_DEFAULT_LAYOUT.labelAlign,
    labelGrid,
    controlGrid,
  };
}

export function resolvePhiFormFieldCellPlacement(
  layout: PhiResolvedFormLayout,
  placement?: PhiFormResponsiveGridPlacement,
) {
  const fallback = {
    compact: { span: PHI_FORM_GRID_COLUMNS / layout.columns.compact },
    medium: { span: PHI_FORM_GRID_COLUMNS / layout.columns.medium },
    wide: { span: PHI_FORM_GRID_COLUMNS / layout.columns.wide },
  };

  return resolvePhiFormResponsiveGridPlacement(
    placement,
    fallback,
    "field.placement.cell",
  );
}
