"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiPaginationWidget } from "./client";
import { PHI_PAGINATION_WIDGET_DEFINITION, type PhiPaginationWidgetConfig } from "./config";

export const PHI_PAGINATION_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiPaginationWidgetConfig>(
  PHI_PAGINATION_WIDGET_DEFINITION,
  ({ config }) => <PhiPaginationWidget config={config} />,
);
