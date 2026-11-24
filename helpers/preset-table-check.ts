import { PhiCmsWidgetType } from "../constants/cms-widget-types";
import { isPhiIconNameKnown } from "../components/shell/phi-icon-names";
import type { PhiResolvedCmsPageTree } from "../types/cms";
import {
  validatePhiTableWidgetBinding,
  type PhiTableProviderResourceDescriptor,
  type PhiTableWidgetConfig,
} from "../types/table-widget";
import type { PhiPresetTreeContractFinding } from "./preset-tree-contract-check";
import type { PhiRuntimeModuleDefinition } from "../types/cms-plugins";

/**
 * Every Table of a preset tree, read as the Table reads itself in the browser before its first request
 * (THIRD_PARTY_MODULES.md, "Checking a Page preset"): its binding to its Provider's resource
 * (`validatePhiTableWidgetBinding`) and every icon its actions and binding tools name (`isPhiIconNameKnown`).
 * And one rule of the house the browser does not enforce: a Table that shows its header row ends in its
 * footer (`presentation.footer`, the count or paging line), and a Table without a header -- one that only
 * lays out rows or aligns columns -- needs none (TABLES.md, "Footer and summary"); the rare Table with a
 * header and nothing to count says why in `footerOmitted`. New Pages kept leaving the footer out, and
 * nothing but a reader missing the count noticed.
 *
 * In the browser a finding leaves the Widget unavailable -- no table at all, only a console warning --
 * while the Page around it renders, so nobody sees it until somebody misses the table. A package runs this
 * in its own tests over every tree its presets build, beside `checkPhiPresetTreeContract`, with every Table
 * Provider it ships. A Table on a Provider not handed over is not judged.
 *
 * Verify-time only, and apart from the contract check on purpose: that one also runs while a Site serves
 * a Page, where an unavailable Table stays one Widget and must not become a 500 for the whole Page.
 */
export function checkPhiPresetTables(
  tree: PhiResolvedCmsPageTree,
  options: { dataProviders: Iterable<PresetTreeTableProvider> },
): PhiPresetTreeContractFinding[] {
  const findings: PhiPresetTreeContractFinding[] = [];
  checkTables(tree, options.dataProviders, (node, message) => findings.push({ node, message }));
  return findings;
}

type Report = (node: string, message: string) => void;

/** A Table Provider as a package declares it: its key and the resources a Table binds to. */
export type PresetTreeTableProvider = { key: string; resources?: readonly PhiTableProviderResourceDescriptor[] };

function checkTables(tree: PhiResolvedCmsPageTree, dataProviders: Iterable<PresetTreeTableProvider>, report: Report) {
  const providers = new Map([...dataProviders].map((provider) => [provider.key, provider]));
  for (const widget of tree.contentWidgets) {
    if (widget.widgetType !== PhiCmsWidgetType.Table) continue;
    // The config as the preset wrote it, which is what the Table receives: a preset states the whole shape.
    const config = widget.config as unknown as PhiTableWidgetConfig;
    const source = config.source;
    const provider = source?.providerKey ? providers.get(source.providerKey) : undefined;
    if (!source || !provider) continue;
    const resource = provider.resources?.find((candidate) => candidate.resourceKey === source.resourceKey);
    if (!resource) {
      report(widget.id, `Table is bound to resource "${source.resourceKey}", which "${provider.key}" does not declare.`);
      continue;
    }
    for (const error of validatePhiTableWidgetBinding(config, resource)) report(widget.id, error);
    const footerOmitted = config.presentation?.footerOmitted?.trim();
    if (config.presentation?.footer && footerOmitted) {
      report(widget.id, "Table states a footer and `footerOmitted` beside it; a reason for leaving the footer out is for a Table without one.");
    } else if (config.presentation?.header !== false && !config.presentation?.footer && !footerOmitted) {
      report(widget.id, "Table shows a header and no footer: a Table with a header row ends in `presentation.footer` (TABLES.md, \"Footer and summary\"); one that only lays out rows says `header: false`, and one with a header and nothing to count says why in `footerOmitted`.");
    }
    const actions = [
      ...(config.features?.actions?.toolbar ?? []),
      ...(config.features?.actions?.row ?? []),
      ...(config.features?.actions?.bulk ?? []),
    ];
    for (const action of actions) {
      if (action.display !== "label" && action.icon && !isPhiIconNameKnown(action.icon.trim())) {
        report(widget.id, `Table action "${action.key}" names the icon "${action.icon}", which PhiIcon does not know.`);
      }
    }
    for (const tool of config.features?.tools?.bindingFields ?? []) {
      if (tool.create?.display !== "label" && tool.create?.icon && !isPhiIconNameKnown(tool.create.icon.trim())) {
        report(widget.id, `Table binding field "${tool.key}" names the create icon "${tool.create.icon}", which PhiIcon does not know.`);
      }
    }
  }
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
