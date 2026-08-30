import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PhiObservabilityLogDetailWidget } from "./server";
import {
  PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION,
  type PhiObservabilityLogDetailWidgetConfig,
} from "./config";

export const PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiObservabilityLogDetailWidgetConfig> = {
  ...PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ runtime, config }) => (
    <PhiObservabilityLogDetailWidget runtime={runtime} config={config} />
  )),
};
