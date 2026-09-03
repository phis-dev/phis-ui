import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { PHI_CANONICAL_SOURCE_LOCALE, localizeAreaPath } from "../helpers/locale";
import { getPhiExactSiteArea } from "./cms";
import { getPhiServerCapabilitySnapshot } from "../gateway/server-capabilities";
import { fetchSiteLocaleConfig } from "./site-locale";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../plugins/runtime-modules/descriptor-compiler";
import { resolveActivePresetModuleKeys } from "./cms-request";
import type { PhiBlockRuntime } from "../types";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";
import type { PhiServerCapabilitySnapshot } from "../types/server-capabilities";

const PHI_PUBLIC_LOGIN_PATH = "/login";

/**
 * Resolves the canonical Public login href, or `null` when no active Auth Module owns that route.
 *
 * `AUTHENTICATION.md` section 6 keeps `/login` the stable replacement route and requires protected
 * access to fail closed where nobody owns it. Disabling the Auth Module is permitted and has no runtime
 * fallback, so the route can genuinely be absent -- and a guard that assumes it lands the visitor on a
 * 404 that reports a missing page where access is refused.
 *
 * Only the redirect path pays for this: an unauthenticated visitor reaching a staff Area.
 */
export const resolvePhiPublicLoginHref = cache(async function resolvePhiPublicLoginHref(
  cmsBridge: PhiCmsSiteBridge,
  locale: string,
  viewer?: PhiBlockRuntime["viewer"],
  serverCapabilities?: PhiServerCapabilitySnapshot | null,
): Promise<string | null> {
  const catalog = resolvePhiCmsDescriptorCatalog(cmsBridge.runtimeModuleCatalog);
  const shellBinding = resolvePhiCmsAreaShellPresetBinding(catalog, "public");
  if (!shellBinding) {
    /**
     * This bridge does not carry the Public Area definition -- a staff Area catalog deliberately does
     * not, which is what keeps its module graph small. The route cannot be verified from here, and
     * "cannot tell" is not "absent": refusing would strand a visitor on a Site with a working sign-in
     * page. Offer the canonical path instead. An absent login route now answers a real 404 of its own
     * rather than a 200 with the 404 page, so the visitor still learns the truth.
     */
    return localizeAreaPath(locale, "public", PHI_PUBLIC_LOGIN_PATH);
  }

  const cookieStore = await cookies();
  const areaPreset = await getPhiExactSiteArea({
    path: PHI_PUBLIC_LOGIN_PATH,
    apiBaseUrl: cmsBridge.runtime?.apiBaseUrl,
    internalToken: cmsBridge.runtime?.internalToken,
    siteKey: cmsBridge.runtime?.siteKey ?? "",
    locale,
    cookieHeader: cookieStore.toString(),
    sourcePreset: {
      ownerModuleId: shellBinding.descriptor.ownerModuleId,
      presetKey: shellBinding.descriptor.presetKey,
    },
  }).catch(() => null);

  const activeModuleIds = resolveActivePresetModuleKeys(
    cmsBridge.runtimeModuleCatalog,
    "public",
    areaPreset ? { preset: areaPreset.preset } : null,
    serverCapabilities ?? null,
    viewer,
  );
  const routeTable = compilePhiCmsActiveRouteTable({
    catalog,
    area: "public",
    activeModuleIds,
    viewer,
  });

  return resolvePhiCmsRoutePreset(routeTable, PHI_PUBLIC_LOGIN_PATH)
    ? localizeAreaPath(locale, "public", PHI_PUBLIC_LOGIN_PATH)
    : null;
});

/**
 * The same lookup for a request whose Area payload was refused before any runtime resolved: there is no
 * viewer and no capability snapshot to filter with, so the anonymous route table decides. Returns the
 * href with `next` attached, or `null` when no Auth Module owns the route.
 */
export async function resolvePhiUnauthenticatedLoginHref(
  cmsBridge: PhiCmsSiteBridge,
  root: string,
): Promise<string | null> {
  const cookieStore = await cookies();
  /*
   * The viewer's own choice, then the Site's default, and only then the language this software is
   * written in.
   *
   * The last of those used to be the only fallback, which sent a Site with no English at all to a
   * login page in a language it does not publish. The Site is asked only when there is no cookie, and
   * its locale config is cached; if even that cannot be reached, the source language is the one
   * string this process is certain to have text for.
   */
  const cookieLocale = cookieStore.get("phis_locale")?.value?.trim();
  const siteLocaleConfig = cookieLocale
    ? null
    : await fetchSiteLocaleConfig({
        apiBaseUrl: cmsBridge.runtime?.apiBaseUrl ?? "",
        internalToken: cmsBridge.runtime?.internalToken ?? "",
        siteKey: cmsBridge.runtime?.siteKey ?? "",
      }).catch(() => null);
  const locale = cookieLocale || siteLocaleConfig?.defaultLocale || PHI_CANONICAL_SOURCE_LOCALE;
  // The snapshot has to be loaded here rather than defaulted to null: a module whose server binding
  // cannot be checked resolves as unavailable, which would drop the Auth Module and make every refusal
  // look like "no login configured".
  const serverCapabilities = await getPhiServerCapabilitySnapshot({
    apiBaseUrl: cmsBridge.runtime?.apiBaseUrl ?? "",
    internalToken: cmsBridge.runtime?.internalToken ?? "",
    siteKey: cmsBridge.runtime?.siteKey ?? "",
  }).catch(() => null);
  const login = await resolvePhiPublicLoginHref(cmsBridge, locale, undefined, serverCapabilities);
  if (!login) {
    return null;
  }

  const next = root.startsWith("/") ? root : `/${root}`;
  return `${login}?${new URLSearchParams({ login: "1", next }).toString()}`;
}
