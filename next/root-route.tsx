import "server-only";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PhiRootLayout } from "../components/root/phi-root-layout";
import { PhiThemeModeBootstrapScript } from "../components/root/phi-root-live-theme-provider";
import type { PhiModuleFontContributions } from "../module";
import type { PhiSiteModuleServerAreaContributions } from "../plugins/runtime-modules/site-modules";
import { loadPhiThemeBlockCatalog } from "../plugins/runtime-modules/theme/block-catalog";
import { collectPhiThemeDescriptorContributions } from "../plugins/runtime-modules/theme/theme-descriptors";
import type { PhiThemeBlockCatalog } from "../theme/phi-theme-composition";
import { composePhiFontCatalogue } from "../theme/phi-font-catalogue";
import { buildPhiRootMetadata } from "../helpers/phi-metadata";
import { localizePath } from "../helpers/locale";
import {
  readPhiSiteRuntimeConfigSync,
} from "../helpers/site-runtime";
import { loadPhiRootLayoutContext } from "../server-helpers/root-layout";
import { resolvePhiResolvedRequestLocale } from "../server-helpers/request-locale";
import {
  PHI_COLOR_SCHEME_COOKIE,
  PHI_DEFAULT_THEME_MODE_PREFERENCE,
  PHI_THEME_MODE_COOKIE,
  buildPhiThemeModeBootstrapScript,
  normalizePhiColorSchemeHint,
  normalizePhiThemeModePreference,
  resolvePhiThemeMode,
  type PhiThemeModePreference,
} from "../theme/phi-theme-mode";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import { getResolvedSiteConfig, type PhiSiteConfig } from "../gateway/site-config";
import type { PhiResolvedLocale } from "../helpers/site-locale-config";
import { fetchResolvedSiteLocale } from "../server-helpers/site-locale";
import type { PhiThemeMode } from "../theme/phi-theme-presets";

async function loadPhiNextRootContract() {
  const runtimeConfig = readPhiSiteRuntimeConfigSync();
  const { site, resolvedLocale } = await loadPhiRootLayoutContext({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    siteKey: runtimeConfig.site.key,
  });

  return {
    runtimeConfig,
    site,
    resolvedLocale,
  };
}

export async function generatePhiNextRootMetadata(): Promise<Metadata> {
  const { runtimeConfig, site } = await loadPhiNextRootContract();
  return buildPhiNextRootMetadata(runtimeConfig, site);
}

/** The static tree's counterpart: the published Site, never a Theme under review. */
export async function generatePhiNextStaticRootMetadata(): Promise<Metadata> {
  const runtimeConfig = readPhiSiteRuntimeConfigSync();
  const site = await getResolvedSiteConfig({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    siteKey: runtimeConfig.site.key,
  });
  return buildPhiNextRootMetadata(runtimeConfig, site);
}

function buildPhiNextRootMetadata(
  runtimeConfig: ReturnType<typeof readPhiSiteRuntimeConfigSync>,
  site: PhiSiteConfig,
): Metadata {
  return buildPhiRootMetadata({
    metadataBase: site.publicUrl ?? runtimeConfig.site.publicUrl ?? undefined,
    applicationName: site.name,
    titleTemplate: `%s | ${site.name}`,
    defaultTitle: site.name,
    defaultDescription:
      site.theme?.brand?.slogan?.label ??
      "Canonical starter structure for PHIS-powered sites.",
    site: {
      title: site.name,
      description:
        site.theme?.brand?.slogan?.label ??
        "Canonical starter structure for PHIS-powered sites.",
    },
  });
}

/** The document shell of every dynamic route: the request decides the locale and the colour scheme. */
export function createPhiNextRootLayout(
  siteModules: PhiSiteModuleServerAreaContributions = {},
  fonts: PhiModuleFontContributions = [],
) {
  const document = createPhiNextRootDocument(siteModules, fonts);

  return async function PhiNextRootLayout({ children }: { children: React.ReactNode }) {
    const { runtimeConfig, site, resolvedLocale } = await loadPhiNextRootContract();
    /*
     * What a viewer is shown follows their preference, never the Site Theme record, and it is the
     * same in every Area: the Builder overrides it live through its switch rather than through a
     * different starting point. The projection is decided here as well as inside PhiRootLayout,
     * because <html> carries the marker and the colour scheme: without them the document ground and
     * the native controls would stay light until the layout below mounts.
     */
    const requestCookies = await cookies();
    const browserColorScheme = normalizePhiColorSchemeHint(
      requestCookies.get(PHI_COLOR_SCHEME_COOKIE)?.value,
    );
    const themeModePreference = normalizePhiThemeModePreference(
      requestCookies.get(PHI_THEME_MODE_COOKIE)?.value,
    );
    return document({
      runtimeConfig,
      site,
      resolvedLocale,
      browserColorScheme,
      themeModePreference,
      children,
    });
  };
}

/**
 * The document shell of the static route tree: one anonymous render per locale and colour scheme.
 *
 * It reads nothing from the request. The locale is the route's `root` segment and the colour scheme its
 * `mode` segment -- the proxy fills that one from the browser's hint cookie, so a dark visitor is served
 * the dark render instead of a light one the bootstrap script would have to swing. The Site is the
 * published one; a Theme under review is a query, and a request with a query never reaches this tree.
 */
