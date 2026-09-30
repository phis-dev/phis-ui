import { cache } from "react";

import type { PhiCmsInstanceId, PhiNoLabels, PhiRenderableBlockBase, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiHtmlWidgetClientConfig } from "./client";
import { resolvePhiHtmlWidgetMarkup, type PhiHtmlWidgetRenderableConfig } from "./config";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { translateSemanticHtml } from "../../../../../components/widgets/helpers/semantic-html-translation";
import { resolvePhiHtmlReferences } from "../../../../../components/widgets/helpers/html-internal-references.server";
import { sanitizePhiHtmlWidgetMarkup } from "../../../../../components/widgets/helpers/html-content";
import { resolvePhiWidgetSourceUrl } from "../../../../../components/widgets/helpers/widget-source-url";

export type PhiHtmlWidgetLabels = PhiNoLabels;

export type PhiHtmlWidgetConfig = PhiHtmlWidgetClientConfig &
  PhiRenderableBlockBase & {
    translate?: boolean;
    sourceMode?: "inline" | "url";
    sourceUrl?: string;
    sourceLocale?: string;
    revalidateSeconds?: number;
    resolvedContent?: PhiHtmlWidgetRenderableConfig["resolvedContent"];
    preferSource?: boolean;
  };

export type PhiHtmlWidgetProps = PhiServerBlockBaseProps<
  PhiHtmlWidgetLabels,
  PhiHtmlWidgetConfig
> & {
  blockId: PhiCmsInstanceId;
};

const HTML_DEFAULT_REVALIDATE_SECONDS = 14400;

const loadRemoteHtml = cache(async function loadRemoteHtml(resolvedUrl: string, revalidateSeconds: number) {
  const response = await fetch(resolvedUrl, {
    ...(revalidateSeconds > 0
      ? { next: { revalidate: revalidateSeconds } }
      : { cache: "no-store" as const }),
    headers: { accept: "text/html, text/plain;q=0.9" },
  });
  if (!response.ok) throw new Error(`Failed to load HTML from ${resolvedUrl}: ${response.status}`);
  return response.text();
});

export async function PhiHtmlWidget({
  blockId,
  config,
  runtime,
}: PhiHtmlWidgetProps) {
  const sourceMode = config?.sourceMode ?? (config?.sourceUrl?.trim() ? "url" : "inline");
  const sourceUrl = config?.sourceUrl?.trim() ?? "";
  /*
   * A source that cannot be resolved or read is an error, not an empty block: rendering nothing would
   * look like a page without that section, and nobody would learn the address broke.
   */
  const resolvedSourceUrl = sourceMode === "url" && sourceUrl
    ? resolvePhiWidgetSourceUrl(sourceUrl, runtime.site.publicUrl)
    : null;
  const revalidateSeconds = config?.revalidateSeconds ?? HTML_DEFAULT_REVALIDATE_SECONDS;
  const resolvedHtml = resolvedSourceUrl
    ? resolvePhiHtmlWidgetMarkup(
        { html: await loadRemoteHtml(resolvedSourceUrl, revalidateSeconds) },
        { preferConfigHtml: true },
      )
    : sourceMode === "url"
      ? ""
      : resolvePhiHtmlWidgetMarkup(config, {
          preferSource: config?.preferSource === true,
          preferConfigHtml: config?.renderMode === "preview" || config?.renderMode === "editor",
          allowInternalReferences: true,
        });
  const sourceHtml = resolvedHtml
    ? sanitizePhiHtmlWidgetMarkup(await resolvePhiHtmlReferences({
        html: resolvedHtml,
        sourceMode,
        sourceUrl: resolvedSourceUrl,
        runtime,
      }))
    : "";
  if (!sourceHtml) {
    return null;
  }

  const translatedHtml =
    (sourceMode !== "url" && config?.resolvedContent != null) || config?.translate === false
      ? sourceHtml
      : await translateSemanticHtml(
          sourceHtml,
          sourceMode === "url" ? config?.sourceLocale?.trim() : undefined,
        );

  if (!translatedHtml) {
    return null;
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Html}
      componentProps={{
        blockId,
        config: {
          ...config,
          html: translatedHtml,
        } satisfies PhiHtmlWidgetClientConfig | undefined,
      }}
    />
  );
}
