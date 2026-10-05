import { isPhiRecord } from "../../helpers/is-record";
import { permanentRedirect, redirect } from "next/navigation";

import { PhiCmsPageType } from "../../constants/phi-cms";
import { localizeAreaPath, SUPPORTED_CMS_AREAS } from "../../helpers/locale";
import type { PhiCmsPageNode, PhiCmsPageRedirectConfig } from "../../types/cms";

type RedirectResolution = {
  href: string;
  permanent: boolean;
};

function readRedirectConfig(layoutConfig: Record<string, unknown> | null | undefined): PhiCmsPageRedirectConfig | null {
  const rawRedirect = layoutConfig?.redirect;
  if (!isPhiRecord(rawRedirect)) {
    return null;
  }

  const rawTarget = rawRedirect.target;
  if (!isPhiRecord(rawTarget)) {
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

  /*
   * Stated, never assumed. An absent status used to mean permanent, and a browser keeps a 308 long
   * after the reason for it: a forward whose target depends on Modules or on the viewer would stick.
   */
  const rawStatus = rawRedirect.status;
  if (rawStatus !== 301 && rawStatus !== 302 && rawStatus !== 307 && rawStatus !== 308) {
    return null;
  }
  const status = rawStatus;

  return {
    target: {
      area: area.trim().toLowerCase() as PhiCmsPageRedirectConfig["target"]["area"],
      path,
    },
    status,
  };
}

/**
 * Where a forwarding Page sends the request, or nothing when it is already there.
 *
 * `currentPathname` is what keeps a forward from repeating. Which Page a render resolved is derived
 * rather than given wherever the request path is not carried down, and a derivation that lands on the
 * Area root instead of the Page below it produces a forward onto the path the request already names.
 * That does not fail: the client applies it, asks again, and receives the same answer -- for a client
 * navigation the forward is streamed as a serialised NEXT_REDIRECT, so the loop runs at request speed.
 *
 * The comparison lives here rather than at each call site because it already drifted once: the Layout
 * had it and the two Page entry points did not.
 */
export function resolvePhiCmsPageRedirect(
  page: PhiCmsPageNode,
  locale: string,
  currentPathname?: string | null,
): RedirectResolution | null {
  if (page.pageType !== PhiCmsPageType.Redirect) {
    return null;
  }

  const redirectConfig = readRedirectConfig(page.layoutConfig);
  if (!redirectConfig) {
    throw new Error(
      `Redirect page "${page.path}" requires layoutConfig.redirect.target.area, .target.path and .status.`,
    );
  }

  const href = localizeAreaPath(locale, redirectConfig.target.area, redirectConfig.target.path);
  if (currentPathname && href === currentPathname) {
    return null;
  }

  return {
    href,
    permanent: redirectConfig.status === 301 || redirectConfig.status === 308,
  };
}

export function performPhiCmsPageRedirect(resolution: RedirectResolution) {
  if (resolution.permanent) {
    permanentRedirect(resolution.href);
  }

  redirect(resolution.href);
}
