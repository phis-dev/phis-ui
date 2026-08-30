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
          highlight: config?.highlight,
        },
      }}
    />
  );
}
