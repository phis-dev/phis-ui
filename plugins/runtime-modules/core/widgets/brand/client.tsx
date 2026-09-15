"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import type { PhiSiteThemeBrand } from "../../../../../types/site-theme";
import type { PhiClientBlockBaseProps, PhiNoLabels } from "../../../../../types";
import {
  PhiBrandControl,
  phiBrandControlIsEmpty,
} from "../../../../../components/controls/phi-brand-control";

export type PhiBrandWidgetConfig = {
  brand?: PhiSiteThemeBrand | null;
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
  const brand = config?.brand ?? null;
  const showLogo = config?.showLogo !== false;
  const presentation = {
    brand,
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
