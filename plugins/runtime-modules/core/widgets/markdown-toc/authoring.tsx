"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import {
  PHI_MARKDOWN_TOC_WIDGET_DEFINITION,
  PHI_MARKDOWN_TOC_WIDGET_PLUGIN_TYPE,
  type PhiCmsMarkdownTocWidgetConfig,
} from "./config";
import { PhiMarkdownTocWidgetClient } from "./client";
import { PHI_MARKDOWN_TOC_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/markdown-toc";

export const PHI_MARKDOWN_TOC_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsMarkdownTocWidgetConfig> = {
  ...PHI_MARKDOWN_TOC_WIDGET_DEFINITION,
  renderEditor: ({ config }) => (
    <PhiMarkdownTocWidgetClient config={{ ...config, title: config.title ?? PHI_MARKDOWN_TOC_WIDGET_DEFAULT_LABELS.title, headings: [] }} />
  ),
};

export { PHI_MARKDOWN_TOC_WIDGET_PLUGIN_TYPE };
