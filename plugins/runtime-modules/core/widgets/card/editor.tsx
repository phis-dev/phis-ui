"use client";

import { useEffect, useRef, useState } from "react";

import { buildPhiMediaAssetContentDeliveryUrl } from "../../../../../constants/media";
import { resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import { usePhiAuthoringAssetDetails } from "../../../../../components/media/use-authoring-asset-details";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import type { PhiCmsCardWidgetConfig } from "./config";
import { PhiCardWidgetClient } from "../../../../../components/widgets/shared/card-body-client";
import { PHI_CARD_DEFAULT_SURFACE } from "../../../../../components/widgets/shared/card-vocabulary";

export type PhiCardWidgetEditorProps = {
  config: PhiCmsCardWidgetConfig;
  title?: string;
};

/**
 * How wide the card stands on the canvas, so the editor can say when its picture is narrower.
 *
 * Only the canvas can know it: a card's width is its slot's, and the slot's is the Layout's and the
 * viewport's. A picture rendered wider than its variant is enlarged, and enlarged is soft.
 */
function useCanvasWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry ? Math.round(entry.contentRect.width) : null));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * The Editor draws the Card through the same presentation resolver the server render uses. Reading
 * the authoring Asset is what keeps the two equivalent: without the delivery revision the Editor
 * would keep the crop that was cached before a focal change while Live already shows the new one.
 *
 * A Page target cannot be resolved here -- which address a Page answers on is the server's to know -- so
 * the canvas draws a card with a Page target as a card without a link; an external target is a link.
 */
export function PhiCardWidgetEditor({ config, title }: PhiCardWidgetEditorProps) {
  const assetId = config.sourceKind === "asset" ? config.assetId ?? null : null;
  const asset = usePhiAuthoringAssetDetails(assetId);
  const [canvasRef, canvasWidth] = useCanvasWidth();
  const presentation = resolvePhiImagePresentation({
    sourceKind: config.sourceKind,
    assetId,
    variantKey: config.sourceKind === "asset" ? config.variantKey : null,
    variantVersion: asset?.variantVersion ?? (config.sourceKind === "asset" ? config.variantVersion : null),
    deliveryRevision: asset?.deliveryRevision,
    originalUrl: assetId == null ? null : buildPhiMediaAssetContentDeliveryUrl(assetId),
    sourceUrl: config.sourceKind === "url" ? config.sourceUrl : undefined,
    focalRect: asset?.meta?.focalRect,
    sourceWidth: asset?.width,
    sourceHeight: asset?.height,
  });
  const link = config.linkTarget?.kind === "external" ? config.linkTarget : null;
  const action = config.actionLinkTarget?.kind === "external" ? config.actionLinkTarget : null;
  const pictureTooNarrow = presentation.url != null
    && presentation.width != null
    && canvasWidth != null
    && presentation.width < canvasWidth;

  return (
    <div ref={canvasRef} style={{ position: "relative", width: "100%" }}>
      <PhiCardWidgetClient
        labels={{
          eyebrow: config.eyebrow,
          title: config.title ?? title,
          description: config.description,
          meta: config.meta,
          actionLabel: config.actionLabel,
          value: config.value,
        }}
        config={{
          // A node that states no Surface takes the card's declared one, as the page render does.
          surface: config.surface ?? PHI_CARD_DEFAULT_SURFACE,
          image: presentation.url
            ? {
                presentation,
                source: config.sourceKind === "asset" ? "asset" : "url",
                alt: config.alt ?? asset?.altText ?? "",
                blurDataUrl: asset?.blurDataUrl ?? null,
              }
            : null,
          iconName: config.icon,
          iconPlacement: config.iconPlacement,
          textAlign: config.textAlign,
          headingLevel: config.headingLevel,
          href: link?.href,
          newTab: link?.newTab,
          external: link != null,
          actionHref: action?.href,
          actionNewTab: action?.newTab,
          variant: config.variant,
          body: config.body,
          highlight: config.highlight,
          hoverEffect: config.hoverEffect,
        }}
      />
      {pictureTooNarrow ? (
        <PhiTypographyControl
          style={{
            position: "absolute",
            left: "0.375rem",
            top: "0.375rem",
            zIndex: 3,
            color: "#fff",
            fontSize: 12,
            lineHeight: 1,
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.85)",
            pointerEvents: "none",
          }}
        >
          {`${presentation.width}px picture in a ${canvasWidth}px card: choose a larger variant`}
        </PhiTypographyControl>
      ) : null}
    </div>
  );
}
