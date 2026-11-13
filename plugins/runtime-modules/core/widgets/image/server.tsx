import type { PhiBlockRuntime, PhiCmsContentWidgetNode } from "../../../../../types";
import type { PhiCmsImageWidgetConfig } from "./config";
import { resolvePhiPublicAssetReference } from "../../../../../components/widgets/helpers/internal-reference-resolver.server";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiImageWidgetLabels } from "../../../../../components/widgets/label-sets/image";
import type { PhiImageWidgetLabels } from "../../../../../components/widgets/label-types/image";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { trBulk, trBulkForLocale } from "../../../../../server-helpers/translate";

export type PhiImageWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale" | "site">;
  widget?: PhiCmsContentWidgetNode | null;
  config?: PhiCmsImageWidgetConfig | null;
};

async function resolveImageWidgetLabels(runtime: Pick<PhiBlockRuntime, "locale">): Promise<PhiImageWidgetLabels> {
  return getPhiImageWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
}

export async function PhiImageWidgetServer({
  runtime,
  widget,
  config,
}: PhiImageWidgetServerProps) {
  const labels = await resolveImageWidgetLabels(runtime);
  const assetId = widget?.resolvedContent?.assetId ?? config?.assetId ?? null;
  const resolvedAsset =
    config?.sourceKind === "asset" && typeof assetId === "number"
      ? await resolvePhiPublicAssetReference({ runtime, assetId }).catch(() => null)
      : null;
  const recordTitle = widget?.resolvedContent?.textFields.title?.value?.trim();
  const recordAlt = widget?.resolvedContent?.textFields.alt?.value?.trim();
  /*
   * The picture's description and title in the page's language, as every other Widget's words.
   *
   * A Content record's text arrives translated already and is taken as it is. The rest -- the Asset's own
   * description from the Media library, or what the Widget's config states for an address -- is the Site's
   * text and goes through the Site's translation, unless the Widget says not to translate.
   */
  const translate = !hasPhiFlag(widget?.flags ?? 0, PhiCmsFlags.NoTranslate);
  const sourceTexts = [
    recordAlt ? "" : (resolvedAsset?.altText ?? "").trim(),
    recordTitle ? "" : (resolvedAsset?.title ?? "").trim(),
    config?.sourceKind === "asset" ? "" : (config?.alt ?? "").trim(),
    config?.sourceKind === "asset" ? "" : (config?.title ?? "").trim(),
  ];
  const [assetAlt, assetTitle, configAlt, configTitle] = translate && sourceTexts.some(Boolean)
    ? await (runtime.locale.current ? trBulkForLocale(runtime.locale.current, sourceTexts) : trBulk(sourceTexts))
    : sourceTexts;
  const contentResolvedAsset = resolvedAsset
    ? {
        ...resolvedAsset,
        title: recordTitle || assetTitle || resolvedAsset.title,
        altText: recordAlt || assetAlt || resolvedAsset.altText,
      }
    : null;
  const translatedConfig = config && config.sourceKind !== "asset"
    ? { ...config, ...(configAlt ? { alt: configAlt } : {}), ...(configTitle ? { title: configTitle } : {}) }
    : config;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Image}
      componentProps={{
        labels,
        config: translatedConfig ?? undefined,
        resolvedAsset: contentResolvedAsset,
        focalRect: contentResolvedAsset?.focalRect ?? null,
      }}
    />
  );
}
