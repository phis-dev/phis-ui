import { isPhiRecord } from "../../helpers/is-record";
import {
  readPhiRuntimeConditionExpression,
  type PhiRuntimeConditionExpression,
} from "../../types/runtime-condition";
import type {
  PhiFormDescriptor,
  PhiFormFieldDescriptor,
  PhiFormLayoutDescriptor,
  PhiFormTextDescriptor,
} from "../../types/form-descriptor";
import type { PhiTableValueRenderer } from "../../types/table-widget";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "./form-provider-contract";

/**
 * The `list` field's config, read strictly (FORMS.md, "List values"): a value of the wrong kind is a
 * mistake in the descriptor and is said as one, never read as "not stated".
 *
 * The value is a list of objects, each entry edited in a dialog built from the field's `fields` -- the
 * entries' own descriptor fields (phis-contracts `PhiFormFieldDescriptor.fields`). The config says how the
 * list is drawn and bounded:
 *
 * - `columns`: which entry fields a row shows, in order -- each `{ field }`, the key of an entry field,
 *   titled with that field's label, and optionally `renderer`, how its value is drawn (the Table's
 *   renderers: `text`, `badge`, `tags`, `money`, `checkbox`, `code`, `date`, `datetime`). Left out, the
 *   renderer follows the field: `tags` for a field of several choices, `checkbox` for a yes/no field,
 *   `money` for an amount, the option's label for a field of one choice, the text otherwise;
 * - `addLabel`, `emptyLabel`, `editLabel`: Form texts (a label reference or a literal), else the Form's
 *   words under `PHI_FORM_LIST_LABEL_KEYS`;
 * - `minItems`, `maxItems`: whole numbers; Remove stops at the one, Add at the other;
 * - `reorderable`: entries are dragged into another order;
 * - `itemKeyField`: an entry field whose value no two entries share, refused in the dialog;
 * - `itemLabelField`: an entry field whose value is the edit dialog's title;
 * - `removeDisabledWhen` and `removeDisabledReason`: a condition on the entry (`source: "row"`) under
 *   which it cannot be removed, and the Form text its row says why -- an entry somebody else refers to;
 * - `entryLayout`: the Form Layout of the entry dialog's Form (`PhiFormLayoutDescriptor`); the dialog is as
 *   wide as that Form needs (`resolvePhiDialogFormGeometry`).
 */
export type PhiFormListFieldColumn = {
  field: PhiFormFieldDescriptor;
  renderer: PhiTableValueRenderer;
};

export type PhiFormListFieldConfig = {
  columns: readonly PhiFormListFieldColumn[];
  addLabel?: PhiFormTextDescriptor;
  emptyLabel?: PhiFormTextDescriptor;
  editLabel?: PhiFormTextDescriptor;
  minItems: number;
  maxItems: number;
  reorderable: boolean;
  itemKeyField?: string;
  itemLabelField?: string;
  removeDisabledWhen?: PhiRuntimeConditionExpression;
  removeDisabledReason?: PhiFormTextDescriptor;
  entryLayout?: PhiFormLayoutDescriptor;
};

const PHI_FORM_LIST_COLUMN_RENDERERS: ReadonlySet<PhiTableValueRenderer> = new Set<PhiTableValueRenderer>([
  "text", "badge", "tags", "money", "checkbox", "code", "date", "datetime",
]);

const CONFIG_KEYS = new Set([
  "columns", "addLabel", "emptyLabel", "editLabel", "minItems", "maxItems", "reorderable", "itemKeyField",
  "itemLabelField", "removeDisabledWhen", "removeDisabledReason", "entryLayout",
]);

const SEVERAL_CHOICE_FIELD_PROVIDER_KEYS: ReadonlySet<string> = new Set([
  PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
  PHI_FORM_FIELD_PROVIDER_KEYS.checkboxGroup,
]);
const YES_NO_FIELD_PROVIDER_KEYS: ReadonlySet<string> = new Set([
  PHI_FORM_FIELD_PROVIDER_KEYS.switch,
  PHI_FORM_FIELD_PROVIDER_KEYS.checkbox,
]);

