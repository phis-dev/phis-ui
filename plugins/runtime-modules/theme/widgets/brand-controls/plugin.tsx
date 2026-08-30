import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiWidgetPreviewFallback } from "../../../../../components/widgets/built-in/widget-preview";
import {
  PhiBuilderBrandStyleControlsWidgetClient,
  PhiBuilderBrandThemeControlsWidgetClient,
  PhiBuilderBrandThemePreviewWidgetClient,
} from "./client";
import {
  PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
  type PhiBuilderBrandWidgetConfig,
} from "./config";
import { getPhiColorPickerLabelsForRuntime } from "../../../../../components/widgets/label-sets/color-picker";

export const PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  render: async ({ runtime, config }) => (
    <PhiBuilderBrandThemeControlsWidgetClient
      runtime={runtime}
      config={config}
      colorPickerLabels={await getPhiColorPickerLabelsForRuntime(runtime)}
    />
  ),
  renderPreview: ({ widget }) => (
    <PhiWidgetPreviewFallback
      widget={widget}
      pluginTitle="Builder Brand Theme Controls"
      summary="Brand theme controls are rendered live in the builder."
    />
  ),
};

export const PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
  render: ({ runtime }) => <PhiBuilderBrandThemePreviewWidgetClient runtime={runtime} />,
  renderPreview: ({ runtime }) => <PhiBuilderBrandThemePreviewWidgetClient runtime={runtime} />,
};

export const PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiBuilderBrandStyleControlsWidgetClient runtime={runtime} config={config} />,
  renderPreview: ({ widget }) => (
    <PhiWidgetPreviewFallback
      widget={widget}
      pluginTitle="Builder Brand Style Controls"
      summary="Brand style controls are rendered live in the builder."
    />
  ),
};
