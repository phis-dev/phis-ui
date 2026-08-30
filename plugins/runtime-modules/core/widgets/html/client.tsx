"use client";

import { useState } from "react";

import type { PhiClientBlockBaseProps, PhiCmsInstanceId, PhiNoLabels, PhiRenderableBlockRenderMode } from "../../../../../types";
import {
  createPhiRenderableBlockReceiver,
  usePhiRenderableBlockSignalListener,
} from "../../../../../components/runtime/renderable-block-runtime";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { resolvePhiWidgetFontFamily } from "../../../../../components/widgets/helpers/font-family";
import { resolvePhiWidgetFontSize } from "../../../../../components/widgets/helpers/font-size";
import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "../../../../../types/site-theme";

export type PhiHtmlWidgetClientLabels = PhiNoLabels;

export type PhiHtmlWidgetClientConfig = {
  html?: string;
  fontFamily?: PhiWidgetFontFamilyKey | null;
  fontSize?: PhiWidgetFontSizeKey | null;
  renderMode?: PhiRenderableBlockRenderMode;
};

export type PhiHtmlWidgetClientProps = PhiClientBlockBaseProps<
  PhiHtmlWidgetClientLabels,
  PhiHtmlWidgetClientConfig
> & {
  blockId: PhiCmsInstanceId;
};

export function PhiHtmlWidgetClient({
  blockId,
  config,
}: PhiHtmlWidgetClientProps) {
  const { fonts, token } = usePhiConfig();
  const [fontFamilyOverride, setFontFamilyOverride] = useState<PhiWidgetFontFamilyKey | null>(null);
  const [fontSizeOverride, setFontSizeOverride] = useState<PhiWidgetFontSizeKey | null>(null);
  const html = typeof config?.html === "string" ? config.html.trim() : "";
  const resolvedFontFamily = resolvePhiWidgetFontFamily(
    fontFamilyOverride ?? config?.fontFamily,
    fonts,
    token,
  );
  const resolvedFontSize = resolvePhiWidgetFontSize(fontSizeOverride ?? config?.fontSize, token, "lg");
  const receiver = createPhiRenderableBlockReceiver("widget", blockId);

  usePhiRenderableBlockSignalListener(receiver, (signal) => {
    if (signal.channel === "fontFamily" && signal.action === "change") {
      const fontFamilyValue = signal.value;
      const nextFontFamily =
        fontFamilyValue === "inherit" ||
        fontFamilyValue === "system" ||
        fontFamilyValue === "body" ||
        fontFamilyValue === "mono" ||
        fontFamilyValue === "serif" ||
        fontFamilyValue === "accent" ||
        fontFamilyValue === "display"
          ? fontFamilyValue
          : null;
      setFontFamilyOverride(nextFontFamily);
      return;
    }

    if (signal.channel === "fontSize" && signal.action === "change") {
      const fontSizeValue = signal.value;
      const nextFontSize =
        fontSizeValue === "inherit" ||
        fontSizeValue === "xs" ||
        fontSizeValue === "sm" ||
        fontSizeValue === "base" ||
        fontSizeValue === "lg" ||
        fontSizeValue === "xl"
          ? fontSizeValue
          : null;
      setFontSizeOverride(nextFontSize);
    }
  });

  if (!html) {
    return null;
  }

  return (
    <div
      className="phi-html-widget__content"
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        lineHeight: 1.6,
        overflowWrap: "anywhere",
        fontFamily: resolvedFontFamily,
        fontSize: resolvedFontSize ?? token.fontSize,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
