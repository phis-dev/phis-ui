import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import { tr } from "../../../../../server-helpers/translate";
import type { PhiCmsContentWidgetNode, PhiResolvedCmsRenderableTree } from "../../../../../types/cms";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import {
  type PhiCmsMarkdownTocWidgetConfig,
  type PhiMarkdownTocHeading,
} from "./config";
import { parsePhiCmsMarkdownWidgetConfig } from "../markdown/config";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { resolveMarkdownRenderData } from "../markdown/server";
import type { PhiMarkdownTocWidgetDefaultLabels } from "../../../../../components/widgets/label-types/markdown-toc";

export type PhiMarkdownTocWidgetProps = PhiServerBlockBaseProps<
  PhiNoLabels,
  PhiCmsMarkdownTocWidgetConfig,
  PhiMarkdownTocWidgetDefaultLabels
> & {
  tree: PhiResolvedCmsRenderableTree;
};

function resolveTargetMarkdownWidget(
  tree: PhiResolvedCmsRenderableTree,
  config: PhiCmsMarkdownTocWidgetConfig | undefined,
): PhiCmsContentWidgetNode | null {
  const markdownWidgets = tree.contentWidgets.filter((widget) => widget.widgetType === PhiCmsWidgetType.Markdown);
  if (config?.bindingMode === "target") {
    if (config.markdownWidgetId) {
      return markdownWidgets.find((widget) => String(widget.id) === config.markdownWidgetId) ?? null;
    }
    if (config.tocKey) {
      return markdownWidgets.find((widget) => widget.config?.tocKey === config.tocKey) ?? null;
    }
    return null;
  }

  return markdownWidgets.length === 1 ? markdownWidgets[0] ?? null : null;
}

function filterHeadings(
  headings: PhiMarkdownTocHeading[],
  config: PhiCmsMarkdownTocWidgetConfig | undefined,
) {
  const minLevel = config?.minLevel ?? 1;
  const maxLevel = config?.maxLevel ?? 5;
  return headings.filter((heading) => heading.level >= minLevel && heading.level <= maxLevel);
}

export async function PhiMarkdownTocWidget({
  config,
  defaultLabels,
  tree,
  runtime,
}: PhiMarkdownTocWidgetProps) {
  const title = await tr(config?.title?.trim() || defaultLabels.title);
  const targetWidget = resolveTargetMarkdownWidget(tree, config);
  if (!targetWidget) {
    return (
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.MarkdownToc}
        componentProps={{ config: { ...config, title, headings: [] } }}
      />
    );
  }

  const markdownConfig = parsePhiCmsMarkdownWidgetConfig({
    ...(targetWidget.config ?? {}),
    widgetId: targetWidget.id,
    resolvedContent: targetWidget.resolvedContent ?? null,
  });
  const renderData = await resolveMarkdownRenderData(markdownConfig, runtime);
  const headings = "error" in renderData ? [] : filterHeadings(renderData.headings, config);

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.MarkdownToc}
      componentProps={{ config: { ...config, title, headings } }}
    />
  );
}
