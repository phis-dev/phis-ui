"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_DEFINITION, type PhiBuilderChromeWidgetConfig } from "../chrome/config";
import { PhiDeveloperBuilderDraftStatusWidgetClient } from "./authoring";

export const PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiBuilderChromeWidgetConfig> = {
  ...PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_DEFINITION,
  renderEditor: () => <PhiDeveloperBuilderDraftStatusWidgetClient />,
};
