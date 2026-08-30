"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiDeveloperBuilderPagesHeaderSection } from "../../../../../plugins/runtime-modules/builder/clients/pages-header";
import {
  PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_DEFINITION,
  type PhiDeveloperBuilderPagesHeaderWidgetConfig,
} from "../workspace-headers/config";

export const PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiDeveloperBuilderPagesHeaderWidgetConfig> = {
  ...PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_DEFINITION,
  renderEditor: ({ config }) => (
    <PhiDeveloperBuilderPagesHeaderSection
      mode={config.mode}
    />
  ),
};
