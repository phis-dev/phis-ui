import type { PhiTreeProviderResourceDescriptor, PhiTreeWidgetConfig } from "../types/tree-widget";

/**
 * The parts of a Tree's config its binding reads. A preset states its config as the Tree reads it and
 * may leave out what it does not use, so every part is optional here; a parsed config is one too.
 */
export type PhiTreeWidgetBindingConfig = {
  presentation?: Partial<Pick<PhiTreeWidgetConfig["presentation"], "node">>;
  features?: Partial<PhiTreeWidgetConfig["features"]>;
};

/**
 * A Tree's config against the resource its Provider declares: the node fields it shows and edits, its
 * binding tools, search, every Provider action in its scope with the confirmation the resource asks for,
 * and drag and drop (TREES.md).
 *
 * Checked where a config is made, as the Table's is (`helpers/table-widget-binding.ts`): a package's
 * preset tests (`checkPhiPresetTables`), `pnpm verify` and the Builder's save, never in the browser or
 * the render of a request. A live Tree trusts the config it is handed.
 */
export function validatePhiTreeWidgetBinding(
  config: PhiTreeWidgetBindingConfig,
  resource: PhiTreeProviderResourceDescriptor,
): string[] {
  const errors: string[] = [];
  const node = config.presentation?.node;
  const features = config.features ?? {};
  const fieldKeys = new Set(resource.fields.map((field) => field.key));
  for (const key of [
    node?.titleFieldKey,
    node?.descriptionFieldKey,
    node?.iconFieldKey,
  ].filter((value): value is string => Boolean(value))) {
    if (!fieldKeys.has(key)) errors.push(`Tree presentation references undeclared field "${key}".`);
  }
  for (const tool of features.tools?.bindingFields ?? []) {
    if (!resource.bindingFields?.some((field) => field.key === tool.key)) {
      errors.push(`Tree binding tool references undeclared field "${tool.key}".`);
    }
  }
  if (features.search?.enabled && !resource.query.search) {
    errors.push("Tree search requires Provider query search capability.");
  }
  if (features.editing?.enabled) {
    for (const key of [
      node?.titleEditor?.enabled ? node.titleFieldKey : null,
      node?.iconEditor?.enabled ? node.iconFieldKey : null,
    ].filter((value): value is string => Boolean(value))) {
      if (!resource.fields.find((field) => field.key === key)?.mutable) {
        errors.push(`Tree editor requires mutable Provider field "${key}".`);
      }
    }
  }
  const providerActions = new Map(resource.actions?.map((action) => [action.key, action]) ?? []);
  for (const [scope, actions] of [
    ["resource", features.actions?.toolbar ?? []],
    ["node", features.actions?.node ?? []],
    ["selection", features.actions?.selection ?? []],
  ] as const) {
    for (const action of actions) {
      const capability = providerActions.get(action.key);
      if (action.execution === "provider" && !capability) {
        errors.push(`Tree action references undeclared Provider capability "${action.key}".`);
      } else if (action.execution === "provider" && capability?.scope !== scope) {
        errors.push(`Tree action "${action.key}" requires Provider scope "${scope}".`);
      } else if (action.execution === "provider" && capability?.confirmation === "required" && !action.confirm) {
        errors.push(`Tree action "${action.key}" requires confirmation presentation.`);
      }
    }
  }
  const dndMode = features.dnd?.mode ?? "none";
  if ((dndMode === "source" || dndMode === "source-reorder") && !resource.dragSources?.length) {
    errors.push("Tree source DnD requires a declared Provider drag source.");
  }
  const payloadType = features.dnd?.payloadType;
  if (payloadType && !resource.dragSources?.some((source) => source.payloadType === payloadType)) {
    errors.push(`Tree DnD references undeclared payload type "${payloadType}".`);
  }
  if ((dndMode === "reorder" || dndMode === "source-reorder") && resource.nodeOrdering !== "tree") {
    errors.push("Tree reorder DnD requires Provider nodeOrdering \"tree\".");
  }
  return errors;
}
