import { permanentRedirect, redirect } from "next/navigation";

import { PhiCmsPageType } from "../../constants/phi-cms";
import { localizeAreaPath, SUPPORTED_CMS_AREAS } from "../../helpers/locale";
import type { PhiCmsPageNode, PhiCmsPageRedirectConfig } from "../../types/cms";

type RedirectResolution = {
  href: string;
  permanent: boolean;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readRedirectConfig(layoutConfig: Record<string, unknown> | null | undefined): PhiCmsPageRedirectConfig | null {
  const rawRedirect = layoutConfig?.redirect;
  if (!isPlainRecord(rawRedirect)) {
    return null;
  }

  const rawTarget = rawRedirect.target;
  if (!isPlainRecord(rawTarget)) {
    return null;
  }

  const area = rawTarget.area;
  const path = rawTarget.path;
  if (typeof area !== "string" || !SUPPORTED_CMS_AREAS.includes(area.trim().toLowerCase() as (typeof SUPPORTED_CMS_AREAS)[number])) {
    return null;
  }

  if (typeof path !== "string") {
    return null;
  }

  const rawStatus = rawRedirect.status;
  const status =
    rawStatus === 301 || rawStatus === 302 || rawStatus === 307 || rawStatus === 308
      ? rawStatus
      : undefined;

  return {
    target: {
      area: area.trim().toLowerCase() as PhiCmsPageRedirectConfig["target"]["area"],
      path,
    },
    status,
  };
}

export function resolvePhiCmsPageRedirect(
  page: PhiCmsPageNode,
  locale: string,
): RedirectResolution | null {
  if (page.pageType !== PhiCmsPageType.Redirect) {
    return null;
  }

  const redirectConfig = readRedirectConfig(page.layoutConfig);
  if (!redirectConfig) {
    throw new Error(
      `Redirect page "${page.path}" requires layoutConfig.redirect.target.area and layoutConfig.redirect.target.path.`,
    );
  }

  return {
    href: localizeAreaPath(locale, redirectConfig.target.area, redirectConfig.target.path),
    permanent: redirectConfig.status == null || redirectConfig.status === 301 || redirectConfig.status === 308,
  };
}

export function performPhiCmsPageRedirect(resolution: RedirectResolution) {
  if (resolution.permanent) {
    permanentRedirect(resolution.href);
  }

  redirect(resolution.href);
}
