import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { resolveMarkdownRenderData } from "../../../../../components/widgets/shared/markdown-render";
import type { PhiCmsMarkdownWidgetConfig } from "./config";

export type PhiMarkdownWidgetProps = PhiServerBlockBaseProps<
  PhiNoLabels,
  PhiCmsMarkdownWidgetConfig
>;

export async function PhiMarkdownWidget({
  config,
  runtime,
}: PhiMarkdownWidgetProps) {
  const renderData = await resolveMarkdownRenderData(config, runtime);

  if ("error" in renderData) {
    return (
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.Markdown}
        componentProps={{ config: { blocks: [], error: renderData.error } }}
      />
    );
  }

  if (renderData.blocks.length === 0) {
    return null;
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Markdown}
      componentProps={{
        config: {
          ...config,
          blocks: renderData.blocks,
          headings: renderData.headings,
        },
      }}
    />
  );
}
