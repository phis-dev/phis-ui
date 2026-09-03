import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiShellTheme } from "../components/shell/shell-types";
import { getSiteConfigCacheTag } from "./cache-tags";
import type { PhiSiteFontSlots, PhiSiteRemSettings } from "../types/site-theme";
import type { PhiThemeCustomColorPalette, PhiThemeMode } from "../theme/phi-theme-presets";
import type { PhiControlShape } from "../theme/phi-control-shape";

export type PhiSiteTheme = {
  mode?: "light" | "dark" | null;
  preset?: string | null;
  presetVersion?: number | null;
  shape?: {
    controls?: PhiControlShape | null;
  } | null;
  fonts?: PhiSiteFontSlots;
  contact?: {
    label?: string | null;
    href?: string | null;
    icon?: string | null;
  } | null;
  brand?: {
    homeHref?: string | null;
    eyebrow?: string | null;
    logoAssetId?: number | null;
    slogan?: {
      label?: string | null;
      icon?: string | null;
    } | null;
    location?: {
      label?: string | null;
      icon?: string | null;
    } | null;
    logoUrl?: string | null;
    logoAlt?: string | null;
    wordmark?: {
      fontFamily?: string | null;
      fontWeight?: number | string | null;
      letterSpacing?: string | null;
      parts?: Array<{
        text: string;
        color?: string | null;
        fontWeight?: number | string | null;
      }>;
    } | null;
  } | null;
  widgets?: {
    locale?: {
      mode?: "label-list" | "compact-pill" | null;
      showText?: boolean | null;
    } | null;
    account?: {
      variant?: "full" | "compact" | "icon-only" | null;
      showLabel?: boolean | null;
      showChevron?: boolean | null;
    } | null;
  } | null;
  shell?: PhiShellTheme;
  rem?: PhiSiteRemSettings | null;
  antd?: {
    token?: Record<string, unknown>;
    components?: Record<string, Record<string, unknown>>;
  };
  phi?: {
    customColors?: Partial<Record<PhiThemeMode, Partial<PhiThemeCustomColorPalette>>>;
  };
};

export type PhiSiteLocaleOption = {
  code: string;
  label: string;
};

export type PhiSiteConfig = {
  id: number;
  key: string;
  publicUrl: string;
  name: string;
  hostname: string;
  defaultLocale: string;
  availableLocales: PhiSiteLocaleOption[];
  store?: {
    enabled: boolean;
  };
  theme: PhiSiteTheme;
  themeRevision: {
    publishedRevisionId: number | null;
    workingDraftRevisionId: number | null;
  };
};

export type GetResolvedSiteConfigOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

export const getResolvedSiteConfig = cache(async function getResolvedSiteConfig({
  apiBaseUrl,
  internalToken,
  siteKey,
}: GetResolvedSiteConfigOptions): Promise<PhiSiteConfig> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getResolvedSiteConfig.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getResolvedSiteConfig.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getResolvedSiteConfig.");
  }

  const useDevNoStore = process.env.NODE_ENV === "development";
  const response = await fetch(buildApiUrl(apiBaseUrl, "/api/v1/site"), {
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      includeToken: true,
      includeSiteKey: true,
      extra: {
        Accept: "application/json",
        "User-Agent": "phis-ui/1.0",
      },
    }),
    cache: useDevNoStore ? "no-store" : "force-cache",
    ...(useDevNoStore
      ? {}
      : {
          next: {
            tags: [getSiteConfigCacheTag(siteKey)],
          },
        }),
  } as RequestInit & { next?: { tags: string[] } });

  if (!response.ok) {
    throw new Error(`Failed to fetch site config (${response.status}).`);
  }

  const payload = (await response.json()) as { site?: PhiSiteConfig };
  if (!payload.site) {
    throw new Error("Missing site config payload.");
  }

  return payload.site;
});
