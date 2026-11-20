import "server-only";

import { getExactSiteArea, type PhiSiteAreaRead } from "../gateway/site-area";
import { getResolvedCmsPage } from "../gateway/site-page";
import { resolvePhiRuntimeConfig } from "../helpers/phis-runtime";
import type { PhiCmsReviewParams } from "./cms-review";
import type { PhiResolvedCmsPagePayload } from "../types/cms";
import { maybeGetPhiRequestRuntime } from "./request-runtime";
import type { PhiCmsPresetIdentity } from "../types/cms-module-descriptors";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

export type GetPhiCmsPageOptions = {
  path: string;
  apiBaseUrl?: string;
  internalToken?: string;
  siteKey?: string;
  locale?: string;
  revision?: number | null;
  review?: PhiCmsReviewParams | null;
  cookieHeader?: string | null;
  sourcePreset?: PhiCmsPresetIdentity | null;
};

export async function getPhiCmsPage({
  path,
  apiBaseUrl,
  internalToken,
  siteKey,
  locale,
  revision,
  review,
  cookieHeader,
  sourcePreset,
}: GetPhiCmsPageOptions): Promise<PhiResolvedCmsPagePayload | null> {
  const runtime = maybeGetPhiRequestRuntime();
  const resolvedRuntime = resolvePhiRuntimeConfig(
    {
      apiBaseUrl: apiBaseUrl ?? readPhiServerApiCredentials().apiBaseUrl,
      internalToken: internalToken ?? readPhiServerApiCredentials().internalToken,
      siteKey: siteKey ?? runtime?.site.key,
    },
    { context: "getPhiCmsPage", requireSiteKey: true },
  );

  return getResolvedCmsPage({
    apiBaseUrl: resolvedRuntime.apiBaseUrl,
    internalToken: resolvedRuntime.internalToken,
    siteKey: resolvedRuntime.siteKey as string,
    path,
    locale: locale ?? runtime?.locale.current,
    revision,
    review,
    cookieHeader,
    sourcePreset,
  });
}

/** Without `sourcePreset` the Area answers its selection and its one stored structure, whatever identity it has. */
export type GetPhiCmsAreaOptions = GetPhiCmsPageOptions;

export async function getPhiExactSiteArea({
  path,
  apiBaseUrl,
  internalToken,
  siteKey,
  locale,
  revision,
  review,
  cookieHeader,
  sourcePreset,
}: GetPhiCmsAreaOptions): Promise<PhiSiteAreaRead | null> {
  const runtime = maybeGetPhiRequestRuntime();
  const resolvedRuntime = resolvePhiRuntimeConfig(
    {
      apiBaseUrl: apiBaseUrl ?? readPhiServerApiCredentials().apiBaseUrl,
      internalToken: internalToken ?? readPhiServerApiCredentials().internalToken,
      siteKey: siteKey ?? runtime?.site.key,
    },
    { context: "getPhiExactSiteArea", requireSiteKey: true },
  );

  return getExactSiteArea({
    apiBaseUrl: resolvedRuntime.apiBaseUrl,
    internalToken: resolvedRuntime.internalToken,
    siteKey: resolvedRuntime.siteKey as string,
    path,
    locale: locale ?? runtime?.locale.current,
    revision,
    review,
    cookieHeader,
    sourcePreset,
  });
}
