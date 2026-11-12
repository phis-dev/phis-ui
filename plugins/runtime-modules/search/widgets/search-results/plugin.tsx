import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PHI_SEARCH_RESULTS_WIDGET_DEFINITION, type PhiSearchResultsWidgetConfig } from "./config";
import { PhiSearchResultsWidget } from "./server";

export const PHI_SEARCH_RESULTS_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiSearchResultsWidgetConfig> = {
  ...PHI_SEARCH_RESULTS_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, config, runtime }) => (
    <PhiSearchResultsWidget key={`widget-${widget.id}`} config={config} runtime={runtime} widgetId={widget.id} />
  )),
};
