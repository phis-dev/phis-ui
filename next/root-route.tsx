import "server-only";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PhiRootLayout } from "../components/root/phi-root-layout";
import type { PhiModuleFontContributions } from "../module";
import { createPhiBuilderRuntimeModuleCatalog } from "../plugins/runtime-modules/catalog";
import type { PhiSiteModuleServerAreaContributions } from "../plugins/runtime-modules/site-modules";
import { loadPhiThemeBlockCatalog } from "../plugins/runtime-modules/theme/block-catalog";
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
  buildPhiThemeModeBootstrapScript,
  normalizePhiColorSchemeHint,
  resolvePhiThemeMode,
} from "../theme/phi-theme-mode";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

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

/**
 * The document shell, given what this Site installed.
 *
 * The projection arrives as an argument for the same reason it does at every Area host: a Site build
 * cannot redirect an import that happens inside `@phis/ui`, so the Skeleton hands it in once and never
 * changes again when a Module is added. The root needs it for one thing -- the Theme blocks this Site
 * can follow are the core ones plus what every installed Module ships, and a Theme is site-wide: the
 * same record has to resolve the same way on every page, so the catalog asked here is the installed
 * union rather than one Area's set, the same union the Builder composes.
 *
 * The typefaces arrive as a second argument for a reason of their own: a font declaration is a
 * `next/font` call that only a Next build may evaluate, so Modules export them from a boundary the
 * Server one never imports (module.ts), and the root is the one place that reads that boundary. The
 * catalogue is composed once, here, because nothing in it changes between requests.
 */
export function createPhiNextRootLayout(
  siteModules: PhiSiteModuleServerAreaContributions = {},
  fonts: PhiModuleFontContributions = [],
) {
  const fontCatalogue = composePhiFontCatalogue(fonts.flatMap((contribution) => contribution.families));
  let themeBlocks: Promise<PhiThemeBlockCatalog> | null = null;
  const loadThemeBlocks = () => {
    themeBlocks ??= loadPhiThemeBlockCatalog(createPhiBuilderRuntimeModuleCatalog(siteModules));
    return themeBlocks;
  };

  return async function PhiNextRootLayout({ children }: { children: React.ReactNode }) {
    const [{ runtimeConfig, site, resolvedLocale }, blocks] = await Promise.all([
      loadPhiNextRootContract(),
      loadThemeBlocks(),
    ]);
    const remRootValue = site.theme?.rem?.rootValue ?? 16;
    /*
     * What a viewer is shown follows their preference, never the Site Theme record, and it is the
     * same in every Area: the Builder overrides it live through its switch rather than through a
     * different starting point. The projection is decided here as well as inside PhiRootLayout,
     * because <html> carries the marker and the colour scheme: without them the document ground and
     * the native controls would stay light until the layout below mounts.
     */
    const themeModePreference = PHI_DEFAULT_THEME_MODE_PREFERENCE;
    const browserColorScheme = normalizePhiColorSchemeHint(
      (await cookies()).get(PHI_COLOR_SCHEME_COOKIE)?.value,
    );
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
          {bootstrapScript ? (
            <script dangerouslySetInnerHTML={{ __html: bootstrapScript }} />
          ) : null}
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
