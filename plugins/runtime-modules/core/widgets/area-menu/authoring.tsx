"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_AREA_MENU_WIDGET_DEFINITION } from "./config";
import { PhiAreaMenuWidgetPreview } from "./index";

export const PHI_AREA_MENU_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<Record<string, never>> = {
  ...PHI_AREA_MENU_WIDGET_DEFINITION,
  renderEditor: ({ runtime }) => <PhiAreaMenuWidgetPreview locale={runtime.locale} />,
};