export function createPhiNextStaticRootLayout(
  siteModules: PhiSiteModuleServerAreaContributions = {},
  fonts: PhiModuleFontContributions = [],
  /** The Client boundary of the Public Area, which the dynamic tree mounts in its `[root]` Layout. */
  Boundary?: React.ComponentType<{ children: React.ReactNode }>,
) {
  const document = createPhiNextRootDocument(siteModules, fonts);

  return async function PhiNextStaticRootLayout({
    children,
    params,
  }: {
    children: React.ReactNode;
    params: Promise<{ root: string; mode: string }>;
  }) {
    const { root, mode } = await params;
    const runtimeConfig = readPhiSiteRuntimeConfigSync();
    const credentials = readPhiServerApiCredentials();
    const [site, resolvedLocale] = await Promise.all([
      getResolvedSiteConfig({
        apiBaseUrl: credentials.apiBaseUrl,
        internalToken: credentials.internalToken,
        siteKey: runtimeConfig.site.key,
      }),
      fetchResolvedSiteLocale({
        apiBaseUrl: credentials.apiBaseUrl,
        internalToken: credentials.internalToken,
        siteKey: runtimeConfig.site.key,
        requestedLocale: root,
      }),
    ]);
    if (resolvedLocale.locale !== root.toLowerCase()) {
      notFound();
    }
    return document({
      runtimeConfig,
      site,
      resolvedLocale,
      browserColorScheme: normalizePhiColorSchemeHint(mode),
      children: Boundary ? <Boundary>{children}</Boundary> : children,
    });
  };
}

/**
 * The document itself, given what a root decided about the request.
 *
 * The projection arrives as an argument for the same reason it does at every Area host: a Site build
 * cannot redirect an import that happens inside `@phis/ui`, so the Skeleton hands it in once and never
 * changes again when a Module is added. The root needs it for one thing -- the Theme blocks this Site
 * can follow are the core ones plus what every installed Module ships, and a Theme is site-wide: the
 * same record has to resolve the same way on every page, so what is read here is the installed union
 * rather than one Area's set, the same union the Builder composes. It is read as Theme descriptors and
 * never as a runtime catalog: a catalog carries every Area's Widget plugins, and this layout is under
 * every route, so each Client half those plugins reach would load on the Public landing page
 * (scripts/validate-area-client-reach.mjs).
 *
 * The typefaces arrive as a second argument for a reason of their own: a font declaration is a
 * `next/font` call that only a Next build may evaluate, so Modules export them from a boundary the
 * Server one never imports (module.ts), and the root is the one place that reads that boundary. The
 * catalogue is composed once, here, because nothing in it changes between requests.
 */
function createPhiNextRootDocument(
  siteModules: PhiSiteModuleServerAreaContributions,
  fonts: PhiModuleFontContributions,
) {
  const fontCatalogue = composePhiFontCatalogue(fonts.flatMap((contribution) => contribution.families));
  let themeBlocks: Promise<PhiThemeBlockCatalog> | null = null;
  const loadThemeBlocks = () => {
    themeBlocks ??= loadPhiThemeBlockCatalog(collectPhiThemeDescriptorContributions(siteModules));
    return themeBlocks;
  };

  return async function PhiNextRootDocument({
    runtimeConfig,
    site,
    resolvedLocale,
    browserColorScheme,
    /*
     * The static tree states none: it is one document per locale and mode for everybody it answers,
     * and a preference is one viewer's. The proxy has already used it to pick which of the two that
     * viewer gets, and the bootstrap script below sees the cookie for itself.
     */
    themeModePreference = PHI_DEFAULT_THEME_MODE_PREFERENCE,
    children,
  }: {
    runtimeConfig: ReturnType<typeof readPhiSiteRuntimeConfigSync>;
    site: PhiSiteConfig;
    resolvedLocale: PhiResolvedLocale;
    browserColorScheme: PhiThemeMode | null;
    themeModePreference?: PhiThemeModePreference;
    children: React.ReactNode;
  }) {
    const blocks = await loadThemeBlocks();
    const remRootValue = site.theme?.rem?.rootValue ?? 16;
    const themeMode = resolvePhiThemeMode(themeModePreference, browserColorScheme);
    const bootstrapScript = buildPhiThemeModeBootstrapScript(themeModePreference);

    return (
      <html
        lang={resolvedLocale.intlLocale}
        data-phi-theme-mode={themeMode}
        style={{ fontSize: `${remRootValue}px`, colorScheme: themeMode }}
        suppressHydrationWarning
      >
        <head>
          {bootstrapScript ? <PhiThemeModeBootstrapScript source={bootstrapScript} /> : null}
        </head>
        <body>
          <PhiRootLayout
            themeModePreference={themeModePreference}
            browserColorScheme={browserColorScheme}
            apiBaseUrl={readPhiServerApiCredentials().apiBaseUrl}
            internalToken={readPhiServerApiCredentials().internalToken}
            siteKey={runtimeConfig.site.key}
            site={site}
            resolvedLocale={resolvedLocale}
            themePresets={blocks.palettes}
            themeBlocks={blocks}
            fontCatalogue={fontCatalogue}
          >
            {children}
          </PhiRootLayout>
        </body>
      </html>
    );
  };
}

export async function PhiNextSiteIndexPage() {
  const runtimeConfig = readPhiSiteRuntimeConfigSync();
  const resolvedLocale = await resolvePhiResolvedRequestLocale({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    siteKey: runtimeConfig.site.key,
  });
  redirect(localizePath(resolvedLocale.locale, "/"));
}
