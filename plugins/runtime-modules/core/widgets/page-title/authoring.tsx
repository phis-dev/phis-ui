"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_PAGE_TITLE_WIDGET_DEFINITION, type PhiPageTitleWidgetConfig } from "./config";
import { PHI_PAGE_TITLE_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/page-title";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";

export const PHI_PAGE_TITLE_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiPageTitleWidgetConfig> = {
  ...PHI_PAGE_TITLE_WIDGET_DEFINITION,
  renderEditor: ({ config }) => (
    config.display === "heading"
      ? (
          <PhiTypographyControl presentation="title" level={1} style={{ margin: 0, textAlign: "center" }}>
            {PHI_PAGE_TITLE_WIDGET_DEFAULT_LABELS.editorPlaceholder}
          </PhiTypographyControl>
        )
      : (
          <PhiTypographyControl presentation="title" level={5} style={{ margin: 0, whiteSpace: "nowrap" }}>
            {PHI_PAGE_TITLE_WIDGET_DEFAULT_LABELS.editorPlaceholder}
          </PhiTypographyControl>
        )
  ),
};
