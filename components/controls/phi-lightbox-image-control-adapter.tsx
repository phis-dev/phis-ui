"use client";

/*
 * Ant Design's Image, behind `PhiLightboxImageControl`, which loads this file where a picture is drawn
 * with its lightbox. The primitive brings its preview -- the overlay, the toolbar, zoom and rotation --
 * whether or not a page shows one, so every page that draws a card or a picture would carry it.
 */

import { Image } from "antd";

import type { PhiLightboxImageControlProps } from "./phi-lightbox-image-control";

export function PhiLightboxImageControlAdapter({ src, alt, title, width, height, style }: PhiLightboxImageControlProps) {
  return <Image alt={alt} src={src} title={title} width={width} height={height} style={style} preview />;
}
