import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsCardWidgetConfig } from "./config";
import { PhiCardWidget } from "./server";
import { PHI_CARD_WIDGET_DEFINITION, PHI_CARD_WIDGET_PLUGIN_TYPE } from "./config";

export const PHI_CARD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsCardWidgetConfig> = {
  ...PHI_CARD_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, config, runtime }) => (
    <PhiCardWidget
      key={`widget-${widget.id}`}
      labels={{
        eyebrow: config.eyebrow,
        title: config.title ?? widget.label ?? undefined,
        description: config.description,
        meta: config.meta,
        actionLabel: config.actionLabel,
      }}
      config={config}
      runtime={runtime}
    />
  )),
};

export { PHI_CARD_WIDGET_PLUGIN_TYPE };
