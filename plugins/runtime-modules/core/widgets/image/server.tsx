import type { PhiBlockRuntime, PhiCmsContentWidgetNode } from "../../../../../types";
import type { PhiCmsImageWidgetConfig } from "./config";
import { resolvePhiPublicAssetReference } from "../../../../../components/widgets/helpers/internal-reference-resolver.server";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiImageWidgetLabels } from "../../../../../components/widgets/label-sets/image";
import type { PhiImageWidgetLabels } from "../../../../../components/widgets/label-types/image";

export type PhiImageWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "phis" | "locale" | "site">;
  widget?: PhiCmsContentWidgetNode | null;
  config?: PhiCmsImageWidgetConfig | null;
};

async function resolveImageWidgetLabels(runtime: Pick<PhiBlockRuntime, "phis" | "locale">): Promise<PhiImageWidgetLabels> {
  return getPhiImageWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
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
  const title = widget?.resolvedContent?.textFields.title?.value?.trim();
  const altText = widget?.resolvedContent?.textFields.alt?.value?.trim();
  const contentResolvedAsset = resolvedAsset
    ? {
        ...resolvedAsset,
        title: title || resolvedAsset.title,
        altText: altText || resolvedAsset.altText,
      }
    : null;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Image}
      componentProps={{
        labels,
        config: config ?? undefined,
        resolvedAsset: contentResolvedAsset,
        focalRect: contentResolvedAsset?.focalRect ?? null,
      }}
    />
  );
}
