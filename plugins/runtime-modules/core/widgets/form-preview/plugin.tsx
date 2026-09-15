import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiFormPreviewWidget } from "./built-in";
import {
  PHI_FORM_PREVIEW_WIDGET_DEFINITION,
  PHI_FORM_PREVIEW_WIDGET_PLUGIN_TYPE,
  type PhiCmsFormPreviewWidgetConfig,
} from "./config";

function renderFormPreview({
  widget,
  config,
  runtime,
  registry,
}: Parameters<PhiCmsServerWidgetPlugin<PhiCmsFormPreviewWidgetConfig>["render"]>[0]) {
  if (!config.formId) {
    return null;
  }
  if (!registry) {
    throw new Error("Form Preview Widget requires the active runtime render registry.");
  }

  return (
    <PhiFormPreviewWidget
      key={`widget-${widget.id}`}
      blockId={widget.id}
      runtime={runtime}
      registry={registry}
      config={config}
    />
  );
}

export const PHI_FORM_PREVIEW_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsFormPreviewWidgetConfig> = {
  ...PHI_FORM_PREVIEW_WIDGET_DEFINITION,
  render: renderFormPreview,
  renderPreview: renderFormPreview,
};

export { PHI_FORM_PREVIEW_WIDGET_PLUGIN_TYPE };
