import { trBulk } from "../../../../../server-helpers/translate";
import type { PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiCmsCardWidgetConfig } from "./config";
import { resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import { resolvePhiPublicAssetReference } from "../../../../../components/widgets/helpers/internal-reference-resolver.server";
import type { PhiCardWidgetClientConfig } from "./client";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiCardWidgetLabels = {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: string;
  actionLabel?: string;
  value?: string;
};

export type PhiCardWidgetConfig = PhiCardWidgetClientConfig & {
  translate?: boolean;
};

export type PhiCardWidgetProps = PhiServerBlockBaseProps<
  PhiCardWidgetLabels,
  PhiCmsCardWidgetConfig
>;

export async function PhiCardWidget({
  labels,
  config,
  runtime,
}: PhiCardWidgetProps) {
  const translate = config?.translate ?? true;
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

  const eyebrow = translatedByKey.get("eyebrow");
  const title = translatedByKey.get("title");
  const description = translatedByKey.get("description");
  const meta = translatedByKey.get("meta");
  const actionLabel = translatedByKey.get("actionLabel");
  /*
   * The figure is left out of that list on purpose.
   *
   * A label set answers for words, and a Site's own number is not one. Sending it through the
   * translator would make "1,204" a message id, and `translate` is a per-Widget switch, so a stat card
   * that turned it off to protect the figure would lose its title's translation with it.
   */
  const value = labels.value ?? config?.value;
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

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Card}
      componentProps={{
        labels: {
          eyebrow,
          title,
          description,
          meta,
          actionLabel,
          value,
        },
        config: {
          imageUrl: presentation.url ?? undefined,
          imageFit: presentation.fit,
          imagePosition: presentation.objectPosition,
          alt: config?.alt ?? resolvedAsset?.altText ?? undefined,
          blurDataUrl: resolvedAsset?.blurDataUrl ?? config?.blurDataUrl ?? undefined,
          href: config?.href,
          newTab: config?.newTab,
          actionHref: config?.actionHref,
          actionNewTab: config?.actionNewTab,
          variant: config?.variant,
          body: config?.body,
          highlight: config?.highlight,
        },
      }}
    />
  );
}
