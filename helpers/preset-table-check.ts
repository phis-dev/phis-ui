import { PhiCmsWidgetType } from "../constants/cms-widget-types";
import type { PhiResolvedCmsPageTree } from "../types/cms";
import type { PhiTableWidgetConfig } from "../types/table-widget";
import type { PhiPresetTreeContractFinding } from "./preset-tree-contract-check";
import type { PhiRuntimeModuleDefinition } from "../types/cms-plugins";
import { validatePhiTableWidgetBinding } from "./table-widget-binding";
import { checkPhiWidgetBinding, type PhiBindingCheckProvider } from "./widget-binding-check";

/**
 * Every bound Widget of a preset tree -- Table, Tree and record Widget -- read against the resource its
 * Provider declares (THIRD_PARTY_MODULES.md, "Checking a Page preset"), by the same check the Builder's
 * save runs (`checkPhiWidgetBinding`): a Table's columns, filters, sorting, counted footer and actions
 * (`validatePhiTableWidgetBinding`) and every icon its actions and binding tools name
 * (`isPhiIconNameKnown`), a Tree's node fields, tools, actions and drag and drop
 * (`validatePhiTreeWidgetBinding`), a record Widget's actions (`validatePhiRecordWidgetBinding`). And one
 * rule of the house: a Table that shows its header row ends in its footer (`presentation.footer`, the
 * count or paging line), and a Table without a header -- one that only lays out rows or aligns columns --
 * needs none (TABLES.md, "Footer and summary"); the rare Table with a header and nothing to count says why
 * in `footerOmitted`. New Pages kept leaving the footer out, and nothing but a reader missing the count
 * noticed.
 *
 * Nothing in the browser checks a binding (owner, 2026-11-24): a live Widget trusts the config it is
 * handed, so a binding that does not hold is a Widget that draws the wrong thing, and this check is where
 * it is caught. A package runs it in its own tests over every tree its presets build, beside
 * `checkPhiPresetTreeContract`, with every data Provider it ships (`dataProviders`: its Module's Provider
 * descriptors, Table and Tree alike). A Widget on a Provider not handed over is not judged.
 *
 * Verify-time only, and apart from the contract check on purpose: that one also runs while a Site serves
 * a Page, which must not pay for checks that belong where the config is made.
 */
export function checkPhiPresetTables(
  tree: PhiResolvedCmsPageTree,
  options: { dataProviders: Iterable<PhiBindingCheckProvider> },
): PhiPresetTreeContractFinding[] {
  const findings: PhiPresetTreeContractFinding[] = [];
  const providers = new Map([...options.dataProviders].map((provider) => [provider.key, provider]));
  for (const widget of tree.contentWidgets) {
    // The config as the preset wrote it, which is what the Widget receives: a preset states the whole shape.
    const bindingFindings = checkPhiWidgetBinding(widget.widgetType, widget.config, providers);
    for (const message of bindingFindings) findings.push({ node: widget.id, message });
    if (widget.widgetType !== PhiCmsWidgetType.Table) continue;
    const config = widget.config as unknown as PhiTableWidgetConfig;
    const provider = config.source?.providerKey ? providers.get(config.source.providerKey) : undefined;
    const declared = provider?.resources?.some((candidate) =>
      (candidate as { resourceKey?: unknown }).resourceKey === config.source?.resourceKey);
    if (!declared) continue;
    const footerOmitted = config.presentation?.footerOmitted?.trim();
    if (config.presentation?.footer && footerOmitted) {
      findings.push({ node: widget.id, message: "Table states a footer and `footerOmitted` beside it; a reason for leaving the footer out is for a Table without one." });
    } else if (config.presentation?.header !== false && !config.presentation?.footer && !footerOmitted) {
      findings.push({ node: widget.id, message: "Table shows a header and no footer: a Table with a header row ends in `presentation.footer` (TABLES.md, \"Footer and summary\"); one that only lays out rows says `header: false`, and one with a header and nothing to count says why in `footerOmitted`." });
    }
  }
  return findings;
}

const hasStaticOptions = (field: { options?: readonly unknown[]; optionsProvider?: unknown }) =>
  (field.options?.length ?? 0) > 0 && !field.optionsProvider;

