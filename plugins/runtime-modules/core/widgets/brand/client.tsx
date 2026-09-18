"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import type { PhiClientBlockBaseProps, PhiNoLabels } from "../../../../../types";
import {
  PhiBrandControl,
  PhiBrandLineControl,
  phiBrandControlIsEmpty,
} from "../../../../../components/controls/phi-brand-control";
import type { PhiBrandWidgetLine, PhiBrandWidgetMode } from "./config";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiSiteBrand } from "../../../../../components/root/phi-root-live-theme-provider";

export type PhiBrandWidgetConfig = {
  mode?: PhiBrandWidgetMode;
  line?: PhiBrandWidgetLine;
  showLogo?: boolean;
  logoYOffset?: number;
};

/** What a line shows in front of itself where the Brand names no icon for it. */
const PHI_BRAND_LINE_FALLBACK_ICONS: Record<PhiBrandWidgetLine, string> = {
  slogan: "antd:star",
  location: "antd:location",
};

export type PhiBrandWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  PhiBrandWidgetConfig
> & {
  fallbackTitle?: ReactNode;
  fallbackEyebrow?: ReactNode;
  interactive?: boolean;
};

/**
 * The Brand in the Site frame: what `PhiBrandControl` shows, and where clicking it leads.
 *
 * The destination is the whole of what this Widget adds. Everything visible belongs to the Control,
 * because the Theme workspace preview shows the same Brand without being in a frame and without
 * leading anywhere.
 */
export function PhiBrandWidgetClient({
  config,
  fallbackTitle,
  fallbackEyebrow,
  interactive = true,
}: PhiBrandWidgetClientProps) {
  const brand = usePhiSiteBrand();
  // The Theme's mode, not the Widget's: one picks the Logo's picture, the other what is drawn at all.
  const { mode: themeMode } = usePhiConfig();

  /*
   * A line leads nowhere, deliberately. The Wordmark is the way home and is drawn as a link; a Site's
   * slogan or the town it sits in is a statement, and wrapping it in an anchor to the front page would
   * offer a destination nobody was looking for.
   */
  if (config?.mode === "line") {
    const line = config.line ?? "slogan";
    return (
      <PhiBrandLineControl
        line={line === "location" ? brand?.location : brand?.slogan}
        fallbackIcon={PHI_BRAND_LINE_FALLBACK_ICONS[line]}
      />
    );
  }

  const showLogo = config?.showLogo !== false;
  const presentation = {
    brand,
    mode: themeMode,
    fallbackTitle,
    fallbackEyebrow,
    showLogo,
    logoYOffset: typeof config?.logoYOffset === "number" ? config.logoYOffset : 0,
  };

  if (phiBrandControlIsEmpty(presentation)) {
    return null;
  }

  const homeHref = brand?.homeHref?.trim() || "/";
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
        <PhiBrandControl {...presentation} />
      </span>
    );
  }

  return (
    <Link href={homeHref} style={linkStyle}>
      <PhiBrandControl {...presentation} />
    </Link>
  );
}
