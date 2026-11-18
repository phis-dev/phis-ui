import type { PhiRecordFieldDescriptor, PhiRecordFieldKind } from "../../../../types/record-provider";

/** The value the "None" entry stands under: a Widget bound to no field shows its own content. */
export const PHI_INSPECTOR_RECORD_FIELD_NONE = "";

/**
 * The entries of a record-field select: "None" first, then the fields of the page's record a Widget of
 * these kinds can draw.
 *
 * "None" is an entry rather than an empty select, because it is a choice with a meaning -- the Widget
 * shows what it holds itself -- and an empty box with a placeholder read as a setting nobody had made.
 */
export function buildPhiInspectorRecordFieldOptions(
  kinds: readonly PhiRecordFieldKind[],
  fields: readonly PhiRecordFieldDescriptor[],
  noneLabel: string,
) {
  return [
    { value: PHI_INSPECTOR_RECORD_FIELD_NONE, label: noneLabel },
    ...fields
      .filter((field) => kinds.includes(field.kind))
      .map((field) => ({ value: field.key, label: field.label, ...(field.description ? { description: field.description } : {}) })),
  ];
}

/** The stored key for a select value: "None" stores nothing. */
export function readPhiInspectorRecordFieldChoice(value: unknown): string | undefined {
  return typeof value === "string" && value !== PHI_INSPECTOR_RECORD_FIELD_NONE ? value : undefined;
}
