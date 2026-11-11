import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { trBulk, trBulkForLocale } from "../../../../../server-helpers/translate";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { resolveMarkdownRenderData } from "../../../../../components/widgets/shared/markdown-render";
import { buildPhiMarkdownFaqStructuredData, resolvePhiMarkdownFoldLevel } from "../../../../../components/widgets/shared/markdown-sections";
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
  const { markdown: _markdown, resolvedContent: _resolvedContent, eyebrow: sourceEyebrow, ...presentation } = config ?? {};
  // The label above the text, translated as the text is: not where the node says `NoTranslate`.
  const [eyebrow] = sourceEyebrow && config?.translate !== false
    ? await (runtime?.locale.current ? trBulkForLocale(runtime.locale.current, [sourceEyebrow]) : trBulk([sourceEyebrow]))
    : [sourceEyebrow];

  /*
   * The folding sections as questions and answers, written into the page for search engines: data, never
   * run, and its `<` escaped so no answer can close the element it stands in.
   */
  const faq = config?.faqStructuredData && config.foldSections && config.foldSections !== "none"
    ? buildPhiMarkdownFaqStructuredData(renderData.blocks, resolvePhiMarkdownFoldLevel(config.headingOffset))
    : null;

  return (
    <>
      {faq ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</gu, "\\u003c") }}
        />
      ) : null}
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.Markdown}
        componentProps={{
          labels: { eyebrow: eyebrow || undefined },
          config: {
            ...presentation,
            blocks: renderData.blocks,
            headings: renderData.headings,
          },
        }}
      />
    </>
  );
}
