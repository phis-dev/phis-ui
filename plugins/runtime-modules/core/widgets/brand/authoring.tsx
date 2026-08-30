"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiBrandWidgetClient } from "./client";
import { PHI_BRAND_WIDGET_DEFINITION, type PhiCmsBrandWidgetConfig } from "./config";

export const PHI_BRAND_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsBrandWidgetConfig> = {
  ...PHI_BRAND_WIDGET_DEFINITION,
  renderEditor: ({ runtime, config }) => (
    <PhiBrandWidgetClient
      config={{
        showLogo: config.showLogo,
        logoYOffset: config.logoYOffset,
      }}
      fallbackTitle={config.fallbackTitle ?? runtime.site.name ?? runtime.site.key}
      fallbackEyebrow={config.fallbackEyebrow}
      interactive={false}
    />
  ),
};
