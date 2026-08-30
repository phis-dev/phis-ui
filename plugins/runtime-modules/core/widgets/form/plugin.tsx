import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiFormWidget } from "./built-in";
import {
  PHI_FORM_WIDGET_DEFINITION,
  PHI_FORM_WIDGET_PLUGIN_TYPE,
  type PhiCmsFormWidgetConfig,
} from "./config";

function renderForm({
  widget,
  config,
  runtime,
  registry,
}: Parameters<PhiCmsServerWidgetPlugin<PhiCmsFormWidgetConfig>["render"]>[0]) {
  if (!config.formId) {
    return null;
  }
  if (!registry) {
    throw new Error("Form Widget requires the active runtime render registry.");
  }

  return (
    <PhiFormWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      registry={registry}
      formId={config.formId}
      formInstanceKey={`widget-${widget.id}`}
      config={config}
    />
  );
}

export const PHI_FORM_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsFormWidgetConfig> = {
  ...PHI_FORM_WIDGET_DEFINITION,
  render: renderForm,
  renderPreview: renderForm,
};

export { PHI_FORM_WIDGET_PLUGIN_TYPE };
