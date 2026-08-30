"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiBreadcrumbWidget } from "./client";
import { PHI_BREADCRUMB_WIDGET_DEFINITION, type PhiCmsBreadcrumbWidgetConfig } from "./config";

export const PHI_BREADCRUMB_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsBreadcrumbWidgetConfig> = {
  ...PHI_BREADCRUMB_WIDGET_DEFINITION,
  renderEditor: ({ runtime, config }) => (
    <PhiBreadcrumbWidget
      runtime={runtime}
      config={config}
    />
  ),
};
