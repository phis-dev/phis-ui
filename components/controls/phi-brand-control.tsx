"use client";

import type { CSSProperties, ReactNode } from "react";

import { Flex } from "antd";

import { buildPhiMediaAssetContentDeliveryUrl } from "../../constants/media";

import { PhiIcon } from "../shell/phi-icon";

import type { PhiThemeMode } from "../../theme/phi-theme-presets";
import type {
  PhiSiteThemeBrand,
  PhiSiteThemeBrandLine,
  PhiSiteThemeWordmark,
  PhiSiteThemeWordmarkPart,
} from "../../types/site-theme";

const PHI_FONT_SIZE_XL = "1.25rem";
const PHI_LINE_HEIGHT_LG = 1.6;

/**
 * Which parts of the Brand are drawn here.
 *
 * `lockup` is the pairing of the two, which is what the trade calls it. The Eyebrow belongs to the
 * Wordmark and travels with it: it is the line above the name, and above a bare Logo it would sit over
 * nothing.
 */
export type PhiBrandControlShows = "lockup" | "logo" | "wordmark";

export type PhiBrandControlProps = {
  brand?: PhiSiteThemeBrand | null;
  /** The Site's own name, for a Brand that has no Wordmark parts of its own. */
  fallbackTitle?: ReactNode;
  shows?: PhiBrandControlShows;
  /** The mode whose Logo is drawn: a Logo is artwork in fixed colours, one picture per mode. */
  mode: PhiThemeMode;
};

/** How tall a Logo is drawn. Its width follows the artwork, so a wordmark reads as well as a signet. */
const PHI_BRAND_LOGO_HEIGHT = 32;

/**
 * The address a mode's Logo is drawn from, or none.
 *
 * An Asset's is the delivered address the resolver or the picker wrote; before either has, it is built
 * from the id, which is the same address without its revision.
 */
export function resolvePhiBrandLogoUrl(
  brand: PhiSiteThemeBrand | null | undefined,
  mode: PhiThemeMode,
): string | null {
  const logo = brand?.logo?.[mode];
  if (!logo) return null;
  if (logo.sourceKind === "asset") {
    return logo.url?.trim() || buildPhiMediaAssetContentDeliveryUrl(logo.assetId);
  }
  if (logo.sourceKind === "url") {
    return logo.sourceUrl.trim() || null;
  }
  return null;
}

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

export type PhiBrandLineControlProps = {
  line?: PhiSiteThemeBrandLine | null;
  /** Drawn when the line names no icon of its own. */
  fallbackIcon?: string;
};

/**
 * One of the two lines a Brand carries: what it says, with its icon in front of it.
 *
 * A line is Brand, which is why it is drawn here beside the Wordmark rather than by whatever Widget
 * happens to stand in that slot. A Simple Text used to hold a copy of the sentence, written in when
 * the Preset was built; what it showed was therefore whatever the Brand said that day.
 *
 * Nothing set means nothing drawn. The frame keeps its shape without the line, and an empty line with
 * an icon in front of it would say that something is missing rather than that nothing was asked for.
 */
export function PhiBrandLineControl({ line, fallbackIcon }: PhiBrandLineControlProps) {
  const label = line?.label?.trim();
  if (!label) {
    return null;
  }

  const icon = line?.icon?.trim() || fallbackIcon;
  return (
    <Flex align="center" gap={8} wrap={false} style={{ color: "inherit", minWidth: 0 }}>
      {icon ? <PhiIcon name={icon} size="inherit" /> : null}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </Flex>
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
  shows = "lockup",
  mode,
}: PhiBrandControlProps): boolean {
  const hasLogo = shows !== "wordmark" && Boolean(resolvePhiBrandLogoUrl(brand, mode));
  const hasWordmark = shows !== "logo"
    && (hasWordmarkParts(brand?.wordmark?.parts) || Boolean(fallbackTitle));
  const hasEyebrow = shows !== "logo" && Boolean(brand?.eyebrow);
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
  shows = "lockup",
  mode,
}: PhiBrandControlProps) {
  const eyebrow = shows === "logo" ? null : brand?.eyebrow ?? null;
  const wordmarkNode = shows === "logo"
    ? null
    : renderWordmark(brand?.wordmark, fallbackTitle, {
      fontSize: PHI_FONT_SIZE_XL,
      lineHeight: PHI_LINE_HEIGHT_LG,
    });
  /*
   * The Logo's own correction, read from the Brand and not from the placement.
   *
   * What it corrects is whitespace inside the artwork -- how the picture sits against type -- so it is
   * true of the Logo wherever it is drawn, and was set per Widget instance until now: the same picture
   * was aligned by hand in the header and again in the footer, and the two drifted.
   */
  const logoYOffset = brand?.logoYOffset ?? 0;
  /*
   * No Logo means no Logo. It used to mean the Phi logo, which was a placeholder from before a Site
   * could set one of its own -- every Site that had not picked a picture wore ours, and there was no
   * way to say "wordmark only" at all. The Wordmark carries the Brand where nothing is picked.
   */
  const logoUrl = shows === "wordmark" ? null : resolvePhiBrandLogoUrl(brand, mode);
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
      {logoUrl ? (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            flexShrink: 0,
          }}
        >
          {/*
            A plain image rather than `next/image`: a Logo is regularly an SVG, which the optimizer refuses,
            or a Set's data URL, which it cannot fetch, so nothing would be optimized -- and its fixed
            width and height attributes fought the one rule a Logo needs, a height with the width following.
          */}
          <img
            src={logoUrl}
            alt={logoAlt}
            height={PHI_BRAND_LOGO_HEIGHT}
            decoding="async"
            style={{
              width: "auto",
              height: PHI_BRAND_LOGO_HEIGHT,
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
