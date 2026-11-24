import type { PhiRecordWidgetTitleFromRecord } from "../types/record-widget";
import { isPhiRecord } from "./is-record";
import { checkPhiRecordTitleTemplate } from "./record-title";

/*
 * The record Widget's reader that the descriptor compiler and the Widget share: its title from the
 * record (TABLES.md, "The record Widget"). Apart from `types/record-widget.ts`, so the type stays a type
 * for everything that only names it. Its actions against the resource are checked where a config is
 * made (`helpers/record-widget-binding.ts`), not here.
 */

/**
 * The placement's `titleFromRecord`, or null where it states none. Strict, as the Form's: no field, or a
 * sentence without exactly one `%1`, is refused rather than read as no title.
 */
export function readPhiRecordWidgetTitleFromRecord(value: unknown): PhiRecordWidgetTitleFromRecord | null {
  if (value == null) return null;
  if (!isPhiRecord(value)) throw new Error(`Record titleFromRecord ${JSON.stringify(value)} is no { template, field }.`);
  const field = typeof value.field === "string" ? value.field.trim() : "";
  if (!field) throw new Error("Record titleFromRecord.field must name the record field the title takes its value from.");
  const template = typeof value.template === "string" ? value.template.trim() : "";
  if (!template) throw new Error("Record titleFromRecord.template must be the sentence the title is made of.");
  const templateError = checkPhiRecordTitleTemplate(template);
  if (templateError) throw new Error(`Record titleFromRecord.template ${templateError}`);
  return { template, field };
}
