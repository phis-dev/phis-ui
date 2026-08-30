import "server-only";

import {
  isKnownSpecialCmsRoot,
  normalizePhiCmsRouteSegment,
} from "../helpers/cms-routing";
import {
  normalizeSiteLocale,
} from "../helpers/site-locale-config";
import { maybeGetPhiRequestRuntime } from "./request-runtime";
import { resolvePhiRequestLocale } from "./request-locale";
import { fetchSiteLocaleConfig, type FetchSiteLocaleConfigOptions } from "./site-locale";

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
    apiBaseUrl: runtime.apiBaseUrl ?? requestRuntime?.phis.apiBaseUrl,
    internalToken: runtime.internalToken ?? requestRuntime?.phis.internalToken,
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

  return {
    rootKind: "locale",
    root: normalizedLocale,
    locale: normalizedLocale,
    area: "public",
    cmsPath: buildCmsPathFromSegments(normalizedSegments),
    canonicalHref:
      normalizedRoot === normalizedLocale
        ? null
        : buildCanonicalHref(normalizedLocale, normalizedSegments),
  };
}
