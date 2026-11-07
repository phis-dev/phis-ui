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

  /*
   * The source stays on the server. The client draws `blocks`; the text they were made from -- inline or
   * out of a Content record -- went to the page's payload as well, every address in it in the clear while
   * the blocks protected them (`helpers/protected-mail.ts`).
   */
  const { markdown: _markdown, resolvedContent: _resolvedContent, ...presentation } = config ?? {};

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Markdown}
      componentProps={{
        config: {
          ...presentation,
          blocks: renderData.blocks,
          headings: renderData.headings,
        },
      }}
    />
  );
}