/**
 * Every Table a Module offers to Markdown (TABLES.md, "Tables in Markdown"), checked as a Preset's Table is
 * above: its columns against its resource, and what makes it an embed -- no editor; pinned filters and
 * parameters naming a filter field or binding field of the resource, with values a parameter can check;
 * `maxRows` on a resource that pages; each required binding field fixed or settable. The catalog refuses
 * the key, Provider, resource and access policy itself; this half needs the Table's own code, so it runs
 * where Preset Tables are checked: a package's tests, and `validate-module-descriptors` here.
 */
export function checkPhiEmbeddableTables(
  definition: Pick<PhiRuntimeModuleDefinition, "embeddableTables" | "dataProviders">,
): PhiPresetTreeContractFinding[] {
  const findings: PhiPresetTreeContractFinding[] = [];
  for (const embed of definition.embeddableTables ?? []) {
    const report = (message: string) => findings.push({ node: embed.key, message });
    const provider = definition.dataProviders?.find((candidate) => candidate.key === embed.source.providerKey);
    const resource = provider?.kind === "table"
      ? provider.resources.find((candidate) => candidate.resourceKey === embed.source.resourceKey)
      : undefined;
    if (!resource) {
      report("reads a resource no table Provider of this Module declares.");
      continue;
    }
    const { query, bindingFields = [], fields } = resource;
    const pager = embed.maxRows || query.pagination === "none" ? { pagination: { enabled: false } } : {};
    const config = { presentation: embed.presentation, features: pager, source: embed.source } as PhiTableWidgetConfig;
    validatePhiTableWidgetBinding(config, resource).forEach(report);
    if (!embed.title?.trim()) report("needs a title.");
    if (embed.presentation.columns.some((column) => column.editor)) report("has a column editor; an embedded Table is read-only.");
    const filterFields = new Set(query.filterFields ?? []);
    for (const key of Object.keys(embed.fixedFilters ?? {})) {
      if (!filterFields.has(key)) report(`pins "${key}", which is no filter field of the resource.`);
    }
    if (embed.maxRows !== undefined && (!Number.isInteger(embed.maxRows) || embed.maxRows < 1 || embed.maxRows > 100)) {
      report("needs maxRows from 1 to 100.");
    } else if (embed.maxRows !== undefined && query.pagination !== "offset" && query.pagination !== "cursor") {
      report("has maxRows, which needs a resource that pages.");
    }
    const params = Object.entries(embed.params ?? {});
    const fixed = (key: string) => Object.hasOwn(embed.source.params ?? {}, key);
    for (const field of bindingFields) {
      if (field.required && field.defaultValue === undefined && !fixed(field.key) &&
        !params.some(([, param]) => "binding" in param && param.binding === field.key)) {
        report(`leaves the required binding field "${field.key}" open.`);
      }
    }
    const targets = new Set<string>();
    for (const [name, param] of params) {
      const key = "binding" in param ? param.binding : param.filter;
      const field = "binding" in param ? bindingFields.find((candidate) => candidate.key === key) : fields.find((candidate) => candidate.key === key);
      const problem = !/^[A-Za-z][A-Za-z0-9_-]*$/u.test(name) ? "is no parameter name"
        : targets.has(`${"binding" in param}:${key}`) ? "sets what another parameter sets"
        : !field || ("filter" in param && !filterFields.has(key)) ? `names "${key}", which the resource does not declare for this`
        : "binding" in param ? fixed(key) ? `binds "${key}", which the source fixes` : null
        : Object.hasOwn(embed.fixedFilters ?? {}, key) ? `filters by "${key}", which a fixed filter pins`
        : !["string", "number", "boolean", "enum"].includes(field.type) ? `filters by a ${field.type} field`
        : null;
      targets.add(`${"binding" in param}:${key}`);
      if (problem) report(`parameter "${name}" ${problem}.`);
      else if (field?.type === "enum" && !hasStaticOptions(field)) report(`parameter "${name}" needs choices it can check, not a Provider's.`);
    }
  }
  return findings;
}
