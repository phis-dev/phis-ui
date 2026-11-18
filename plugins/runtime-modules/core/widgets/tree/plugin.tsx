import type { PhiCmsServerWidgetPlugin, PhiTreeWidgetConfig } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
import { PHI_TREE_WIDGET_DEFINITION } from "./config";
import { PhiTreeWidget } from "./server";
import { resolvePhiTableActionLinks } from "../../../../../helpers/table-action-links";
import { getPhiTreeWidgetLabels } from "../../../../../components/widgets/label-sets/tree";

type PhiTreeWidgetRenderArgs = Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiTreeWidgetConfig>["render"]>>[0];

async function PhiTreeWidgetPluginServer({ widget, config: stored, runtime, links }: {
  widget: PhiTreeWidgetRenderArgs["widget"];
  config: PhiTreeWidgetConfig;
  runtime: PhiTreeWidgetRenderArgs["runtime"];
  links?: PhiTreeWidgetRenderArgs["links"];
}) {
  // Where each action's target leads, resolved here: a Page reference means nothing in a browser.
  const actions = stored.features.actions;
  const config: PhiTreeWidgetConfig = !actions ? stored : {
    ...stored,
    features: {
      ...stored.features,
      actions: {
        ...actions,
        toolbar: resolvePhiTableActionLinks(actions.toolbar, links) ?? [],
        node: resolvePhiTableActionLinks(actions.node, links) ?? [],
        selection: resolvePhiTableActionLinks(actions.selection, links) ?? [],
      },
    },
  };
  const rt = phiRuntime(runtime);
  const labels = await getPhiTreeWidgetLabels({ apiBaseUrl: rt.apiBaseUrl, internalToken: rt.internalToken, locale: runtime.locale.current });
  return <PhiTreeWidget config={config} labels={labels} renderMode={readPhiRuntimeTreeRenderMode(widget.config)} />;
}

export const PHI_TREE_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiTreeWidgetConfig> = {
  ...PHI_TREE_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers((args) => <PhiTreeWidgetPluginServer {...args} />),
};
