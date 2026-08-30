import { cache } from "react";
import { headers } from "next/headers";

import type { PhiCmsInstanceId, PhiNoLabels, PhiRenderableBlockBase, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiHtmlWidgetClientConfig } from "./client";
import { resolvePhiHtmlWidgetMarkup, type PhiHtmlWidgetRenderableConfig } from "./config";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { translateSemanticHtml } from "../../../../../components/widgets/helpers/semantic-html-translation";
import { resolvePhiHtmlReferences } from "../../../../../components/widgets/helpers/html-internal-references.server";
import { sanitizePhiHtmlWidgetMarkup } from "../../../../../components/widgets/helpers/html-content";

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

async function normalizeHtmlSourceUrl(sourceUrl: string) {
  const trimmed = sourceUrl.trim();
  if (!trimmed.startsWith("/")) return trimmed;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  if (!host) throw new Error(`Cannot resolve relative HTML source without request host: ${sourceUrl}`);
  return `${protocol}://${host}${trimmed}`;
}

const loadRemoteHtml = cache(async function loadRemoteHtml(sourceUrl: string, revalidateSeconds: number) {
  const resolvedUrl = await normalizeHtmlSourceUrl(sourceUrl);
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
  const resolvedHtml = sourceMode === "url" && sourceUrl
    ? await loadRemoteHtml(sourceUrl, config?.revalidateSeconds ?? HTML_DEFAULT_REVALIDATE_SECONDS)
      .then((html) => resolvePhiHtmlWidgetMarkup({ html }, { preferConfigHtml: true }))
      .catch(() => "")
    : resolvePhiHtmlWidgetMarkup(config, {
        preferSource: config?.preferSource === true,
        preferConfigHtml: config?.renderMode === "preview" || config?.renderMode === "editor",
        allowInternalReferences: true,
      });
  const sourceHtml = resolvedHtml
    ? sanitizePhiHtmlWidgetMarkup(await resolvePhiHtmlReferences({
        html: resolvedHtml,
        sourceMode,
        sourceUrl: sourceMode === "url" ? await normalizeHtmlSourceUrl(sourceUrl) : null,
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
