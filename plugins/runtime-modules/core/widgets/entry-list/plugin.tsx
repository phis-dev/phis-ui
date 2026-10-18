import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PHI_ENTRY_LIST_WIDGET_DEFINITION, type PhiEntryListWidgetConfig } from "./config";
import { PhiEntryListWidget } from "./server";

export const PHI_ENTRY_LIST_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiEntryListWidgetConfig> = {
  ...PHI_ENTRY_LIST_WIDGET_DEFINITION,
  // `links` carries the detail route, resolved with every other target of the page before anything drew.
  ...definePhiPassiveWidgetRenderers(({ widget, config, runtime, registry, links }) => (
    <PhiEntryListWidget
      key={`widget-${widget.id}`}
      config={config}
      runtime={runtime}
      registry={registry}
      links={links}
      translate={!hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)}
    />
  )),
};
