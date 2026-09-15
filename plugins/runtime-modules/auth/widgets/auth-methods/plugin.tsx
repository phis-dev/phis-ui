import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiAuthMethodsWidget } from "./server";
import {
  PHI_AUTH_METHODS_WIDGET_DEFINITION,
  type PhiCmsAuthMethodsWidgetConfig,
} from "./config";

function renderAuthMethods({
  widget,
  runtime,
}: Parameters<PhiCmsServerWidgetPlugin<PhiCmsAuthMethodsWidgetConfig>["render"]>[0]) {
  return <PhiAuthMethodsWidget key={`widget-${widget.id}`} runtime={runtime} />;
}

export const PHI_AUTH_METHODS_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsAuthMethodsWidgetConfig> = {
  ...PHI_AUTH_METHODS_WIDGET_DEFINITION,
  render: renderAuthMethods,
  renderPreview: renderAuthMethods,
};
