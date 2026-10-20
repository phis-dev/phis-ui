"use client";

import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { useCallback, useMemo, useState, type CSSProperties } from "react";

import {
  PhiSequenceViewport,
  resolvePhiSequenceWindowStart,
} from "../../../../../components/motion/phi-sequence-viewport";
import { usePhiSequenceAutoplay } from "../../../../../components/motion/use-phi-sequence-autoplay";
import { usePhiSequenceGestures } from "../../../../../components/motion/use-phi-sequence-gestures";
import {
  resolvePhiCarouselCurrentPage,
  resolvePhiCarouselPageStarts,
  resolvePhiCarouselStep,
} from "../../../../../components/layouts/phi-carousel-pages";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiImageControl } from "../../../../../components/controls/phi-image-control";
import { readPhiAspectRatio, resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import {
  PHI_GALLERY_WIDGET_DEFAULT_LABELS,
  type PhiGalleryWidgetLabels,
} from "../../../../../components/widgets/label-types/gallery";
import { isPhiMediaSvgContentType } from "../../../../../constants/media";
import type { PhiPublicMediaAssetReference } from "../../../../../types/media";
import type { PhiCmsGalleryWidgetConfig } from "./config";

/**
 * A run of pictures, and the two things the browser will not do for us.
 *
 * The first is knowing which picture is next. Native lazy loading decides from an element's distance
 * to the viewport, so on a fade -- where every picture sits in the same place -- it loads all of them
 * at once, and on a slide it loads the next one as it arrives, during the transition. Next's escape
 * hatch for a scrolling container, `lazyRoot`, is a deprecated no-op in Next 16. So the window says
 * what loads: what is mounted is wanted, and what is wanted is fetched eagerly.
 *
 * The second is stopping: `usePhiSequenceAutoplay` holds every way to decline movement nobody asked
 * for, and the Pause button is the one a finger has, since a finger neither hovers nor tabs. Where
 * the window stops -- the last window rather than the last multiple of the window -- is the Carousel
 * Layout's list of stops (`phi-carousel-pages.ts`), read by the arrows, the dots and the timer alike.
 */

const DEFAULT_ASPECT_RATIO = "16 / 9";

/** The dots' label, `%1` the first and `%2` the last picture a page shows. */
function formatPageLabel(template: string, from: number, to: number) {
  return template.replace("%1", String(from)).replace("%2", String(to));
}
const DEFAULT_GAP = "8px";

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
  variantKey: string | undefined;
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
  const visibleCount = config?.visibleCount ?? 1;
  const windowAnchor = config?.windowAnchor ?? "start";
  const loop = config?.loop ?? false;
  const controls = config?.controls ?? "both";
  const autoplayMs = config?.autoplayMs ?? 0;

  const [activeIndex, setActiveIndex] = useState(0);

  const span = Math.min(visibleCount, Math.max(images.length, 1));
  const pageStarts = useMemo(() => resolvePhiCarouselPageStarts(images.length, span), [images.length, span]);
  const lastStart = pageStarts[pageStarts.length - 1] ?? 0;

  const step = useCallback((direction: 1 | -1) => {
    setActiveIndex((current) => resolvePhiCarouselStep(pageStarts, current, direction, loop));
  }, [loop, pageStarts]);
  const advance = useCallback(() => step(1), [step]);
  const autoplay = usePhiSequenceAutoplay({ intervalMs: autoplayMs, active: images.length > span, advance });
  // A step somebody took: the next automatic one is a whole interval away again.
  const stepByHand = useCallback((direction: 1 | -1) => {
    step(direction);
    autoplay.restart();
  }, [autoplay, step]);
  const gestures = usePhiSequenceGestures({ step: stepByHand });

  if (images.length === 0) {
    return null;
  }

  const windowStart = resolvePhiSequenceWindowStart({
    activeIndex: activeIndex,
    visibleCount: span,
    itemCount: images.length,
    anchor: windowAnchor,
  });
  const lookahead = config?.lookahead ?? 1;
  const pageCount = pageStarts.length;
  const currentPage = resolvePhiCarouselCurrentPage(pageStarts, windowStart);
  // What a picture of this window is worth of the viewport, for the optimiser's choice of rendition.
  const sizes = span === 1 ? "100vw" : `(max-width: 768px) 100vw, ${Math.ceil(100 / span)}vw`;

  const aspectRatio = config?.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  const frameStyle: CSSProperties = {
    minWidth: 0,
    borderRadius: token.borderRadius,
    overflow: "hidden",
  };

  const atStart = windowStart <= 0;
  const atEnd = windowStart >= lastStart;
  // Two disabled arrows over a single picture say nothing; the dots already know to stay away.
  const showArrows = (controls === "arrows" || controls === "both") && images.length > span;
  const showDots = (controls === "dots" || controls === "both") && pageCount > 1;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.region}
      style={{ display: "flex", flexDirection: "column", gap: token.marginXS, width: "100%", minWidth: 0, ...gestures.style }}
      {...autoplay.holdHandlers}
      {...gestures.handlers}
    >
      {/* Announced only while it stands still: a moving sequence read aloud is noise. */}
      <div style={{ position: "relative", minWidth: 0 }} aria-live={autoplay.running ? "off" : "polite"}>
        <PhiSequenceViewport
          items={images.map((image) => (
            <GalleryPicture
              key={image.id}
              image={image}
              variantKey={config?.variantKey}
              fit={config?.fit ?? "cover"}
              preview={config?.preview === true}
              sizes={sizes}
              aspectRatio={aspectRatio}
            />
          ))}
          activeIndex={activeIndex}
          visibleCount={span}
          anchor={windowAnchor}
          transition={config?.transition ?? "slide"}
          {...(config?.durationMs === undefined ? {} : { durationMs: config.durationMs })}
          {...(config?.easing === undefined ? {} : { easing: config.easing })}
          lookahead={lookahead}
          mountPolicy={config?.mountPolicy ?? "lazy-keep"}
          gap={config?.gap ?? DEFAULT_GAP}
          itemStyle={frameStyle}
        />
        {showArrows ? (
          <>
            <div style={{ position: "absolute", insetBlockStart: "50%", insetInlineStart: token.marginXS, transform: "translateY(-50%)" }}>
              <PhiButtonControl
                icon={<PhiIcon name="left" size="inherit" />}
                ariaLabel={labels.previous}
                shape="circle"
                disabled={atStart && !loop}
                onClick={() => stepByHand(-1)}
              />
            </div>
            <div style={{ position: "absolute", insetBlockStart: "50%", insetInlineEnd: token.marginXS, transform: "translateY(-50%)" }}>
              <PhiButtonControl
                icon={<PhiIcon name="right" size="inherit" />}
                ariaLabel={labels.next}
                shape="circle"
                disabled={atEnd && !loop}
                onClick={() => stepByHand(1)}
              />
            </div>
          </>
        ) : null}
        {autoplay.offered ? (
          // The one stop a finger has: hovering and tabbing are not things a touch screen does.
          <div style={{ position: "absolute", insetBlockEnd: token.marginXS, insetInlineEnd: token.marginXS }}>
            <PhiButtonControl
              icon={<PhiIcon name={autoplay.stopped ? "play-circle" : "pause-circle"} size="inherit" />}
              ariaLabel={autoplay.stopped ? labels.play : labels.pause}
              ariaPressed={autoplay.stopped}
              shape="circle"
              onClick={autoplay.toggleStopped}
            />
          </div>
        ) : null}
      </div>
      {showDots ? (
        <div role="group" aria-label={labels.pages} style={{ display: "flex", justifyContent: "center", gap: token.marginXXS }}>
          {Array.from({ length: pageCount }, (_, page) => (
            <button
              key={page}
              type="button"
              aria-label={formatPageLabel(
                labels.page,
                (pageStarts[page] ?? 0) + 1,
                Math.min((pageStarts[page] ?? 0) + span, images.length),
              )}
              aria-current={page === currentPage || undefined}
              onClick={() => {
                setActiveIndex(pageStarts[page] ?? 0);
                autoplay.restart();
              }}
              style={{
                width: page === currentPage ? token.controlHeightXS : token.marginXS,
                height: token.marginXS,
                padding: 0,
                border: "none",
                cursor: "pointer",
                borderRadius: token.borderRadiusSM,
                background: page === currentPage ? token.colorPrimary : token.colorFill,
                transition: `width ${token.motionDurationMid}, background ${token.motionDurationMid}`,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
