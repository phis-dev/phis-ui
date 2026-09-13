import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PhiRootLayout } from "../components/root/phi-root-layout";
import { createPhiBuilderRuntimeModuleCatalog } from "../plugins/runtime-modules/catalog";
import type { PhiSiteModuleServerAreaContributions } from "../plugins/runtime-modules/site-modules";
import { loadPhiThemeBlockCatalog } from "../plugins/runtime-modules/theme/block-catalog";
import type { PhiThemeBlockCatalog } from "../theme/phi-theme-composition";
import { buildPhiRootMetadata } from "../helpers/phi-metadata";
import { localizePath } from "../helpers/locale";
import {
  readPhiSiteRuntimeConfigSync,
} from "../helpers/site-runtime";
import { loadPhiRootLayoutContext } from "../server-helpers/root-layout";
import { resolvePhiResolvedRequestLocale } from "../server-helpers/request-locale";

async function loadPhiNextRootContract() {
  const runtimeConfig = readPhiSiteRuntimeConfigSync();
  const { site, resolvedLocale } = await loadPhiRootLayoutContext({
    apiBaseUrl: runtimeConfig.phis.apiBaseUrl,
    internalToken: runtimeConfig.phis.internalToken,
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
 */
export function createPhiNextRootLayout(siteModules: PhiSiteModuleServerAreaContributions = {}) {
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

    return (
      <html lang={resolvedLocale.intlLocale} style={{ fontSize: `${remRootValue}px` }}>
        <body>
          <PhiRootLayout
            apiBaseUrl={runtimeConfig.phis.apiBaseUrl}
            internalToken={runtimeConfig.phis.internalToken}
            siteKey={runtimeConfig.site.key}
            site={site}
            resolvedLocale={resolvedLocale}
            themePresets={blocks.palettes}
            themeBlocks={blocks}
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
    apiBaseUrl: runtimeConfig.phis.apiBaseUrl,
    internalToken: runtimeConfig.phis.internalToken,
    siteKey: runtimeConfig.site.key,
  });
  redirect(localizePath(resolvedLocale.locale, "/"));
}
