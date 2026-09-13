import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";

export type PhiPublishedPublicPage = {
  path: string | null;
  ownerModuleId: string | null;
  presetKey: string | null;
  publishedAt: string;
};

function readPublishedPage(entry: unknown): PhiPublishedPublicPage {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("Invalid published Public Page projection.");
  }
  const value = entry as Record<string, unknown>;
  const isNullableString = (field: unknown) => field === null || typeof field === "string";
  if (
    !isNullableString(value.path) ||
    !isNullableString(value.ownerModuleId) ||
    !isNullableString(value.presetKey) ||
    typeof value.publishedAt !== "string"
  ) {
    throw new Error("Invalid published Public Page projection.");
  }
  return {
    path: value.path as string | null,
    ownerModuleId: value.ownerModuleId as string | null,
    presetKey: value.presetKey as string | null,
    publishedAt: value.publishedAt,
  };
}

/**
 * The Site's published Public Pages, as addresses to resolve rather than as answers.
 *
 * What the server returns is only who could be in a sitemap. Whether one is -- visible to a visitor,
 * not a redirect, not `noindex` -- the caller finds out by resolving it like a page view.
 */
export async function fetchPhiPublishedPublicPages(input: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
}): Promise<PhiPublishedPublicPage[]> {
  const response = await fetch(buildApiUrl(input.apiBaseUrl, "/api/v1/site/public-pages"), {
    method: "GET",
    headers: buildApiHeaders({
      token: input.internalToken,
      siteKey: input.siteKey,
      includeToken: true,
      includeSiteKey: true,
      extra: { Accept: "application/json", "User-Agent": "phis-ui-sitemap/1.0" },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Failed to list published Public Pages (${response.status}).`);

  const payload = (await response.json().catch(() => null)) as { pages?: unknown } | null;
  if (!Array.isArray(payload?.pages)) {
    throw new Error("Missing published Public Page projection.");
  }
  return payload.pages.map(readPublishedPage);
}
