"use client";

import type { CSSProperties } from "react";
import { Image } from "antd";

export type PhiLightboxImageControlProps = {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
};

/**
 * An image that opens larger over the page when clicked.
 *
 * Only for that: an image that is just shown is an `<img>` or `next/image` in the Widget that places it.
 * The lightbox is what needs a primitive -- the overlay, the zoom, the close -- and so it is a Control.
 */
export function PhiLightboxImageControl({ src, alt, title, width, height, style }: PhiLightboxImageControlProps) {
  return <Image alt={alt} src={src} title={title} width={width} height={height} style={style} preview />;
}
