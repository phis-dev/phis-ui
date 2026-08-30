"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { Flex } from "antd";

import type { PhiSiteTheme } from "../../../../../gateway/site-config";
import type { PhiClientBlockBaseProps, PhiNoLabels } from "../../../../../types";

type PhiBrandTheme = NonNullable<PhiSiteTheme["brand"]>;
type PhiBrandWordmark = NonNullable<PhiBrandTheme["wordmark"]>;
type PhiBrandWordmarkPart = NonNullable<PhiBrandWordmark["parts"]>[number];
const PHI_DEFAULT_BRAND_LOGO_URL = "/phis_logo_1024w.png";
const PHI_FONT_SIZE_XL = "1.25rem";
const PHI_LINE_HEIGHT_LG = 1.6;

export type PhiBrandWidgetConfig = {
  brand?: PhiBrandTheme | null;
  showLogo?: boolean;
  logoYOffset?: number;
};

export type PhiBrandWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  PhiBrandWidgetConfig
> & {
  fallbackTitle?: ReactNode;
  fallbackEyebrow?: ReactNode;
  interactive?: boolean;
};

function hasWordmarkParts(
  parts: PhiBrandWordmark["parts"] | undefined | null,
): parts is PhiBrandWordmarkPart[] {
  return Array.isArray(parts) && parts.some((part) => typeof part?.text === "string" && part.text.trim());
}

function renderWordmark(
  wordmark: PhiBrandWordmark | null | undefined,
  fallbackTitle?: ReactNode,
  fallbackStyle?: CSSProperties,
) {
  if (!hasWordmarkParts(wordmark?.parts)) {
    return fallbackTitle ? <strong style={fallbackStyle}>{fallbackTitle}</strong> : null;
  }

  const wordmarkStyle: CSSProperties = {
    ...(fallbackStyle ?? {}),
    ...(wordmark?.fontFamily ? { fontFamily: wordmark.fontFamily } : {}),
    ...(wordmark?.fontWeight ? { fontWeight: wordmark.fontWeight } : {}),
    ...(wordmark?.letterSpacing ? { letterSpacing: wordmark.letterSpacing } : {}),
    lineHeight: 1.1,
  };

  return (
    <span style={wordmarkStyle}>
      {wordmark.parts.map((part, index) => (
        <span
          key={`${part.text}-${index}`}
          style={{
            ...(part.color ? { color: part.color } : {}),
            ...(part.fontWeight ? { fontWeight: part.fontWeight } : {}),
          }}
        >
          {part.text}
        </span>
      ))}
    </span>
  );
}

export function PhiBrandWidgetClient({
  config,
  fallbackTitle,
  fallbackEyebrow,
  interactive = true,
}: PhiBrandWidgetClientProps) {
  const brand = config?.brand ?? null;
  const eyebrow = brand?.eyebrow ?? fallbackEyebrow ?? null;
  const wordmarkNode = renderWordmark(brand?.wordmark, fallbackTitle, {
    fontSize: PHI_FONT_SIZE_XL,
    lineHeight: PHI_LINE_HEIGHT_LG,
  });
  const logoUrl = brand?.logoUrl?.trim() || PHI_DEFAULT_BRAND_LOGO_URL;
  const logoAlt = brand?.logoAlt?.trim() || "Brand logo";
  const homeHref = brand?.homeHref?.trim() || "/";
  const showLogo = config?.showLogo !== false;
  const logoYOffset = typeof config?.logoYOffset === "number" ? config.logoYOffset : 0;

  if (!logoUrl && !wordmarkNode && !eyebrow) {
    return null;
  }

  const content = (
      <Flex
        align="center"
        justify="flex-start"
        gap={12}
        wrap={false}
        style={{ color: "inherit", width: "100%", height: "100%", fontSize: PHI_FONT_SIZE_XL }}
      >
      {showLogo && logoUrl ? (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            flexShrink: 0,
          }}
        >
          <Image
            src={logoUrl}
            alt={logoAlt}
            width={50}
            height={50}
            style={{
              width: 50,
              height: "auto",
              objectFit: "contain",
              display: "block",
              transform: logoYOffset === 0 ? undefined : `translateY(${logoYOffset}px)`,
            }}
          />
        </span>
      ) : null}
      <Flex vertical gap={0} justify="center">
        {false && eyebrow ? (
          <span style={{ display: "block", fontSize: "var(--ant-font-size-sm)", opacity: 0.75 }}>
            {eyebrow}
          </span>
        ) : null}
        {wordmarkNode}
      </Flex>
    </Flex>
  );

  const linkStyle: CSSProperties = {
    color: "inherit",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    height: "100%",
  };

  if (!interactive) {
    return (
      <span aria-disabled="true" style={linkStyle}>
        {content}
      </span>
    );
  }

  return (
    <Link href={homeHref} style={linkStyle}>
      {content}
    </Link>
  );
}
