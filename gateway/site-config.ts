import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiShellTheme } from "../components/shell/shell-types";
import { getSiteConfigCacheTag } from "./cache-tags";
import type { PhiSiteFontSlots, PhiSiteRemSettings, PhiSiteThemeRoot } from "../types/site-theme";
import type { PhiThemePalette } from "../theme/phi-theme-presets";
import type { PhiThemeModeSetting } from "../theme/phi-theme-mode";
import type { PhiThemeBlockSelection } from "../theme/phi-theme-composition";
import type { PhiControlShapeCorners } from "../theme/phi-control-shape";

export type PhiSiteTheme = {
  /** `system` follows the browser; absent means light. Resolved in theme/phi-theme-mode.ts. */
  mode?: PhiThemeModeSetting | null;
  /**
   * Which Theme blocks this Site follows (theme/phi-theme-blocks.ts). Absent on a Theme written before
   * a Theme had three parts, where `preset` alone named the palette and still does.
   */
  blocks?: PhiThemeBlockSelection | null;
  preset?: string | null;
  presetVersion?: number | null;
  shape?: {
    controls?: PhiControlShapeCorners | null;
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
  root?: PhiSiteThemeRoot | null;
  rem?: PhiSiteRemSettings | null;
  /**
   * The colour the Site owns: a palette in the shape a Module ships one (theme/phi-theme-presets.ts),
   * laid over the palette block the Site follows. Seeds shared by both modes under `seed`; the base
   * seeds, explicit colour tokens and custom colours per mode under `modes`. Absent while the Site only
   * follows a core palette; filled when a Module palette is taken over on save or an author changes a
   * colour.
   */
  palette?: PhiThemePalette | null;
  /** The proportions the Site owns, laid over the style block it follows. */
  style?: {
    token?: Record<string, unknown>;
  } | null;
  /** Site-level component overrides, merged per component over the shared component defaults. */
  components?: Record<string, Record<string, unknown>> | null;
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
