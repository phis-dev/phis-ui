"use client";

import NextImage from "next/image";
import { useState, type CSSProperties } from "react";

import type { PhiImagePresentation } from "../media/image-presentation";
import { PhiLightboxImageControl } from "./phi-lightbox-image-control";

/**
 * Where a picture comes from, which decides what may be done with it.
 *
 * - `asset` -- the Site's own Media: `next/image` draws it, and its blur stands in while it loads.
 * - `trusted-url` -- a foreign address a Preset vouched for: `next/image` may draw it, but it has no blur
 *   of its own, so a plain placeholder stands in.
 * - `url` -- any other address: a plain `<img>`, with the same plain placeholder.
 */
export type PhiImageControlSource = "asset" | "trusted-url" | "url";

export type PhiImageControlProps = {
  /** The shared resolver's answer (`resolvePhiImagePresentation`): address, framing, intrinsic size. */
  presentation: PhiImagePresentation;
  source: PhiImageControlSource;
  alt: string;
  title?: string;
  /** The box the picture is drawn at, where it is not the presentation's own size. */
  width?: number | string | null;
  height?: number | string | null;
  /** The Asset's blur. Only an `asset` has one; an address on somebody else's server never does. */
  blurDataUrl?: string | null;
  /** Whether the optimiser may take the bytes -- a public Asset, and not an SVG original. */
  optimizable?: boolean;
  sizes?: string;
  preload?: boolean;
  /** Opens the picture larger over the page when clicked. */
  preview?: boolean;
  /** The box around the picture: size, corners, mask. */
  style?: CSSProperties;
  /** Added to the picture's own style after the framing. */
  imageStyle?: CSSProperties;
};

function toCssSize(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

/**
 * One picture, drawn the way the house draws pictures.
 *
 * The framing is not decided here: `presentation` already says which bytes, how they meet the box and
 * where the focal point sits, so every surface that shows a picture -- the Image Widget, a card's cover
 * -- frames it alike. This decides only how it arrives: `next/image` where the source allows it, the
 * Asset's blur while an Asset loads, and a plain placeholder for everything else, because a foreign
 * picture has no blur and inventing one would mean fetching it twice. The placeholder goes once the
 * picture has loaded, so a transparent picture does not keep a grey ground behind it.
 *
 * `preview` hands the picture to `PhiLightboxImageControl`, the one place the lightbox lives.
 */
export function PhiImageControl({
  presentation,
  source,
  alt,
  title,
  width,
  height,
  blurDataUrl,
  optimizable = false,
  sizes,
  preload = false,
  preview = false,
  style,
  imageStyle,
}: PhiImageControlProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const url = presentation.url;
  if (!url) {
    return null;
  }

  const drawnWidth = width ?? presentation.width;
  const drawnHeight = height ?? presentation.height;
  const blur = source === "asset" ? blurDataUrl ?? null : null;
  const loaded = loadedUrl === url;
  const boxStyle: CSSProperties = {
    position: presentation.simulatedCropStyle ? "relative" : undefined,
    width: toCssSize(drawnWidth) ?? "100%",
    height: toCssSize(drawnHeight),
    maxWidth: "100%",
    lineHeight: 0,
    overflow: presentation.simulatedCropStyle ? "hidden" : undefined,
    ...(loaded || blur ? {} : { backgroundColor: "var(--ant-color-fill-quaternary)" }),
    ...style,
  };
  const pictureStyle: CSSProperties = {
    objectFit: presentation.fit,
    objectPosition: presentation.objectPosition,
    display: "block",
    width: "100%",
    height: toCssSize(drawnHeight) ? "100%" : "auto",
    ...presentation.simulatedCropStyle,
    ...imageStyle,
  };
  const numericWidth = typeof drawnWidth === "number" ? drawnWidth : undefined;
  const numericHeight = typeof drawnHeight === "number" ? drawnHeight : undefined;
  const markLoaded = () => setLoadedUrl(url);
  // A picture the browser had before hydration has loaded already and fires no `load` any more.
  const noticeLoaded = (node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0 && !loaded) markLoaded();
  };

  if (preview) {
    return (
      <div style={boxStyle}>
        <PhiLightboxImageControl
          alt={alt}
          src={url}
          title={title}
          width={numericWidth}
          height={numericHeight}
          style={pictureStyle}
        />
      </div>
    );
  }

  if (source !== "url" && numericWidth != null && numericHeight != null) {
    return (
      <div style={boxStyle}>
        <NextImage
          alt={alt}
          src={url}
          title={title}
          width={numericWidth}
          height={numericHeight}
          sizes={sizes?.trim() || undefined}
          unoptimized={!optimizable}
          placeholder={blur ? "blur" : undefined}
          blurDataURL={blur ?? undefined}
          preload={preload}
          onLoad={markLoaded}
          style={pictureStyle}
        />
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <img
        alt={alt}
        src={url}
        title={title}
        width={numericWidth}
        height={numericHeight}
        loading={preload ? "eager" : "lazy"}
        ref={noticeLoaded}
        onLoad={markLoaded}
        style={pictureStyle}
      />
    </div>
  );
}
