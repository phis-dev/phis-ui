import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import { syncPhiTranslationChangeMarkers } from "../helpers/translation-cache";
import type { PhiShellTheme } from "../components/shell/shell-types";
import { clearPhiSiteReadCache, readPhiSiteReadCache } from "./site-read-cache";
import type {
  PhiSiteFontSlots,
  PhiSiteRemSettings,
  PhiSiteThemeBrand,
  PhiSiteThemeContact,
  PhiSiteThemeRoot,
} from "../types/site-theme";
import type { PhiThemePalette } from "../theme/phi-theme-presets";
import type { PhiThemeBlockSelection } from "../theme/phi-theme-composition";
import type { PhiControlShapeCorners } from "../theme/phi-control-shape";
import type { PhiThemeButtons } from "../theme/phi-button-shadow";
import type { PhiThemeTypography } from "../theme/phi-theme-typography";

export type PhiSiteTheme = {
  mode?: "light" | "dark" | null;
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
  contact?: PhiSiteThemeContact | null;
  brand?: PhiSiteThemeBrand | null;
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
  /** The shadow under each kind of Button, as a step the root theme turns into CSS per mode. */
  buttons?: PhiThemeButtons | null;
  /** Which font slot the page's headings take; body unless stated (theme/phi-theme-typography.ts). */
  typography?: PhiThemeTypography | null;
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
  /** Change markers of the global and this Site's translation store; opaque, compared for equality. */
  translationMarkers: {
    global: string;
    site: string;
  };
  /** Moves with every published change a Site's read caches hold; opaque, compared for equality. */
  readMarker: string;
};

export type GetResolvedSiteConfigOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

/**
 * How long a Site process keeps its config before asking Core again. The config is small and carries the
 * change markers, so this is also how long a process can go on showing what another process's publish
 * already replaced: it asks at most this often however many renders it serves, and not while it serves none.
 */
export const PHI_SITE_CONFIG_REFRESH_MS = 2_000;

const READ_MARKERS_KEY = Symbol.for("phis-ui.site-read-markers");

/** The read marker this process last saw per Site, on `globalThis` for the reason the read cache is. */
function readSeenMarkers(): Map<string, string> {
  const holder = globalThis as typeof globalThis & { [READ_MARKERS_KEY]?: Map<string, string> };
  holder[READ_MARKERS_KEY] ??= new Map();
  return holder[READ_MARKERS_KEY];
}

/**
 * The Site's config as Core publishes it. Kept in the Site process's read cache outside development
 * (gateway/site-read-cache.ts) for `PHI_SITE_CONFIG_REFRESH_MS`, never in Next's data cache.
 */
export async function getResolvedSiteConfig({
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

  const cacheKey = `site-config:${siteKey.trim().toLowerCase()}`;
  const load = () => fetchSiteConfig({ apiBaseUrl, internalToken, siteKey }, cacheKey);
  if (process.env.NODE_ENV === "development") {
    return load();
  }
  return readPhiSiteReadCache(cacheKey, load, PHI_SITE_CONFIG_REFRESH_MS);
}

async function fetchSiteConfig(
  { apiBaseUrl, internalToken, siteKey }: GetResolvedSiteConfigOptions,
  cacheKey: string,
): Promise<PhiSiteConfig> {
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
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch site config (${response.status}).`);
  }

  const payload = (await response.json()) as { site?: PhiSiteConfig };
  if (!payload.site) {
    throw new Error("Missing site config payload.");
  }

  if (!payload.site.translationMarkers) {
    throw new Error("Missing translation markers in site config payload.");
  }
  // Every fresh answer, cached or not afterwards, is where this process learns a translation changed.
  syncPhiTranslationChangeMarkers({
    siteKey,
    global: payload.site.translationMarkers.global,
    site: payload.site.translationMarkers.site,
  });
  // ... and that something published changed, possibly through another process: the rest of the read
  // cache goes, this answer stays.
  if (!payload.site.readMarker) {
    throw new Error("Missing read marker in site config payload.");
  }
  const seen = readSeenMarkers();
  const markerKey = siteKey.trim().toLowerCase();
  const previous = seen.get(markerKey);
  seen.set(markerKey, payload.site.readMarker);
  if (previous !== undefined && previous !== payload.site.readMarker) {
    clearPhiSiteReadCache({ keep: cacheKey });
  }
  return payload.site;
}
