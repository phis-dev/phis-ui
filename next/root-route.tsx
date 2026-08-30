import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PhiRootLayout } from "../components/root/phi-root-layout";
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

  return (
    <html lang={resolvedLocale.intlLocale} style={{ fontSize: `${remRootValue}px` }}>
      <body>
        <PhiRootLayout
          apiBaseUrl={runtimeConfig.phis.apiBaseUrl}
          internalToken={runtimeConfig.phis.internalToken}
          siteKey={runtimeConfig.site.key}
          site={site}
          resolvedLocale={resolvedLocale}
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
