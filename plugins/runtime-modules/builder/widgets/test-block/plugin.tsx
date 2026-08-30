import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PhiTestBlockWidget } from "./client";
import {
  PHI_TEST_BLOCK_WIDGET_DEFINITION,
  PHI_TEST_BLOCK_WIDGET_PLUGIN_TYPE,
  type PhiCmsTestBlockWidgetConfig,
} from "./config";

export const PHI_TEST_BLOCK_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsTestBlockWidgetConfig> = {
  ...PHI_TEST_BLOCK_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, config }) => (
    <PhiTestBlockWidget
      key={`widget-${widget.id}`}
      labels={{ text: config.text ?? widget.label ?? "Test block" }}
      config={config}
    />
  )),
};

export { PHI_TEST_BLOCK_WIDGET_PLUGIN_TYPE };
