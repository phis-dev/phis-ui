import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
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
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";

/*
 * The five panels of the Theme workspace are Render Clients the Builder's Client manifest loads when one is
 * drawn (`client-manifests/builder.tsx`), not Client components this server half imports: an import here
 * put the whole workspace (`./client`, some 180 kB of source with what it reaches) into every Builder
 * route's client graph, the dashboard's included, because a server-side `import()` defers nothing for the
 * browser (TODOS.md, "The Builder got heavier").
 */

export const PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  render: async ({ runtime, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.BuilderBrandThemeControls}
      componentProps={{
        runtime,
        config,
        colorPickerLabels: await getPhiColorPickerLabels(buildPhiWidgetLabelTranslatorOptions(runtime)),
      }}
    />
  ),
};

export const PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
  render: ({ runtime, config }) => (
    <PhiRuntimeModuleRenderClientHost type={PhiRuntimeRenderClientType.BuilderBrandThemePreview} componentProps={{ runtime, config }} />
  ),
  renderPreview: ({ runtime }) => (
    <PhiRuntimeModuleRenderClientHost type={PhiRuntimeRenderClientType.BuilderBrandThemePreview} componentProps={{ runtime }} />
  ),
};

export const PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  render: ({ runtime, config }) => (
    <PhiRuntimeModuleRenderClientHost type={PhiRuntimeRenderClientType.BuilderBrandStyleControls} componentProps={{ runtime, config }} />
  ),
};

export const PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_DEFINITION,
  // The picker the Background Control opens says its words in the reader's language.
  render: async ({ runtime, config }) => (
    <PhiMediaPickerLabelsProvider labels={await getPhiMediaWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime))}>
      <PhiRuntimeModuleRenderClientHost type={PhiRuntimeRenderClientType.BuilderBrandBackgroundControls} componentProps={{ runtime, config }} />
    </PhiMediaPickerLabelsProvider>
  ),
};

export const PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig> = {
  ...PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_DEFINITION,
  // The picker the Logo field opens says its words in the reader's language.
  render: async ({ runtime, config }) => (
    <PhiMediaPickerLabelsProvider labels={await getPhiMediaWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime))}>
      <PhiRuntimeModuleRenderClientHost type={PhiRuntimeRenderClientType.BuilderBrandIdentityControls} componentProps={{ runtime, config }} />
    </PhiMediaPickerLabelsProvider>
  ),
};
