"use client";

import { lazy, Suspense, type CSSProperties } from "react";

export type PhiLightboxImageControlProps = {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
};

const PhiLightboxImageControlAdapter = lazy(() =>
  import("./phi-lightbox-image-control-adapter")
    .then((module) => ({ default: module.PhiLightboxImageControlAdapter })));

/**
 * An image that opens larger over the page when clicked.
 *
 * Only for that: an image that is just shown is an `<img>` or `next/image` in the Widget that places it.
 * The lightbox is what needs a primitive -- the overlay, the zoom, the close -- and so it is a Control.
 * Until the primitive has loaded, the picture stands there plainly, at the same size.
 */
export function PhiLightboxImageControl(props: PhiLightboxImageControlProps) {
  const { src, alt, title, width, height, style } = props;
  return (
    <Suspense fallback={<img alt={alt} src={src} title={title} width={width} height={height} style={style} />}>
      <PhiLightboxImageControlAdapter {...props} />
    </Suspense>
  );
}
