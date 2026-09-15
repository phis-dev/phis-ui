"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

import { Flex } from "antd";

import type {
  PhiSiteThemeBrand,
  PhiSiteThemeWordmark,
  PhiSiteThemeWordmarkPart,
} from "../../types/site-theme";

const PHI_FONT_SIZE_XL = "1.25rem";
const PHI_LINE_HEIGHT_LG = 1.6;

export type PhiBrandControlProps = {
  brand?: PhiSiteThemeBrand | null;
  /** The Site's own name, for a Brand that has no Wordmark parts of its own. */
  fallbackTitle?: ReactNode;
  fallbackEyebrow?: ReactNode;
  showLogo?: boolean;
  /** Optical correction for a Logo whose artwork does not sit on its own baseline. */
  logoYOffset?: number;
};

function hasWordmarkParts(
  parts: PhiSiteThemeWordmark["parts"] | undefined | null,
): parts is PhiSiteThemeWordmarkPart[] {
  return Array.isArray(parts) && parts.some((part) => typeof part?.text === "string" && part.text.trim());
}

function renderWordmark(
  wordmark: PhiSiteThemeWordmark | null | undefined,
  fallbackTitle?: ReactNode,
  fallbackStyle?: CSSProperties,
) {
  const wordmarkStyle: CSSProperties = {
    ...(fallbackStyle ?? {}),
    ...(wordmark?.fontFamily ? { fontFamily: wordmark.fontFamily } : {}),
    ...(wordmark?.fontWeight ? { fontWeight: wordmark.fontWeight } : {}),
    ...(wordmark?.fontStyle ? { fontStyle: wordmark.fontStyle } : {}),
    ...(wordmark?.letterSpacing ? { letterSpacing: wordmark.letterSpacing } : {}),
    lineHeight: 1.1,
  };

  /*
   * The typography applies to the fallback too. Where no part is set the Site's own name IS the
   * Wordmark, and setting its face, weight or tracking used to do nothing at all until somebody first
   * added a part -- the controls looked broken for exactly the Sites that had not started yet.
   */
  if (!hasWordmarkParts(wordmark?.parts)) {
    return fallbackTitle ? <strong style={wordmarkStyle}>{fallbackTitle}</strong> : null;
  }

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

/**
 * Whether a Brand has anything at all to show.
 *
 * The Widget asks before it wraps: a Brand with no Logo, no Wordmark and no Eyebrow must not become an
 * empty link that still fills its Region and still takes the click.
 */
export function phiBrandControlIsEmpty({
  brand,
  fallbackTitle,
  fallbackEyebrow,
  showLogo = true,
}: PhiBrandControlProps): boolean {
  const hasLogo = showLogo !== false && Boolean(brand?.logoUrl?.trim());
  const hasWordmark = hasWordmarkParts(brand?.wordmark?.parts) || Boolean(fallbackTitle);
  const hasEyebrow = Boolean(brand?.eyebrow ?? fallbackEyebrow);
  return !hasLogo && !hasWordmark && !hasEyebrow;
}

/**
 * The Brand as it looks: Logo, Eyebrow and Wordmark, and nothing about where it leads.
 *
 * It is a Control rather than a part of the Brand Widget because two surfaces show the same Brand --
 * the Widget in the Site frame, and the Theme workspace preview, which shows what the Brand will look
 * like while it is being set. The preview used to import the Widget for it, which is the one thing a
 * Widget may not do to another Widget; what it actually needed was this.
 */
export function PhiBrandControl({
  brand,
  fallbackTitle,
  fallbackEyebrow,
  showLogo = true,
  logoYOffset = 0,
}: PhiBrandControlProps) {
  const eyebrow = brand?.eyebrow ?? fallbackEyebrow ?? null;
  const wordmarkNode = renderWordmark(brand?.wordmark, fallbackTitle, {
    fontSize: PHI_FONT_SIZE_XL,
    lineHeight: PHI_LINE_HEIGHT_LG,
  });
  /*
   * No Logo means no Logo. It used to mean the Phi logo, which was a placeholder from before a Site
   * could set one of its own -- every Site that had not picked a picture wore ours, and there was no
   * way to say "wordmark only" at all. The Wordmark carries the Brand where nothing is picked.
   */
  const logoUrl = brand?.logoUrl?.trim() || null;
  const logoAlt = brand?.logoAlt?.trim() || "Brand logo";

  if (!logoUrl && !wordmarkNode && !eyebrow) {
    return null;
  }

  return (
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
        {eyebrow ? (
          <span style={{ display: "block", fontSize: "var(--ant-font-size-sm)", opacity: 0.75 }}>
            {eyebrow}
          </span>
        ) : null}
        {wordmarkNode}
      </Flex>
    </Flex>
  );
}
