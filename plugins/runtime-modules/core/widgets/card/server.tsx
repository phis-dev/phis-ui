import { trBulk, trBulkForLocale } from "../../../../../server-helpers/translate";
import type { PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiResolvedLinkTargets } from "../../../../../types/references";
import type { PhiCmsCardWidgetConfig } from "./config";
import { isPhiMediaSvgContentType } from "../../../../../constants/media";
import { resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import {
  resolvePhiCardImageVariantKey,
  resolvePhiCardMediaAspectRatioCss,
  resolvePhiCardMediaAspectRatioValue,
} from "../../../../../components/widgets/shared/card-vocabulary";
import { resolvePhiPublicAssetReference } from "../../../../../components/widgets/helpers/internal-reference-resolver.server";
import { resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiCardWidgetClientConfig } from "../../../../../components/widgets/shared/card-body-client";
import { getPhiCardWidgetLabelsForRuntime } from "../../../../../components/widgets/label-sets/card";
import { PhiBulletListControl } from "../../../../../components/controls/phi-bullet-list-control";
import {
  buildPhiBulletListTree,
  resolvePhiBulletListStyle,
} from "../../../../../components/widgets/shared/bullet-list-vocabulary";

export type PhiCardWidgetLabels = {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: string;
  actionLabel?: string;
  badge?: string;
  pricePeriod?: string;
  pricePeriodYearly?: string;
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
  preview = false,
}: PhiCardWidgetProps & {
  /**
   * The Builder's preview: the card answers the pointer as it will live -- its hover effect is what the
   * author is looking at -- but leads nowhere and says nothing, so a click cannot leave the Builder.
   */
  preview?: boolean;
}) {
  /*
   * The button's words: the author's, or none where they emptied them for an icon-only button, or the
   * label set's when they never wrote any -- which is translated there, not here.
   */
  const actionEnabled = config?.actionEnabled === true;
  const defaultLabels = actionEnabled ? await getPhiCardWidgetLabelsForRuntime(runtime) : null;
  const ownActionLabel = labels.actionLabel ?? config?.actionLabel;
  const plan = config?.body === "plan";
  // Resolved before the words, because the picture's description is one of them.
  const resolvedAsset =
    config?.sourceKind === "asset" && typeof config.assetId === "number"
      ? await resolvePhiPublicAssetReference({ runtime, assetId: config.assetId }).catch(() => null)
      : null;
  /*
   * The card's own words arrive translated, `{site.name}` and a plan line's values filled in
   * (server-helpers/cms-widget-texts.ts, the Card's `configTexts`). Only the Media library's
   * description of an Asset is read here, and translated in the Site's store like every Asset's.
   */
  const ownAlt = config?.alt?.trim();
  const assetAlt = !ownAlt ? resolvedAsset?.altText?.trim() : undefined;
  const alt = ownAlt || (assetAlt
    ? (await (runtime?.locale.current ? trBulkForLocale(runtime.locale.current, [assetAlt]) : trBulk([assetAlt])))[0]?.trim() || assetAlt
    : undefined);
  const translatedByKey = new Map<string, string | undefined>([
    ["eyebrow", labels.eyebrow ?? config?.eyebrow],
    ["title", labels.title ?? config?.title],
    ["description", labels.description ?? config?.description],
    ["meta", labels.meta ?? config?.meta],
    ["actionLabel", actionEnabled ? ownActionLabel : undefined],
    ["badge", labels.badge ?? config?.badge],
    ["pricePeriod", plan ? labels.pricePeriod ?? config?.pricePeriod : undefined],
    ["pricePeriodYearly", plan ? labels.pricePeriodYearly ?? config?.pricePeriodYearly : undefined],
    ["alt", alt],
  ]);
  const translatedFeatures = plan ? (config?.features ?? []).filter((entry) => Boolean(entry.text)) : [];
  /* Drawn here, so the list Control never reaches the browser with the Card (`listContent`). */
  const featureList = translatedFeatures.length > 0 ? (
    <PhiBulletListControl
      listStyle={resolvePhiBulletListStyle(config?.featureList)}
      items={buildPhiBulletListTree(translatedFeatures, (entry) => entry.text)}
    />
  ) : null;

  // The figure is not translated: a Site's own number is not a word (`value` is no text field).
  const value = config?.value;
  const presentation = resolvePhiImagePresentation({
    sourceKind: config?.sourceKind,
    assetId: resolvedAsset?.id,
    /* The card's own variant, else the Card variant where its box is that variant's proportion. */
    variantKey: resolvePhiCardImageVariantKey({
      sourceKind: config?.sourceKind,
      variantKey: config?.sourceKind === "asset" ? config?.variantKey : null,
      mediaAspectRatio: config?.mediaAspectRatio,
    }),
    frameAspectRatio: resolvePhiCardMediaAspectRatioValue(config?.mediaAspectRatio),
    variantVersion: resolvedAsset?.variantVersion,
    deliveryRevision: resolvedAsset?.deliveryRevision,
    originalUrl: resolvedAsset?.deliveryUrl,
    sourceUrl: config?.sourceKind === "url" ? config.sourceUrl : undefined,
    focalRect: resolvedAsset?.focalRect,
    sourceWidth: resolvedAsset?.width,
    sourceHeight: resolvedAsset?.height,
  });
  // The target is resolved here and the address travels: a Page reference means nothing in a browser.
  const link = preview ? null : resolvePhiLinkHref(config?.linkTarget, links);
  const actionLink = preview || !actionEnabled ? null : resolvePhiLinkHref(config?.actionLinkTarget, links);


  const clientConfig: PhiCardWidgetClientConfig = {
    surface: config?.surface ?? null,
    mediaAspectRatio: resolvePhiCardMediaAspectRatioCss(config?.mediaAspectRatio),
    image: presentation.url
      ? {
          presentation,
          ...(config?.imageOpacity == null ? {} : { opacity: config.imageOpacity / 100 }),
          ...(config?.imageOverlay ? { overlay: config.imageOverlay } : {}),
          source: config?.sourceKind === "asset" ? "asset" : "url",
          alt: translatedByKey.get("alt") ?? "",
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
    iconColor: config?.iconColor,
    iconBackground: config?.iconBackground,
    iconSize: config?.iconSize,
    iconFramed: config?.iconFramed,
    textAlign: config?.textAlign,
    headingLevel: config?.headingLevel,
    href: link?.href,
    newTab: link?.newTab,
    external: link?.external,
    /*
     * The button leads where its own target says; without one it still draws when it is on, and what
     * it does is wired from the Signals panel.
     */
    action: actionEnabled
      ? {
          ...(actionLink ? { href: actionLink.href, newTab: actionLink.newTab, external: actionLink.external } : {}),
          ...(config?.actionIcon ? { icon: config.actionIcon } : {}),
          ...(defaultLabels ? { ariaLabel: defaultLabels.actionLabel } : {}),
          ...(config?.actionVariant ? { variant: config.actionVariant } : {}),
          ...(config?.actionGradient ? { gradient: config.actionGradient } : {}),
        }
      : null,
    variant: config?.variant,
    body: config?.body,
    highlight: config?.highlight,
    badgeColor: config?.badgeColor,
    badgeStyle: config?.badgeStyle,
    badgeGradient: config?.badgeGradient,
    billingPeriod: config?.billingPeriod,
    // Only a card that leads somewhere answers the pointer; the preview has no link but shows it.
    hoverEffect: config?.linkTarget ? config.hoverEffect : undefined,
    signalRoutes: preview ? null : config?.signalRoutes ?? null,
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
          actionLabel: ownActionLabel === undefined
            ? defaultLabels?.actionLabel
            : translatedByKey.get("actionLabel") ?? "",
          value,
          badge: translatedByKey.get("badge"),
          price: plan ? config?.price : undefined,
          pricePeriod: translatedByKey.get("pricePeriod"),
          priceYearly: plan ? config?.priceYearly : undefined,
          pricePeriodYearly: translatedByKey.get("pricePeriodYearly"),
        },
        config: clientConfig,
        ...(featureList ? { listContent: featureList } : {}),
      }}
    />
  );
}
