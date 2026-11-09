import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PHI_SEARCH_BOX_WIDGET_DEFINITION, type PhiSearchBoxWidgetConfig } from "./config";
import { PhiSearchBoxWidget } from "./server";

export const PHI_SEARCH_BOX_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiSearchBoxWidgetConfig> = {
  ...PHI_SEARCH_BOX_WIDGET_DEFINITION,
  // `links` carries the author's results Page, resolved with every other target of the page.
  ...definePhiPassiveWidgetRenderers(({ widget, config, runtime, links }) => (
    <PhiSearchBoxWidget
      key={`widget-${widget.id}`}
      config={config}
      runtime={runtime}
      links={links}
      translate={!hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)}
    />
  )),
};
