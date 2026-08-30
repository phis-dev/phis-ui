import type { PhiCmsServerWidgetPlugin, PhiCmsWidgetPluginRenderArgs } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { getPhiHelloWorldWidgetLabels } from "../../../../../components/widgets/label-sets/hello-world";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import {
  type PhiCmsHelloWorldWidgetConfig,
} from "./config";
import { PHI_HELLO_WORLD_WIDGET_PLUGIN_TYPE } from "./config";
import { PHI_HELLO_WORLD_WIDGET_DEFINITION } from "./config";
import { PhiHelloWorldWidget } from "./client";

type PhiHelloWorldArgs = PhiCmsWidgetPluginRenderArgs<PhiCmsHelloWorldWidgetConfig>;

async function PhiHelloWorldWidgetPluginServer({ widget, runtime, tree, config }: PhiHelloWorldArgs) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiHelloWorldWidgetLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiHelloWorldWidget
      key={`widget-${widget.id}`}
      labels={{ title: labels.title }}
      config={config}
      runtime={runtime}
      items={[
        { key: "locale", label: labels.localeLabel, value: runtime.locale.current },
        { key: "site_name", label: labels.siteNameLabel, value: runtime.site.name ?? runtime.site.key },
        { key: "site_key", label: labels.siteKeyLabel, value: runtime.site.key },
        { key: "path", label: labels.pathLabel, value: tree.page?.path ?? "/" },
        { key: "area", label: labels.areaLabel, value: runtime.area },
        {
          key: "access",
          label: labels.accessLabel,
          value: runtime.viewer.access === "authenticated" ? labels.authenticatedValue : labels.publicValue,
        },
        {
          key: "current_user",
          label: labels.currentUserLabel,
          value:
            runtime.viewer.access === "authenticated"
              ? (runtime.viewer.userName ?? runtime.viewer.userEmail ?? labels.authenticatedValue)
              : labels.publicValue,
        },
        { key: "page_status", label: labels.pageStatusLabel, value: String(tree.page?.status ?? 0) },
        { key: "widget_id", label: labels.widgetIdLabel, value: String(widget.id) },
        {
          key: "widget_type",
          label: labels.widgetTypeLabel,
          value: widget.widgetType,
        },
      ]}
    />
  );
}

export const PHI_HELLO_WORLD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsHelloWorldWidgetConfig> = {
  ...PHI_HELLO_WORLD_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers((args) => <PhiHelloWorldWidgetPluginServer {...args} />),
};

export { PHI_HELLO_WORLD_WIDGET_PLUGIN_TYPE };
