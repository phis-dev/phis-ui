import "server-only";

import {
  canonicalHrefUnlessCurrent,
  isKnownSpecialCmsRoot,
  normalizePhiCmsRouteSegment,
} from "../helpers/cms-routing";
import {
  normalizeSiteLocale,
} from "../helpers/site-locale-config";
import { maybeGetPhiRequestRuntime } from "./request-runtime";
import { resolvePhiRequestLocale } from "./request-locale";
import { fetchSiteLocaleConfig, type FetchSiteLocaleConfigOptions } from "./site-locale";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

export type PhiResolvedRootRoute = {
  rootKind: "locale" | "area";
  root: string;
  locale: string;
  area: "public" | "app" | "admin" | "builder" | "editor" | "accounting";
  cmsPath: string;
  canonicalHref: string | null;
};

function normalizeSegments(segments: string[] | undefined) {
  if (!segments?.length) {
    return [];
  }

  return segments.map(normalizePhiCmsRouteSegment).filter(Boolean);
}

function buildCmsPathFromSegments(segments: string[]) {
  if (segments.length === 0) {
    return "/";
  }

  return `/${segments.join("/")}`;
}

function buildCanonicalHref(root: string, segments: string[]) {
  if (segments.length === 0) {
    return `/${root}`;
  }

  return `/${root}/${segments.join("/")}`;
}

export async function resolveCmsRootRoute(
  root: string,
  segments: string[] | undefined,
  runtime: FetchSiteLocaleConfigOptions = {},
): Promise<PhiResolvedRootRoute> {
  const requestRuntime = maybeGetPhiRequestRuntime();
  const runtimeOptions = {
    apiBaseUrl: runtime.apiBaseUrl ?? readPhiServerApiCredentials().apiBaseUrl,
    internalToken: runtime.internalToken ?? readPhiServerApiCredentials().internalToken,
    siteKey: runtime.siteKey ?? requestRuntime?.site.key,
  };
  const normalizedRoot = root.trim().toLowerCase();
  const normalizedSegments = normalizeSegments(segments);

  if (isKnownSpecialCmsRoot(normalizedRoot)) {
    return {
      rootKind: "area",
      root: normalizedRoot,
      locale: await resolvePhiRequestLocale(runtimeOptions),
      area: normalizedRoot as PhiResolvedRootRoute["area"],
      cmsPath: buildCanonicalHref(normalizedRoot, normalizedSegments),
      canonicalHref: null,
    };
  }

  const localeConfig = await fetchSiteLocaleConfig(runtimeOptions);
  const normalizedLocale = normalizeSiteLocale(normalizedRoot, localeConfig);

  /*
   * The requested address is the one the browser sent, in its own spelling. The canonical one carries
   * the Site's spelling of the locale (`pt-BR`), and `canonicalHrefUnlessCurrent` compares exactly, so
   * building the requested side from the lowercased root made every regional locale a forward onto
   * itself -- `/pt-BR/x` was told its canonical address is `/pt-BR/x`, and the client asked again.
   */
  const requestedRoot = root.trim();

  return {
    rootKind: "locale",
    root: normalizedLocale,
    locale: normalizedLocale,
    area: "public",
    cmsPath: buildCmsPathFromSegments(normalizedSegments),
    canonicalHref: canonicalHrefUnlessCurrent(
      buildCanonicalHref(normalizedLocale, normalizedSegments),
      buildCanonicalHref(requestedRoot, normalizedSegments),
    ),
  };
}
