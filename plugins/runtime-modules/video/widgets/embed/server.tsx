import type { PhiBlockRuntime } from "../../../../../types";
import { PhiImageAssetVariantKey } from "../../../../../constants/media";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import { resolvePhiPublicAssetReference } from "../../../../../components/widgets/helpers/internal-reference-resolver.server";
import { getPhiVideoWidgetLabels } from "../../../../../components/widgets/label-sets/video";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";
import type { PhiVideoEmbedWidgetConfig } from "./config";

export type PhiVideoEmbedWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale" | "site">;
  config?: PhiVideoEmbedWidgetConfig | null;
};

/**
 * The half that may read the Site: the words, and the poster out of the Media library.
 *
 * Which provider the address belongs to is decided in the Client half, where the registry is. Nothing
 * about the video is fetched here and nothing is fetched there either until somebody presses the button
 * -- this renderer's whole contribution is a picture this Site already owns.
 */
export async function PhiVideoEmbedWidgetServer({ runtime, config }: PhiVideoEmbedWidgetServerProps) {
  const credentials = readPhiServerApiCredentials();
  const labels = await getPhiVideoWidgetLabels({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  });

  const posterAsset = typeof config?.posterAssetId === "number"
    ? await resolvePhiPublicAssetReference({ runtime, assetId: config.posterAssetId })
    : null;
  const presentation = posterAsset
    ? resolvePhiImagePresentation({
        sourceKind: "asset",
        assetId: posterAsset.id,
        // A poster is read at the width of the frame, which is what the Hero rendition is for.
        variantKey: PhiImageAssetVariantKey.Hero,
        variantVersion: posterAsset.variantVersion,
        deliveryRevision: posterAsset.deliveryRevision,
        originalUrl: posterAsset.deliveryUrl,
        sourceWidth: posterAsset.width,
        sourceHeight: posterAsset.height,
      })
    : null;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.VideoEmbed}
      componentProps={{
        labels,
        config: config ?? undefined,
        poster: presentation?.url
          ? {
              url: presentation.url,
              /*
               * A generated rendition is a raster the optimizer can always read. The original may be an
               * SVG it refuses, and a poster is not worth a second question about which originals are
               * safe, so the original is served as it is.
               */
              unoptimized: presentation.kind === "original",
            }
          : null,
      }}
    />
  );
}
