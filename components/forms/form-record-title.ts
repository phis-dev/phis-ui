import { resolvePhiFormText, type PhiFormTextDescriptor } from "@phis/contracts/forms";

import { isPhiRecord } from "../../helpers/is-record";
import { checkPhiRecordTitleTemplate, fillPhiRecordTitle } from "../../helpers/record-title";

/*
 * A dialog named by the record its Form reads ("Gallery: Private Cloud"), with no Controller and no second
 * read: after every read the Form announces `template` -- a Form text, translated, `%1` the value of
 * `field`, which is never translated -- on `recordTitle`, and the Page routes it to the Overlay's `title`.
 * No record, or no value, announces an empty title: the Overlay's own (FORMS.md, OVERLAYS.md).
 */

export type PhiFormWidgetTitleFromRecord = { template: PhiFormTextDescriptor; field: string };

/** The Form Widget output that carries the title: `change`, `string`. */
export const PHI_FORM_RECORD_TITLE_CAPABILITY = "recordTitle";

function readTemplate(value: unknown): PhiFormTextDescriptor {
  if (isPhiRecord(value) && value.kind === "literal" && typeof value.value === "string") {
    return { kind: "literal", value: value.value };
  }
  if (
    isPhiRecord(value) && (value.kind === "label" || value.kind === "config") &&
    typeof value.key === "string" && value.key.trim() && typeof value.fallback === "string"
  ) {
    return { kind: value.kind, key: value.key.trim(), fallback: value.fallback };
  }
  throw new Error(`Form titleFromRecord.template ${JSON.stringify(value)} is no Form text ({ kind: "label", key, fallback }).`);
}

/**
 * The placement's `titleFromRecord`, or null where it states none. Strict: no field, or a source text
 * without exactly one `%1`, is refused -- the translation is not there to read, so the fallback is.
 */
export function readPhiFormWidgetTitleFromRecord(value: unknown): PhiFormWidgetTitleFromRecord | null {
  if (value == null) return null;
  if (!isPhiRecord(value)) throw new Error(`Form titleFromRecord ${JSON.stringify(value)} is no { template, field }.`);
  const field = typeof value.field === "string" ? value.field.trim() : "";
  if (!field) throw new Error("Form titleFromRecord.field must name the record field the title takes its value from.");
  const template = readTemplate(value.template);
  const templateError = checkPhiRecordTitleTemplate(template.kind === "literal" ? template.value : template.fallback);
  if (templateError) throw new Error(`Form titleFromRecord.template ${templateError}`);
  return { template, field };
}

/** The title a record gives, in the reader's language, or "" without a record or a text or number there. */
export function resolvePhiFormRecordTitle(
  titleFromRecord: PhiFormWidgetTitleFromRecord,
  record: Readonly<Record<string, unknown>> | null,
  labels?: Readonly<Record<string, string>>,
  formConfig?: Readonly<Record<string, unknown>>,
): string {
  const value = record?.[titleFromRecord.field];
  return fillPhiRecordTitle(resolvePhiFormText(titleFromRecord.template, labels, formConfig), value);
}
