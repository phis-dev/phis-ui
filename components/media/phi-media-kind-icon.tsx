"use client";

import type { CSSProperties } from "react";


import { PhiMediaKind } from "../../constants/media";
import type { PhiMediaKindValue } from "../../types/media";
import { PhiIcon } from "../shell/phi-icon";

const PHI_COLOR_TEXT_SECONDARY = "var(--ant-color-text-secondary)";
const PHI_COLOR_PRIMARY = "var(--ant-color-primary)";

export type PhiMediaKindIconProps = {
  kind: PhiMediaKindValue;
  size?: number;
  style?: CSSProperties;
  className?: string;
};

export function PhiMediaKindIcon({ kind, size = 32, style, className }: PhiMediaKindIconProps) {
  const iconStyle: CSSProperties = {
    fontSize: `${size / 16}rem`,
    color: PHI_COLOR_TEXT_SECONDARY,
    ...style,
  };

  switch (kind) {
    case PhiMediaKind.Image:
      return <PhiIcon name="file-image-two-tone" size="inherit" className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Video:
      return <PhiIcon name="video-camera-two-tone" size="inherit" className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Audio:
      return <PhiIcon name="audio-two-tone" size="inherit" className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Pdf:
      return <PhiIcon name="file-pdf-two-tone" size="inherit" className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Markdown:
    case PhiMediaKind.Document:
      return <PhiIcon name="file-text-two-tone" size="inherit" className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Archive:
      return <PhiIcon name="file-zip-two-tone" size="inherit" className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Font:
      return <PhiIcon name="highlight-two-tone" size="inherit" className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Binary:
      return <PhiIcon name="hdd-two-tone" size="inherit" className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    default:
      return <PhiIcon name="file-unknown-two-tone" size="inherit" className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
  }
}
