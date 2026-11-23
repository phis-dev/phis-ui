import { PhiCmsWidgetType } from "../constants/cms-widget-types";
import { isPhiIconNameKnown } from "../components/shell/phi-icon-names";
import type { PhiResolvedCmsPageTree } from "../types/cms";
import {
  validatePhiTableWidgetBinding,
  type PhiTableProviderResourceDescriptor,
  type PhiTableWidgetConfig,
} from "../types/table-widget";
import type { PhiPresetTreeContractFinding } from "./preset-tree-contract-check";

/**
 * Every Table of a preset tree, read as the Table reads itself in the browser before its first request
 * (THIRD_PARTY_MODULES.md, "Checking a Page preset"): its binding to its Provider's resource
 * (`validatePhiTableWidgetBinding`) and every icon its actions and binding tools name (`isPhiIconNameKnown`).
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
