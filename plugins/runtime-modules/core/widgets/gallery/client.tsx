"use client";

import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { useMemo, type CSSProperties } from "react";

import { PhiSequenceRun, resolvePhiSequenceRunSpan } from "../../../../../components/motion/phi-sequence-run";
import { PhiImageControl } from "../../../../../components/controls/phi-image-control";
import { readPhiAspectRatio, resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import {
  PHI_GALLERY_WIDGET_DEFAULT_LABELS,
  type PhiGalleryWidgetLabels,
} from "../../../../../components/widgets/label-types/gallery";
import { isPhiMediaSvgContentType } from "../../../../../constants/media";
import type { PhiImageAssetVariantKeyValue, PhiPublicMediaAssetReference } from "../../../../../types/media";
import type { PhiCmsGalleryWidgetConfig } from "./config";
import { resolvePhiGalleryFrame } from "./defaults";

/**
 * A run of pictures. How it moves and stops is `PhiSequenceRun`'s; what is here is the picture: its
 * rendition, its frame, and that it loads eagerly -- the run mounts only what its window wants, so
 * reaching a picture already means it is wanted.
 */

export type PhiGalleryWidgetProps = {
  config?: PhiCmsGalleryWidgetConfig;
  /** The server's answer to the binding: public Assets, in the order the Folder was asked for. */
  images?: PhiPublicMediaAssetReference[];
  labels?: PhiGalleryWidgetLabels;
};

function GalleryPicture({
  image,
  variantKey,
  fit,
  preview,
  sizes,
  aspectRatio,
}: {
  image: PhiPublicMediaAssetReference;
  variantKey: PhiImageAssetVariantKeyValue | undefined;
  fit: "cover" | "contain";
  preview: boolean;
  sizes: string;
  aspectRatio: string;
}) {
  const presentation = resolvePhiImagePresentation({
    sourceKind: "asset",
    assetId: image.id,
    variantKey,
    variantVersion: image.variantVersion,
    deliveryRevision: image.deliveryRevision,
    originalUrl: image.deliveryUrl,
    focalRect: image.focalRect,
    fit,
    sourceWidth: image.width,
    sourceHeight: image.height,
    // The frame's proportion is known, so the crop can keep the whole focal rectangle in view.
    frameAspectRatio: readPhiAspectRatio(aspectRatio),
  });
  // The Folder route hands out public Assets only, so a raster original may go through the optimiser.
  const optimizable = presentation.kind === "generated-variant" || !isPhiMediaSvgContentType(image.contentType);
  /*
   * The frame is a block of its own inside the track item, not the item itself. A flex item that is
   * stretched (`alignItems: stretch` on the track) has no height of its own for an aspect ratio to
   * stand on in WebKit, which sized it by its content -- a picture at 100% of nothing -- and drew the
   * Gallery as a strip a few pixels tall. A block in flow with a width and an aspect ratio is a
   * definite box everywhere, and the picture fills it from the corners rather than through a chain
   * of percentage heights.
   */
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio }}>
      <PhiImageControl
        presentation={presentation}
        source="asset"
        alt={image.altText ?? ""}
        title={image.title ?? undefined}
        blurDataUrl={image.blurDataUrl}
        optimizable={optimizable}
        sizes={sizes}
        // Unconditionally eager, and that is the whole mechanism: nothing outside the window and its
        // lookahead is mounted, so reaching this line already means the picture is wanted.
        loading="eager"
        preview={preview}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        imageStyle={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export function PhiGalleryWidget({ config, images: imagesInput, labels: labelsInput }: PhiGalleryWidgetProps) {
  const { token } = usePhiConfig();
  const labels = labelsInput ?? PHI_GALLERY_WIDGET_DEFAULT_LABELS;
  const images = useMemo(() => imagesInput ?? [], [imagesInput]);
  const span = resolvePhiSequenceRunSpan(config?.visibleCount, images.length);
  // What a picture of this window is worth of the viewport, for the optimiser's choice of rendition.
  const sizes = span === 1 ? "100vw" : `(max-width: 768px) 100vw, ${Math.ceil(100 / span)}vw`;
  const { aspectRatio, fit } = resolvePhiGalleryFrame(config);
  const frameStyle: CSSProperties = {
    minWidth: 0,
    borderRadius: token.borderRadius,
    overflow: "hidden",
  };

  return (
    <PhiSequenceRun
      items={images.map((image) => (
        <GalleryPicture
          key={image.id}
          image={image}
          variantKey={config?.variantKey}
          fit={fit}
          preview={config?.preview === true}
          sizes={sizes}
          aspectRatio={aspectRatio}
        />
      ))}
      settings={config}
      labels={labels}
      itemStyle={frameStyle}
    />
  );
}
