"use client";

import type { CSSProperties } from "react";

import {
  AudioTwoTone,
  FileImageTwoTone,
  FilePdfTwoTone,
  FileTextTwoTone,
  FileUnknownTwoTone,
  FileZipTwoTone,
  HddTwoTone,
  VideoCameraTwoTone,
} from "@ant-design/icons";

import { PhiMediaKind } from "../../constants/media";
import type { PhiMediaKindValue } from "../../types/media";

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
      return <FileImageTwoTone className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Video:
      return <VideoCameraTwoTone className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Audio:
      return <AudioTwoTone className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Pdf:
      return <FilePdfTwoTone className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Markdown:
    case PhiMediaKind.Document:
      return <FileTextTwoTone className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Archive:
      return <FileZipTwoTone className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    case PhiMediaKind.Binary:
      return <HddTwoTone className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
    default:
      return <FileUnknownTwoTone className={className} style={iconStyle} twoToneColor={PHI_COLOR_PRIMARY} />;
  }
}
