import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsCardWidgetConfig } from "./config";
import { PhiCardWidget } from "./server";
import { PHI_CARD_WIDGET_DEFINITION, PHI_CARD_WIDGET_PLUGIN_TYPE } from "./config";

export const PHI_CARD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsCardWidgetConfig> = {
  ...PHI_CARD_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, config, runtime, links }) => (
    <PhiCardWidget
      key={`widget-${widget.id}`}
      labels={{
        eyebrow: config.eyebrow,
        title: config.title,
        description: config.description,
        meta: config.meta,
        actionLabel: config.actionLabel,
      }}
      config={config}
      runtime={runtime}
      links={links}
      translate={!hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)}
    />
  )),
};

export { PHI_CARD_WIDGET_PLUGIN_TYPE };
