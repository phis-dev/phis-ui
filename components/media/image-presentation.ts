import {
  buildPhiImageAssetVariantDeliveryUrl,
  normalizePhiImageAssetVariantKey,
  resolvePhiImageAssetVariantSpec,
  type PhiImageAssetVariantSpec,
} from "../../constants/media";
import {
  normalizeMediaFocalRect,
  resolveFocalRectCoverImageStyle,
  resolveFocalRectObjectPosition,
  type MediaFocalRect,
} from "./focal-rect";

/**
 * An original Asset and a generated variant are different presentation inputs, and every surface
 * that draws an image has to make the same distinction. This module owns that decision once so the
 * Image Widget, the Card Widget, and Background bases cannot drift apart:
 *
 * - The ORIGINAL carries the raw pixels. Authoring owns how it meets its box, so the configured
 *   `fit` and `objectPosition` apply, and where no explicit position exists the focal rectangle
 *   supplies one.
 * - A GENERATED VARIANT is a finished server crop. The server already consumed the focal rectangle,
 *   so applying it a second time would shift an image that is already framed. The variant spec
 *   decides `fit`, the position is always centered, and a box with a different aspect ratio gets
 *   centered cover overflow rather than a stretch.
 *
 * The single exception is an unsaved focal edit: Authoring may set `simulateVariantCrop` to draw the
 * original and reproduce the server crop locally, because the stored variant still shows the old
 * framing. After the save the invalidated variant takes over again under its new variant version.
 */

export type PhiImagePresentationFit = "cover" | "contain" | "fill";
export type PhiImagePresentationKind = "original" | "generated-variant";

/**
 * Render-time projection of the Asset a config binds by id. It carries server-owned delivery facts
 * that must never be persisted as authoring intent: the delivery revision, the variant version a focal
 * change bumps, the focal rectangle itself, and the intrinsic size. Server renders and Builder drafts
 * both fill it from the bulk reference resolver, Authoring fills it from the Picker, and
 * `builder-persistence` strips it before saving -- the same lifecycle `resolvedContent` has on
 * Content Widgets.
 */
export type PhiImageDeliveryProjection = {
  deliveryUrl?: string | null;
  deliveryRevision?: number | null;
  variantVersion?: number | null;
  focalRect?: unknown;
  width?: number | null;
  height?: number | null;
};

export type PhiImagePresentationInput = {
  sourceKind?: "asset" | "url" | null;
  assetId?: number | null;
  variantKey?: unknown;
  variantVersion?: number | null;
  /**
   * Server-owned revision of the delivered original. Both this and `variantVersion` exist to defeat a
   * cached URL rather than to select content: the server always serves the newest bytes. Measured on
   * 2026-08-20, a focal change bumps `variantVersion` and leaves `deliveryRevision` untouched, so the
   * variant URL is what moves while the original keeps its revision.
   */
  deliveryRevision?: number | null;
  /** Delivery URL of the original bytes. An Asset source renders nothing without it. */
  originalUrl?: string | null;
  /** Delivery URL for a non-Asset source. */
  sourceUrl?: string | null;
  focalRect?: unknown;
  /** Authoring intent. Consumed by the original only. */
  fit?: PhiImagePresentationFit | null;
  /** Authoring intent. Consumed by the original only. */
  objectPosition?: string | null;
  /** Intrinsic size of the original, when known. */
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  /** Unsaved focal edit: draw the original and simulate the server crop. */
  simulateVariantCrop?: boolean;
};

export type PhiImagePresentation = {
  kind: PhiImagePresentationKind;
  url: string | null;
  fit: PhiImagePresentationFit;
  objectPosition: string;
  /** Intended presentation box: the variant spec when one is configured, else the original size. */
  width: number | null;
  height: number | null;
  focalRect: MediaFocalRect | null;
  variantSpec: PhiImageAssetVariantSpec | null;
  /**
   * Absolutely positioned style that reproduces the server crop from the original. Non-null only
   * while `simulateVariantCrop` is in effect AND the variant actually crops -- a `contain` variant
   * letterboxes the whole image instead, so there is nothing to reproduce and `fit` carries it.
   * It belongs on the image inside a clipped wrapper.
   */
  simulatedCropStyle: ReturnType<typeof resolveFocalRectCoverImageStyle>;
};

/**
 * Removes every render-time Asset projection from a config before it is persisted. Shape-driven so
 * a Background nested in a new container cannot smuggle a delivery revision into stored content,
 * where it would go stale the moment the focal rectangle changes.
 */
export function stripPhiResolvedAssetProjections<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripPhiResolvedAssetProjections) as unknown as T;
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const stripped: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key === "resolvedAsset") continue;
    stripped[key] = stripPhiResolvedAssetProjections(entry);
  }

  return stripped as T;
}

export function resolvePhiImagePresentation(
  input: PhiImagePresentationInput,
): PhiImagePresentation {
  const isAssetSource = input.sourceKind === "asset";
  const variantKey = isAssetSource ? normalizePhiImageAssetVariantKey(input.variantKey) : null;
  const variantSpec = variantKey == null ? null : resolvePhiImageAssetVariantSpec(variantKey);
  const focalRect = normalizeMediaFocalRect(input.focalRect) ?? null;
  const simulate = input.simulateVariantCrop === true && variantSpec != null;
  const kind: PhiImagePresentationKind =
    variantSpec != null && !simulate ? "generated-variant" : "original";

  const originalUrl = input.originalUrl?.trim() || null;
  const variantUrl =
    kind === "generated-variant" && input.assetId != null
      ? buildPhiImageAssetVariantDeliveryUrl(
          input.assetId,
          variantKey,
          input.variantVersion,
          input.deliveryRevision,
        )
      : null;
  const url = isAssetSource
    ? originalUrl == null
      ? null
      : variantUrl ?? originalUrl
    : input.sourceUrl?.trim() || null;

  // A simulated crop places the image absolutely, so a position would have nothing left to steer, and a
  // simulated `contain` shows the whole image, where a focal position would only misalign the letterbox.
  const objectPosition =
    kind === "generated-variant" || (simulate && variantSpec!.fit !== "cover")
      ? "center"
      : simulate
        ? resolveFocalRectObjectPosition(undefined, focalRect)
        : resolveFocalRectObjectPosition(input.objectPosition, focalRect);

  return {
    kind,
    url,
    // A simulation draws the original into the variant's box, so it answers to the variant's fit and
    // not to the authored one -- otherwise a `contain` variant would preview as a crop.
    fit: variantSpec != null && (kind === "generated-variant" || simulate)
      ? variantSpec.fit
      : input.fit ?? "cover",
    objectPosition,
    width: variantSpec?.width ?? input.sourceWidth ?? null,
    height: variantSpec?.height ?? input.sourceHeight ?? null,
    focalRect,
    variantSpec,
    simulatedCropStyle: simulate && variantSpec!.fit === "cover"
      ? resolveFocalRectCoverImageStyle(
          input.sourceWidth,
          input.sourceHeight,
          variantSpec!.width,
          variantSpec!.height,
          focalRect,
        )
      : null,
  };
}
