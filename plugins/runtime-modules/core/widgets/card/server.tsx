import { trBulk } from "../../../../../server-helpers/translate";
import type { PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiResolvedLinkTargets } from "../../../../../types/references";
import type { PhiCmsCardWidgetConfig } from "./config";
import { isPhiMediaSvgContentType } from "../../../../../constants/media";
import { resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import { resolvePhiPublicAssetReference } from "../../../../../components/widgets/helpers/internal-reference-resolver.server";
import { resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiCardWidgetClientConfig } from "../../../../../components/widgets/shared/card-body-client";

export type PhiCardWidgetLabels = {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: string;
  actionLabel?: string;
};

export type PhiCardWidgetProps = PhiServerBlockBaseProps<
  PhiCardWidgetLabels,
  PhiCmsCardWidgetConfig
> & {
  links?: PhiResolvedLinkTargets | null;
};

export async function PhiCardWidget({
  labels,
  config,
  runtime,
  links,
  translate,
}: PhiCardWidgetProps & { translate: boolean }) {
  const textEntries = [
    ["eyebrow", labels.eyebrow ?? config?.eyebrow],
    ["title", labels.title ?? config?.title],
    ["description", labels.description ?? config?.description],
    ["meta", labels.meta ?? config?.meta],
    ["actionLabel", labels.actionLabel ?? config?.actionLabel],
  ] as const;

  const translatedTexts = translate
    ? await trBulk(textEntries.map(([, value]) => value ?? ""))
    : textEntries.map(([, value]) => value ?? "");

  const translatedByKey = new Map<string, string | undefined>(
    textEntries.map(([key], index) => [key, translatedTexts[index] || undefined]),
  );

  /*
   * The figure is left out of the translation on purpose: a Site's own number is not a word, and
   * `translate` is a per-Widget switch, so a stat card that turned it off to protect the figure would
   * lose its title's translation with it.
   */
  const value = config?.value;
  const resolvedAsset =
    config?.sourceKind === "asset" && typeof config.assetId === "number"
      ? await resolvePhiPublicAssetReference({ runtime, assetId: config.assetId }).catch(() => null)
      : null;
  const presentation = resolvePhiImagePresentation({
    sourceKind: config?.sourceKind,
    assetId: resolvedAsset?.id,
    variantKey: config?.sourceKind === "asset" ? config.variantKey : null,
    variantVersion: resolvedAsset?.variantVersion,
    deliveryRevision: resolvedAsset?.deliveryRevision,
    originalUrl: resolvedAsset?.deliveryUrl,
    sourceUrl: config?.sourceKind === "url" ? config.sourceUrl : undefined,
    focalRect: resolvedAsset?.focalRect,
    sourceWidth: resolvedAsset?.width,
    sourceHeight: resolvedAsset?.height,
  });
  // The target is resolved here and the address travels: a Page reference means nothing in a browser.
  const link = resolvePhiLinkHref(config?.linkTarget, links);
  const action = resolvePhiLinkHref(config?.actionLinkTarget, links);

  const clientConfig: PhiCardWidgetClientConfig = {
    surface: config?.surface ?? null,
    image: presentation.url
      ? {
          presentation,
          source: config?.sourceKind === "asset" ? "asset" : "url",
          alt: (config?.alt ?? resolvedAsset?.altText ?? "").trim(),
          blurDataUrl: resolvedAsset?.blurDataUrl ?? null,
          /*
           * Only a public Asset resolves here, so the optimiser takes every variant, and every original
           * that is not an SVG -- which it refuses whatever the Asset says.
           */
          optimizable: resolvedAsset != null
            && (presentation.kind === "generated-variant" || !isPhiMediaSvgContentType(resolvedAsset.contentType)),
        }
      : null,
    iconName: config?.icon,
    iconPlacement: config?.iconPlacement,
    textAlign: config?.textAlign,
    headingLevel: config?.headingLevel,
    href: link?.href,
    newTab: link?.newTab,
    external: link?.external,
    actionHref: action?.href,
    actionNewTab: action?.newTab,
    variant: config?.variant,
    body: config?.body,
    highlight: config?.highlight,
    hoverEffect: config?.hoverEffect,
  };

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Card}
      componentProps={{
        labels: {
          eyebrow: translatedByKey.get("eyebrow"),
          title: translatedByKey.get("title"),
          description: translatedByKey.get("description"),
          meta: translatedByKey.get("meta"),
          actionLabel: translatedByKey.get("actionLabel"),
          value,
        },
        config: clientConfig,
      }}
    />
  );
}
