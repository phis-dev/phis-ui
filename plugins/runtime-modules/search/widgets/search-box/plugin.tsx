import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PHI_SEARCH_BOX_WIDGET_DEFINITION, type PhiSearchBoxWidgetConfig } from "./config";
import { PhiSearchBoxWidget } from "./server";

export const PHI_SEARCH_BOX_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiSearchBoxWidgetConfig> = {
  ...PHI_SEARCH_BOX_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, config, runtime }) => (
    <PhiSearchBoxWidget key={`widget-${widget.id}`} config={config} runtime={runtime} />
  )),
};
