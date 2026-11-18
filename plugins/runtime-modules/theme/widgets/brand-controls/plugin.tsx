import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  PhiBuilderBrandBackgroundControlsWidgetClient,
  PhiBuilderBrandIdentityControlsWidgetClient,
  PhiBuilderBrandStyleControlsWidgetClient,
  PhiBuilderBrandThemeControlsWidgetClient,
  PhiBuilderBrandThemePreviewWidgetClient,
} from "./client";
import {
  PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
  type PhiBuilderBrandWidgetConfig,
} from "./config";
import { getPhiColorPickerLabels } from "../../../../../components/widgets/label-sets/color-picker";
import { getPhiMediaWidgetLabels } from "../../../../../components/media/label-sets/media";
import { PhiMediaPickerLabelsProvider } from "../../../../../components/media/phi-media-picker-labels";

export const PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  render: async ({ runtime, config }) => (
    <PhiBuilderBrandThemeControlsWidgetClient
      runtime={runtime}
      config={config}
      colorPickerLabels={await getPhiColorPickerLabels(buildPhiWidgetLabelTranslatorOptions(runtime))}
    />
  ),
};

export const PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiBuilderBrandThemePreviewWidgetClient runtime={runtime} config={config} />,
  renderPreview: ({ runtime }) => <PhiBuilderBrandThemePreviewWidgetClient runtime={runtime} />,
};

export const PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiBuilderBrandStyleControlsWidgetClient runtime={runtime} config={config} />,
};

export const PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_DEFINITION,
  // The picker the Background Control opens says its words in the reader's language.
  render: async ({ runtime, config }) => (
    <PhiMediaPickerLabelsProvider labels={await getPhiMediaWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime))}>
      <PhiBuilderBrandBackgroundControlsWidgetClient runtime={runtime} config={config} />
    </PhiMediaPickerLabelsProvider>
  ),
};

export const PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_DEFINITION,
  // The picker the Logo field opens says its words in the reader's language.
  render: async ({ runtime, config }) => (
    <PhiMediaPickerLabelsProvider labels={await getPhiMediaWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime))}>
      <PhiBuilderBrandIdentityControlsWidgetClient runtime={runtime} config={config} />
    </PhiMediaPickerLabelsProvider>
  ),
};
