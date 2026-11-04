import { trBulk, trBulkForLocale } from "../../../../../server-helpers/translate";
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
import { getPhiCardWidgetLabelsForRuntime } from "../../../../../components/widgets/label-sets/card";
import { PhiBulletListControl } from "../../../../../components/controls/phi-bullet-list-control";
import {
  buildPhiBulletListTree,
  resolvePhiBulletListStyle,
} from "../../../../../components/widgets/shared/bullet-list-vocabulary";
import { maskPhiTextPlaceholders, resolvePhiTextPlaceholders } from "../../../../../helpers/text-placeholders";

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
  translate,
  preview = false,
}: PhiCardWidgetProps & {
  translate: boolean;
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
  const textEntries = [
    ["eyebrow", labels.eyebrow ?? config?.eyebrow],
    ["title", labels.title ?? config?.title],
    ["description", labels.description ?? config?.description],
    ["meta", labels.meta ?? config?.meta],
    ["actionLabel", actionEnabled ? ownActionLabel : undefined],
    ["badge", labels.badge ?? config?.badge],
    ["pricePeriod", plan ? labels.pricePeriod ?? config?.pricePeriod : undefined],
    ["pricePeriodYearly", plan ? labels.pricePeriodYearly ?? config?.pricePeriodYearly : undefined],
  ] as const;
  /*
   * A plan's features, masked as every list entry is: their values stand as `%1` onwards and never reach
   * a translator, and `{site.name}` is filled after (`helpers/text-placeholders.ts`).
   */
  const features = plan ? (config?.features ?? []).filter((entry) => Boolean(entry.text)) : [];
  const maskedFeatures = features.map((entry) => maskPhiTextPlaceholders(entry.text, entry.values?.length ?? 0));

  const sourceTexts = [...textEntries.map(([, value]) => value ?? ""), ...maskedFeatures.map((masked) => masked.text)];
  const translatedTexts = translate
    ? await (runtime?.locale.current
      ? trBulkForLocale(runtime.locale.current, sourceTexts)
      : trBulk(sourceTexts))
    : sourceTexts;

  const translatedByKey = new Map<string, string | undefined>(
    textEntries.map(([key], index) => [key, translatedTexts[index] || undefined]),
  );
  const translatedFeatures = features.map((entry, index) => ({
    ...entry,
    text: resolvePhiTextPlaceholders(
      translatedTexts[textEntries.length + index] ?? entry.text,
      maskedFeatures[index]!.names,
      runtime,
      entry.values,
    ),
  }));
  /* Drawn here, so the list Control never reaches the browser with the Card (`listContent`). */
  const featureList = translatedFeatures.length > 0 ? (
    <PhiBulletListControl
      listStyle={resolvePhiBulletListStyle(config?.featureList)}
      items={buildPhiBulletListTree(translatedFeatures, (entry) => entry.text)}
    />
  ) : null;

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
  const link = preview ? null : resolvePhiLinkHref(config?.linkTarget, links);
  const actionLink = preview || !actionEnabled ? null : resolvePhiLinkHref(config?.actionLinkTarget, links);


  const clientConfig: PhiCardWidgetClientConfig = {
    surface: config?.surface ?? null,
    image: presentation.url
      ? {
          presentation,
          ...(config?.imageOpacity == null ? {} : { opacity: config.imageOpacity / 100 }),
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
    iconColor: config?.iconColor,
    iconBackground: config?.iconBackground,
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
        }
      : null,
    variant: config?.variant,
    body: config?.body,
    highlight: config?.highlight,
    badgeColor: config?.badgeColor,
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
