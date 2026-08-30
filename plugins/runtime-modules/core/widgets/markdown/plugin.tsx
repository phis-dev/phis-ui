import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiWidgetInertPreview } from "../../../../../components/widgets/built-in/widget-preview";
import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { PhiMarkdownWidget } from "./server";
import {
  PHI_MARKDOWN_WIDGET_DEFINITION,
  PHI_MARKDOWN_WIDGET_PLUGIN_TYPE,
  type PhiCmsMarkdownWidgetConfig,
} from "./config";

export const PHI_MARKDOWN_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsMarkdownWidgetConfig> = {
  ...PHI_MARKDOWN_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => (
    <PhiMarkdownWidget
      key={`widget-${widget.id}`}
      config={{
        ...config,
        widgetId: widget.id,
        resolvedContent: widget.resolvedContent ?? null,
        preferSource: hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate),
      }}
      runtime={runtime}
    />
  ),
  renderPreview: ({ widget, config, runtime }) => (
    <PhiWidgetInertPreview>
      <PhiMarkdownWidget
        key={`widget-preview-${widget.id}`}
        config={{
          ...config,
          widgetId: widget.id,
          resolvedContent: widget.resolvedContent ?? null,
          renderMode: "preview",
        }}
        runtime={runtime}
      />
    </PhiWidgetInertPreview>
  ),
};

export { PHI_MARKDOWN_WIDGET_PLUGIN_TYPE };
