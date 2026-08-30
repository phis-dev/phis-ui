"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import {
  PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
  type PhiBuilderBrandWidgetConfig,
} from "../../../../../plugins/runtime-modules/theme/widgets/brand-controls/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

function renderBrandPlaceholder(
  title: string,
  summary: string,
): PhiCmsBuilderWidgetPlugin<PhiBuilderBrandWidgetConfig>["renderEditor"] {
  function PhiBuilderBrandPlaceholderEditor({
    widget,
  }: Parameters<
    PhiCmsBuilderWidgetPlugin<PhiBuilderBrandWidgetConfig>["renderEditor"]
  >[0]) {
    return (
      <PhiWidgetEditorPlaceholder widget={widget} pluginTitle={title} summary={summary} />
    );
  }

  return PhiBuilderBrandPlaceholderEditor;
}

export const PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_BUILDER_PLUGIN = {
  ...PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  renderEditor: renderBrandPlaceholder(
    "Builder Brand Theme Controls",
    "Theme controls are available in the live Theme workspace.",
  ),
} satisfies PhiCmsBuilderWidgetPlugin<PhiBuilderBrandWidgetConfig>;

export const PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_BUILDER_PLUGIN = {
  ...PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
  renderEditor: renderBrandPlaceholder(
    "Builder Brand Theme Preview",
    "The live theme preview is available in the Theme workspace.",
  ),
} satisfies PhiCmsBuilderWidgetPlugin<PhiBuilderBrandWidgetConfig>;

export const PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_BUILDER_PLUGIN = {
  ...PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  renderEditor: renderBrandPlaceholder(
    "Builder Brand Style Controls",
    "Style controls are available in the live Theme workspace.",
  ),
} satisfies PhiCmsBuilderWidgetPlugin<PhiBuilderBrandWidgetConfig>;
