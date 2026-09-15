import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiWidgetInertPreview } from "../../../../../components/widgets/built-in/widget-preview";
import {
  PHI_MARKDOWN_TOC_WIDGET_DEFINITION,
  PHI_MARKDOWN_TOC_WIDGET_PLUGIN_TYPE,
  type PhiCmsMarkdownTocWidgetConfig,
} from "./config";
import { PhiMarkdownTocWidget } from "./server";
import { getPhiMarkdownTocWidgetDefaultLabels } from "../../../../../components/widgets/label-sets/markdown-toc";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";

async function loadDefaultLabels(runtime: Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiCmsMarkdownTocWidgetConfig>["render"]>>[0]["runtime"]) {
  return getPhiMarkdownTocWidgetDefaultLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
}

export const PHI_MARKDOWN_TOC_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsMarkdownTocWidgetConfig> = {
  ...PHI_MARKDOWN_TOC_WIDGET_DEFINITION,
  render: async ({ config, runtime, tree }) => (
    <PhiMarkdownTocWidget config={config} defaultLabels={await loadDefaultLabels(runtime)} runtime={runtime} tree={tree} />
  ),
  renderPreview: async ({ config, runtime, tree }) => (
    <PhiWidgetInertPreview>
      <PhiMarkdownTocWidget config={config} defaultLabels={await loadDefaultLabels(runtime)} runtime={runtime} tree={tree} />
    </PhiWidgetInertPreview>
  ),
};

export { PHI_MARKDOWN_TOC_WIDGET_PLUGIN_TYPE };
