import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PhiFooterWidget } from "./server";
import {
  PHI_FOOTER_WIDGET_DEFINITION,
  PHI_FOOTER_WIDGET_PLUGIN_TYPE,
  type PhiCmsFooterWidgetConfig,
} from "./config";

export const PHI_FOOTER_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsFooterWidgetConfig> = {
  ...PHI_FOOTER_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, runtime, config }) => (
    <PhiFooterWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      brandTitle={config.brandTitle}
      brandText={config.brandText}
      contactEmailValue={config.contactEmailValue}
      contactEmailHref={config.contactEmailHref}
      locationValue={config.locationValue}
      note={config.note}
    />
  )),
};

export { PHI_FOOTER_WIDGET_PLUGIN_TYPE };
