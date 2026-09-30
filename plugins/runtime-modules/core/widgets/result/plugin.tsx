import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import {
  PHI_RESULT_WIDGET_DEFINITION,
  type PhiCmsResultWidgetConfig,
} from "./config";
import { PhiResultWidget } from "./server";

export const PHI_RESULT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsResultWidgetConfig> = {
  ...PHI_RESULT_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => (
    <PhiResultWidget
      key={`widget-${widget.id}`}
      config={config}
      runtime={runtime}
      translate={!hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)}
    />
  ),
  renderPreview: ({ widget, config, runtime }) => (
    <PhiResultWidget
      key={`widget-preview-${widget.id}`}
      config={{
        ...config,
        renderMode: "preview",
      }}
      runtime={runtime}
      translate={false}
    />
  ),
};
