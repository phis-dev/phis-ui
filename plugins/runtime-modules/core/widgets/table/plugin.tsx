import type { PhiCmsServerWidgetPlugin, PhiTableWidgetConfig } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
import { PHI_TABLE_WIDGET_DEFINITION } from "./config";
import { PhiTableWidget } from "./server";
import { resolvePhiTableActionLinks } from "../../../../../helpers/table-action-links";
import { getPhiTableWidgetLabels } from "../../../../../components/widgets/label-sets/table";

type PhiTableWidgetRenderArgs = Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiTableWidgetConfig>["render"]>>[0];

/** The config with every action's link target resolved to the address it leads to now. */
function resolvePhiTableConfigLinks(config: PhiTableWidgetConfig, links: PhiTableWidgetRenderArgs["links"]): PhiTableWidgetConfig {
  const actions = config.features.actions;
  if (!actions) return config;
  return {
    ...config,
    features: {
      ...config.features,
      actions: {
        ...actions,
        toolbar: resolvePhiTableActionLinks(actions.toolbar, links),
        row: resolvePhiTableActionLinks(actions.row, links),
        bulk: resolvePhiTableActionLinks(actions.bulk, links),
      },
    },
  };
}

async function PhiTableWidgetPluginServer({
  widget,
  config: stored,
  runtime,
  links,
}: {
  widget: PhiTableWidgetRenderArgs["widget"];
  config: PhiTableWidgetConfig;
  runtime: PhiTableWidgetRenderArgs["runtime"];
  links?: PhiTableWidgetRenderArgs["links"];
}) {
  const config = resolvePhiTableConfigLinks(stored, links);
  const rt = phiRuntime(runtime);
  const labels = await getPhiTableWidgetLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });
  return <PhiTableWidget config={config} labels={labels} renderMode={readPhiRuntimeTreeRenderMode(widget.config)} />;
}

export const PHI_TABLE_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiTableWidgetConfig> = {
  ...PHI_TABLE_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers((args) => <PhiTableWidgetPluginServer {...args} />),
};
