import type { PhiRecordWidgetConfig } from "../types/record-widget";
import type { PhiTableProviderResourceDescriptor } from "../types/table-widget";

/*
 * Checked where a config is made, as the Table's binding is (`helpers/table-widget-binding.ts`): a
 * package's preset tests (`checkPhiPresetTables`), `pnpm verify` and the Builder's save, never in the
 * browser, so the record Widget's live Client trusts its actions.
 */

/**
 * What the record Widget's actions ask of its resource, as findings --
 * the Table's binding check (`validatePhiTableWidgetBinding`) for the one scope a record has. Each action
 * is the resource's, of scope `row`, named once, and drawn as the danger a destructive one is. A
 * confirmation the resource requires is not asked for here: the record on screen, named in the dialog's
 * title, and the press beside it are that confirmation, and a `confirm` would ask a second time.
 */
export function validatePhiRecordWidgetBinding(
  config: Partial<Pick<PhiRecordWidgetConfig, "actions">>,
  resource: Pick<PhiTableProviderResourceDescriptor, "resourceKey" | "actions">,
): string[] {
  const errors: string[] = [];
  const declared = new Map(resource.actions?.map((action) => [action.key, action]) ?? []);
  const seen = new Set<string>();
  for (const action of config.actions ?? []) {
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
