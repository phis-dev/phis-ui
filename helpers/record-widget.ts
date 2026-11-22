import type {
  PhiRecordWidgetConfig,
  PhiRecordWidgetTitleFromRecord,
} from "../types/record-widget";
import type { PhiTableProviderResourceDescriptor } from "../types/table-widget";
import { isPhiRecord } from "./is-record";
import { checkPhiRecordTitleTemplate } from "./record-title";

/*
 * The record Widget's two readers that the descriptor compiler and the Widget share: its title from the
 * record and its actions against the resource (TABLES.md, "The record Widget"). Apart from
 * `types/record-widget.ts`, so the type stays a type for everything that only names it.
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

/**
 * What the record Widget's actions ask of its resource, as the errors it shows instead of the record --
 * the Table's binding check (`validatePhiTableWidgetBinding`) for the one scope a record has. Each action
 * is the resource's, of scope `row`, named once, and drawn as the danger a destructive one is. A
 * confirmation the resource requires is not asked for here: the record on screen, named in the dialog's
 * title, and the press beside it are that confirmation, and a `confirm` would ask a second time.
 */
export function validatePhiRecordWidgetBinding(
  config: Pick<PhiRecordWidgetConfig, "actions">,
  resource: Pick<PhiTableProviderResourceDescriptor, "resourceKey" | "actions">,
): string[] {
  const errors: string[] = [];
  const declared = new Map(resource.actions?.map((action) => [action.key, action]) ?? []);
  const seen = new Set<string>();
  for (const action of config.actions) {
    if (seen.has(action.key)) {
      errors.push(`Record action "${action.key}" is configured more than once.`);
      continue;
    }
    seen.add(action.key);
    const capability = declared.get(action.key);
    if (!capability) {
      errors.push(`Record action "${action.key}" is not declared by resource "${resource.resourceKey}".`);
    } else if (capability.scope !== "row") {
      errors.push(`Record action "${action.key}" cannot run on a record: its scope is "${capability.scope}".`);
    } else if (capability.intent === "destructive" && action.mode !== "danger") {
      errors.push(`Destructive Record action "${action.key}" requires danger presentation.`);
    }
  }
  return errors;
}