function readFormText(value: unknown, at: string): PhiFormTextDescriptor | undefined {
  if (value === undefined) return undefined;
  if (isPhiRecord(value)) {
    if (value.kind === "literal" && typeof value.value === "string") return { kind: "literal", value: value.value };
    if ((value.kind === "label" || value.kind === "config") && typeof value.key === "string" && value.key &&
      typeof value.fallback === "string") {
      return { kind: value.kind, key: value.key, fallback: value.fallback };
    }
  }
  throw new Error(`${at} must be a Form text: a label reference or a literal, never a plain string.`);
}

function readCount(value: unknown, at: string, fallback: number) {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${at} must be a whole number of entries, 0 or more.`);
  }
  return value;
}

function readEntryFieldKey(value: unknown, at: string, entryKeys: ReadonlySet<string>) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !entryKeys.has(value)) {
    throw new Error(`${at} must name one of the entry fields (${[...entryKeys].join(", ")}).`);
  }
  return value;
}

/** How a column draws its field where the column says nothing: by what the field holds. */
function resolvePhiFormListColumnRenderer(field: PhiFormFieldDescriptor): PhiTableValueRenderer {
  if (SEVERAL_CHOICE_FIELD_PROVIDER_KEYS.has(field.fieldProviderKey)) return "tags";
  if (YES_NO_FIELD_PROVIDER_KEYS.has(field.fieldProviderKey)) return "checkbox";
  if (field.fieldProviderKey === PHI_FORM_FIELD_PROVIDER_KEYS.money) return "money";
  return "text";
}

export function readPhiFormListFieldConfig(field: Pick<PhiFormFieldDescriptor, "key" | "fields" | "config">): PhiFormListFieldConfig {
  const where = `The list field "${field.key}"`;
  const entryFields = field.fields ?? [];
  if (entryFields.length === 0) {
    throw new Error(`${where} has no entry fields: its entries are edited from \`fields\`.`);
  }
  const entryKeys = new Set(entryFields.map((entry) => entry.key));
  const config = field.config ?? {};
  if (!isPhiRecord(config)) throw new Error(`${where} has a config that is not an object.`);
  for (const key of Object.keys(config)) {
    if (!CONFIG_KEYS.has(key)) throw new Error(`${where} states \`${key}\`, which a list field does not read.`);
  }
  if (!Array.isArray(config.columns) || config.columns.length === 0) {
    throw new Error(`${where} must name the entry fields its rows show in \`columns\`.`);
  }
  const columns = config.columns.map((entry, index): PhiFormListFieldColumn => {
    const at = `${where}'s column ${index + 1}`;
    if (!isPhiRecord(entry)) throw new Error(`${at} must be an object { field, renderer? }.`);
    const key = readEntryFieldKey(entry.field, `${at}'s \`field\``, entryKeys);
    const column = entryFields.find((candidate) => candidate.key === key)!;
    if (entry.renderer !== undefined &&
      (typeof entry.renderer !== "string" || !PHI_FORM_LIST_COLUMN_RENDERERS.has(entry.renderer as PhiTableValueRenderer))) {
      throw new Error(`${at}'s \`renderer\` must be one of ${[...PHI_FORM_LIST_COLUMN_RENDERERS].join(", ")}.`);
    }
    return { field: column, renderer: (entry.renderer as PhiTableValueRenderer | undefined) ?? resolvePhiFormListColumnRenderer(column) };
  });
  const minItems = readCount(config.minItems, `${where}'s \`minItems\``, 0);
  const maxItems = readCount(config.maxItems, `${where}'s \`maxItems\``, Number.MAX_SAFE_INTEGER);
  if (maxItems < minItems) throw new Error(`${where} allows fewer entries (\`maxItems\`) than it requires (\`minItems\`).`);
  if (config.reorderable !== undefined && typeof config.reorderable !== "boolean") {
    throw new Error(`${where}'s \`reorderable\` must be true or false.`);
  }
  const removeDisabledWhen = config.removeDisabledWhen === undefined
    ? undefined
    : readPhiRuntimeConditionExpression(config.removeDisabledWhen) ?? (() => {
      throw new Error(`${where}'s \`removeDisabledWhen\` is not a condition.`);
    })();
  const removeDisabledReason = readFormText(config.removeDisabledReason, `${where}'s \`removeDisabledReason\``);
  if ((removeDisabledWhen === undefined) !== (removeDisabledReason === undefined)) {
    throw new Error(`${where} states \`removeDisabledWhen\` and \`removeDisabledReason\` together or neither.`);
  }
  if (config.entryLayout !== undefined && !isPhiRecord(config.entryLayout)) {
    throw new Error(`${where}'s \`entryLayout\` must be a Form Layout.`);
  }
  return {
    columns,
    ...optional("addLabel", readFormText(config.addLabel, `${where}'s \`addLabel\``)),
    ...optional("emptyLabel", readFormText(config.emptyLabel, `${where}'s \`emptyLabel\``)),
    ...optional("editLabel", readFormText(config.editLabel, `${where}'s \`editLabel\``)),
    minItems,
    maxItems,
    reorderable: config.reorderable === true,
    ...optional("itemKeyField", readEntryFieldKey(config.itemKeyField, `${where}'s \`itemKeyField\``, entryKeys)),
    ...optional("itemLabelField", readEntryFieldKey(config.itemLabelField, `${where}'s \`itemLabelField\``, entryKeys)),
    ...optional("removeDisabledWhen", removeDisabledWhen),
    ...optional("removeDisabledReason", removeDisabledReason),
    ...optional("entryLayout", config.entryLayout as PhiFormLayoutDescriptor | undefined),
  };
}

