import { resolvePhiImageAssetVariantSpec } from "../../../../../constants/media";
import { resolvePhiMediaAspectRatioCss, type PhiMediaAspectRatio } from "../../../../../components/media/aspect-ratios";
import type { PhiCmsGalleryWidgetConfig } from "./config";

/** What a Gallery is drawn at where nobody said otherwise, on the page and on the canvas alike. */
export const PHI_GALLERY_DEFAULT_ASPECT_RATIO: PhiMediaAspectRatio = "16:9";

/**
 * The frame every picture of the run stands in.
 *
 * A variant is cut to a width and a height of its own, so its proportion is the frame's and the
 * picture fills it exactly -- the author's ratio and fit are not asked for and not read. Only the
 * original, which comes in every shape, takes them.
 */
export function resolvePhiGalleryFrame(
  config: Pick<PhiCmsGalleryWidgetConfig, "variantKey" | "aspectRatio" | "fit"> | undefined,
): { aspectRatio: string; fit: "cover" | "contain" } {
  const spec = config?.variantKey == null ? null : resolvePhiImageAssetVariantSpec(config.variantKey);
  return spec
    ? { aspectRatio: `${spec.width} / ${spec.height}`, fit: "cover" }
    : {
        aspectRatio: resolvePhiMediaAspectRatioCss(config?.aspectRatio ?? PHI_GALLERY_DEFAULT_ASPECT_RATIO),
        fit: config?.fit ?? "cover",
      };
}
