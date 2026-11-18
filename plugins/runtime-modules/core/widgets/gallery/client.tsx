"use client";

import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { useMemo, type CSSProperties } from "react";

import { PhiSequenceRun, resolvePhiSequenceRunSpan } from "../../../../../components/motion/phi-sequence-run";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiImageControl } from "../../../../../components/controls/phi-image-control";
import { readPhiAspectRatio, resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import {
  PHI_GALLERY_WIDGET_DEFAULT_LABELS,
  type PhiGalleryWidgetLabels,
} from "../../../../../components/widgets/label-types/gallery";
import { isPhiMediaSvgContentType } from "../../../../../constants/media";
import type { PhiImageAssetVariantKeyValue, PhiPublicMediaAssetReference } from "../../../../../types/media";
import type { PhiRecordPicture } from "../../../../../types/record-provider";
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
  /** The page record's pictures, in place of `images`: each by its address, drawn as an Image Widget draws a URL. */
  pictures?: readonly PhiRecordPicture[];
  labels?: PhiGalleryWidgetLabels;
};

/** A thumbnail's width in pixels: also what the optimiser is told to size it for. */
const PHI_GALLERY_THUMBNAIL_WIDTH = 80;

/** One picture to draw: a public Asset of the Folder, or a picture a record names by its address. */
type GalleryItem =
  | { kind: "asset"; key: string; image: PhiPublicMediaAssetReference }
  | { kind: "url"; key: string; picture: PhiRecordPicture };

function GalleryPicture({
  item,
  variantKey,
  fit,
  preview,
  sizes,
  aspectRatio,
}: {
  item: GalleryItem;
  variantKey: PhiImageAssetVariantKeyValue | undefined;
  fit: "cover" | "contain";
  preview: boolean;
  sizes: string;
  aspectRatio: string;
}) {
  // The frame's proportion is known, so the crop can keep the whole focal rectangle in view.
  const frameAspectRatio = readPhiAspectRatio(aspectRatio);
  const presentation = item.kind === "asset"
    ? resolvePhiImagePresentation({
        sourceKind: "asset",
        assetId: item.image.id,
        variantKey,
        variantVersion: item.image.variantVersion,
        deliveryRevision: item.image.deliveryRevision,
        originalUrl: item.image.deliveryUrl,
        focalRect: item.image.focalRect,
        fit,
        sourceWidth: item.image.width,
        sourceHeight: item.image.height,
        frameAspectRatio,
      })
    // A picture of a record has no rendition and no focal rectangle: its address, in the frame.
    : resolvePhiImagePresentation({ sourceKind: "url", sourceUrl: item.picture.src, fit, frameAspectRatio });
  // The Folder route hands out public Assets only, so a raster original may go through the optimiser.
  const optimizable = item.kind === "asset"
    ? presentation.kind === "generated-variant" || !isPhiMediaSvgContentType(item.image.contentType)
    : false;
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
        source={item.kind === "asset" ? "asset" : "url"}
        alt={(item.kind === "asset" ? item.image.altText : item.picture.alt) ?? ""}
        title={item.kind === "asset" ? item.image.title ?? undefined : undefined}
        blurDataUrl={item.kind === "asset" ? item.image.blurDataUrl : undefined}
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

export function PhiGalleryWidget({ config, images: imagesInput, pictures, labels: labelsInput }: PhiGalleryWidgetProps) {
  const { token } = usePhiConfig();
  const labels = labelsInput ?? PHI_GALLERY_WIDGET_DEFAULT_LABELS;
  const items = useMemo<GalleryItem[]>(() => pictures
    ? pictures.map((picture, index) => ({ kind: "url", key: `${index}:${picture.src}`, picture }))
    : (imagesInput ?? []).map((image) => ({ kind: "asset", key: String(image.id), image })), [imagesInput, pictures]);
  const span = resolvePhiSequenceRunSpan(config?.visibleCount, items.length);
  // What a picture of this window is worth of the viewport, for the optimiser's choice of rendition.
  const sizes = span === 1 ? "100vw" : `(max-width: 768px) 100vw, ${Math.ceil(100 / span)}vw`;
  const { aspectRatio, fit } = resolvePhiGalleryFrame(config);
  const thumbnails = config?.thumbnails === true
    ? items.map((item) => ({
        key: item.key,
        label: (item.kind === "asset" ? item.image.altText : item.picture.alt) ?? "",
        content: (
          <GalleryPicture
            item={item}
            variantKey={config?.variantKey}
            fit={fit}
            preview={false}
            sizes={`${PHI_GALLERY_THUMBNAIL_WIDTH}px`}
            aspectRatio={aspectRatio}
          />
        ),
      }))
    : undefined;
  const frameStyle: CSSProperties = {
    minWidth: 0,
    borderRadius: token.borderRadius,
    overflow: "hidden",
  };

  if (items.length === 0) {
    return <PhiEmptyControl description={labels.empty} />;
  }

  return (
    <PhiSequenceRun
      items={items.map((item) => (
        <GalleryPicture
          key={item.key}
          item={item}
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
      thumbnails={thumbnails}
      thumbnailWidth={PHI_GALLERY_THUMBNAIL_WIDTH}
    />
  );
}
