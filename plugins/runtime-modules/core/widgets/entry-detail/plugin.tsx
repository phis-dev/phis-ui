import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PHI_ENTRY_DETAIL_WIDGET_DEFINITION, type PhiEntryDetailWidgetConfig } from "./config";
import { PhiEntryDetailWidget } from "./server";

export const PHI_ENTRY_DETAIL_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiEntryDetailWidgetConfig> = {
  ...PHI_ENTRY_DETAIL_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, config, runtime }) => (
    <PhiEntryDetailWidget key={`widget-${widget.id}`} config={config} runtime={runtime} />
  )),
};
