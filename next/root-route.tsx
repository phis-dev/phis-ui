import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PhiRootLayout } from "../components/root/phi-root-layout";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { loadPhiThemeBlockCatalog } from "../plugins/runtime-modules/theme/block-catalog";
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

export async function PhiNextRootLayout({ children }: { children: React.ReactNode }) {
  const { runtimeConfig, site, resolvedLocale } = await loadPhiNextRootContract();
  const remRootValue = site.theme?.rem?.rootValue ?? 16;
  /*
   * The Theme blocks this Site can follow. Asked here rather than per Area, because a Theme is
   * site-wide: the same record has to resolve the same way on every page.
   */
  const themeBlocks = await loadPhiThemeBlockCatalog(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG);

  return (
    <html lang={resolvedLocale.intlLocale} style={{ fontSize: `${remRootValue}px` }}>
      <body>
        <PhiRootLayout
          apiBaseUrl={runtimeConfig.phis.apiBaseUrl}
          internalToken={runtimeConfig.phis.internalToken}
          siteKey={runtimeConfig.site.key}
          site={site}
          resolvedLocale={resolvedLocale}
          themePresets={themeBlocks.palettes}
          themeBlocks={themeBlocks}
        >
          {children}
        </PhiRootLayout>
      </body>
    </html>
  );
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