function optional<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: V };
}

/**
 * The Form the entry dialog draws: the list field's entry fields on the entry Layout, one Form of its own
 * keyed under the list field, so its fields' ids never meet the outer Form's.
 */
export function buildPhiFormListEntryDescriptor(
  field: Pick<PhiFormFieldDescriptor, "key" | "fields">,
  config: Pick<PhiFormListFieldConfig, "entryLayout">,
): PhiFormDescriptor {
  return {
    schemaVersion: 1,
    key: `${field.key}.entry`,
    fields: field.fields ?? [],
    ...(config.entryLayout ? { layout: config.entryLayout } : {}),
  };
}

/**
 * An entry as the dialog's Form hands it back, laid over the entry it edits: what the Form submitted for
 * its fields, and every other value of the entry as it was -- an id, a mark the Form does not show. An
 * entry field the Form did not submit (hidden by its condition) is left out, as the outer Form leaves out
 * its own hidden fields.
 */
export function mergePhiFormListEntry(
  fields: readonly PhiFormFieldDescriptor[],
  entry: Readonly<Record<string, unknown>>,
  submitted: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const declared = new Set(fields.map((field) => field.key));
  const kept = Object.fromEntries(Object.entries(entry).filter(([key]) => !declared.has(key)));
  return { ...kept, ...submitted };
}

/** Whether another entry than the one at `index` already holds `value` in `key` (`itemKeyField`). */
export function isPhiFormListKeyTaken(
  entries: readonly Readonly<Record<string, unknown>>[],
  key: string,
  value: unknown,
  index: number | null,
) {
  if (value == null || value === "") return false;
  return entries.some((entry, entryIndex) => entryIndex !== index && entry[key] === value);
}

/** The entries of a list value: its objects, each a copy; anything else is no entry. */
export function readPhiFormListEntries(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => isPhiRecord(entry)).map((entry) => ({ ...entry }))
    : [];
}
