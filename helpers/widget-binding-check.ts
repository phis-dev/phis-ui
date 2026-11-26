import { PhiCmsWidgetType } from "../constants/cms-widget-types";
import { isPhiIconNameKnown } from "../components/shell/phi-icon-names";
import type { PhiCmsConfigField } from "../types/cms-plugins";
import type { PhiRecordWidgetConfig } from "../types/record-widget";
import type { PhiTableProviderResourceDescriptor, PhiTableWidgetConfig } from "../types/table-widget";
import type { PhiTreeProviderResourceDescriptor } from "../types/tree-widget";
import { readPhiDotPath } from "./dot-path";
import { isPhiRecord } from "./is-record";
import { validatePhiRecordWidgetBinding } from "./record-widget-binding";
import { validatePhiTableWidgetBinding } from "./table-widget-binding";
import { validatePhiTreeWidgetBinding, type PhiTreeWidgetBindingConfig } from "./tree-widget-binding";

/*
 * A bound Widget's config against what its Provider declares, and the icons a config names, checked where
 * a config is made (owner, 2026-11-24): a package's preset tests (`checkPhiPresetTables`), `pnpm verify`,
 * and the Builder's save (`gateway/site-cms-write-validation.ts`), which refuses what these find. Never in
 * the browser and never in the render of a request: a live Table, Tree or record Widget trusts the config
 * it is handed, so nothing here is in a live Client graph.
 */

/** A data Provider as its Module declares it: the key a Widget binds to and the resources it offers. */
export type PhiBindingCheckProvider = {
  key: string;
  kind?: string;
  resources?: readonly unknown[];
};

function findResource<T extends { resourceKey: string }>(
  provider: PhiBindingCheckProvider,
  resourceKey: unknown,
): T | undefined {
  return (provider.resources as readonly T[] | undefined)?.find((candidate) => candidate.resourceKey === resourceKey);
}

function readSource(config: Readonly<Record<string, unknown>>) {
  const source = config.source;
  return isPhiRecord(source) && typeof source.providerKey === "string" ? source : null;
}

/** The icons a Table's actions, binding tools and column headings draw: those shown with an icon, named and unknown. */
function checkTableIcons(config: PhiTableWidgetConfig): string[] {
  const findings: string[] = [];
  const actions = [
    ...(config.features?.actions?.toolbar ?? []),
    ...(config.features?.actions?.row ?? []),
    ...(config.features?.actions?.bulk ?? []),
  ];
  for (const action of actions) {
    if (action.display !== "label" && action.icon && !isPhiIconNameKnown(action.icon.trim())) {
      findings.push(`Table action "${action.key}" names the icon "${action.icon}", which PhiIcon does not know.`);
    }
  }
  for (const tool of config.features?.tools?.bindingFields ?? []) {
    if (tool.create?.display !== "label" && tool.create?.icon && !isPhiIconNameKnown(tool.create.icon.trim())) {
      findings.push(`Table binding field "${tool.key}" names the create icon "${tool.create.icon}", which PhiIcon does not know.`);
    }
  }
  // A heading that is its icon alone (`titleDisplay: "icon"`) is nothing where the icon is unknown.
  for (const column of config.presentation?.columns ?? []) {
    if (column.titleIcon && !isPhiIconNameKnown(column.titleIcon.trim())) {
      findings.push(`Table column "${column.key}" names the title icon "${column.titleIcon}", which PhiIcon does not know.`);
    }
  }
  return findings;
}

/**
 * What a Table, a Tree or a record Widget's config breaks of the resource it is bound to, as messages; an
 * empty list for any other Widget, for one without a source, and for one bound to a Provider not among
 * `providers` -- a Provider whose Module is not there is the Area's state, not the config's. `config` is
 * the config the Widget reads: a preset's as it states it, or what the Widget's own `parseConfig` made
 * of a stored one.
 */
export function checkPhiWidgetBinding(
  widgetType: string,
  config: Readonly<Record<string, unknown>>,
  providers: ReadonlyMap<string, PhiBindingCheckProvider>,
): string[] {
  if (
    widgetType !== PhiCmsWidgetType.Table &&
    widgetType !== PhiCmsWidgetType.Tree &&
    widgetType !== PhiCmsWidgetType.Record
  ) {
    return [];
  }
  const source = readSource(config);
  const provider = source ? providers.get(source.providerKey as string) : undefined;
  if (!source || !provider) return [];
  const kind = widgetType === PhiCmsWidgetType.Table ? "Table" : widgetType === PhiCmsWidgetType.Tree ? "Tree" : "Record";
  const missing = `${kind} is bound to resource "${String(source.resourceKey)}", which "${provider.key}" does not declare.`;
  if (widgetType === PhiCmsWidgetType.Tree) {
    const resource = findResource<PhiTreeProviderResourceDescriptor>(provider, source.resourceKey);
    return resource ? validatePhiTreeWidgetBinding(config as PhiTreeWidgetBindingConfig, resource) : [missing];
  }
  const resource = findResource<PhiTableProviderResourceDescriptor>(provider, source.resourceKey);
  if (!resource) return [missing];
  if (widgetType === PhiCmsWidgetType.Record) {
    return validatePhiRecordWidgetBinding(config as Partial<PhiRecordWidgetConfig>, resource);
  }
  const table = config as unknown as PhiTableWidgetConfig;
  return [...validatePhiTableWidgetBinding(table, resource), ...checkTableIcons(table)];
}

function checkFieldIcons(fields: readonly PhiCmsConfigField[], value: unknown, where: string, findings: string[]) {
  for (const field of fields) {
    const fieldValue = readPhiDotPath(value, field.key);
    if (field.type === "icon") {
      const name = typeof fieldValue === "string" ? fieldValue.trim() : "";
      if (name && !isPhiIconNameKnown(name)) {
        findings.push(`${where}${field.key} names the icon "${name}", which PhiIcon does not know.`);
      }
    } else if (field.type === "collection" && Array.isArray(fieldValue)) {
      fieldValue.forEach((item, index) => checkFieldIcons(field.itemFields, item, `${where}${field.key}[${index}].`, findings));
    }
  }
}

/**
 * Every icon a Widget's config names in a field its Inspector offers as an icon (`type: "icon"`, in a
 * collection's entries too) that `PhiIcon` does not know: a Button's, a Collection View action's, a
 * Card's. A live Widget no longer looks a name up before it draws it, so an unknown one is refused where
 * the author chose it, by the Builder's save.
 */
export function checkPhiWidgetConfigIcons(
  fields: readonly PhiCmsConfigField[] | undefined,
  config: Readonly<Record<string, unknown>>,
): string[] {
  const findings: string[] = [];
  checkFieldIcons(fields ?? [], config, "", findings);
  return findings;
}
