import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PHI_NEWS_LIST_WIDGET_DEFINITION, type PhiNewsListWidgetConfig } from "./config";
import { PhiNewsListWidget } from "./server";

export const PHI_NEWS_LIST_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiNewsListWidgetConfig> = {
  ...PHI_NEWS_LIST_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, config, runtime }) => (
    <PhiNewsListWidget key={`widget-${widget.id}`} config={config} runtime={runtime} />
  )),
};
