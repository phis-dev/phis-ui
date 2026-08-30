import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import {
  PHI_HTML_WIDGET_DEFINITION,
  PHI_HTML_WIDGET_PLUGIN_TYPE,
  type PhiCmsHtmlWidgetConfig,
} from "./config";
import { PhiHtmlWidget } from "./server";

export const PHI_HTML_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsHtmlWidgetConfig> = {
  ...PHI_HTML_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => {
    const noTranslate = hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate);

    return (
      <PhiHtmlWidget
        blockId={widget.id}
        config={{
          ...config,
          resolvedContent: widget.resolvedContent ?? null,
          preferSource: noTranslate,
        }}
        runtime={runtime}
      />
    );
  },
  renderPreview: ({ widget, config, runtime }) => (
    <PhiHtmlWidget
      blockId={widget.id}
      config={{
        ...config,
        resolvedContent: widget.resolvedContent ?? null,
        renderMode: "preview",
      }}
      runtime={runtime}
    />
  ),
};
export { PHI_HTML_WIDGET_PLUGIN_TYPE };
