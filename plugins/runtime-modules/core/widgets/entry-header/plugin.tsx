import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PHI_ENTRY_HEADER_WIDGET_DEFINITION, type PhiEntryHeaderWidgetConfig } from "./config";
import { PhiEntryHeaderWidget } from "./server";

export const PHI_ENTRY_HEADER_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiEntryHeaderWidgetConfig> = {
  ...PHI_ENTRY_HEADER_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, config, runtime, registry }) => (
    <PhiEntryHeaderWidget key={`widget-${widget.id}`} config={config} runtime={runtime} registry={registry} />
  )),
};
