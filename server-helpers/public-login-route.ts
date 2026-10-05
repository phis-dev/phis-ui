import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";

import { PHI_CANONICAL_SOURCE_LOCALE, localizeAreaPath } from "../helpers/locale";
import { getPhiExactSiteArea } from "./cms";
import { getPhiCapabilitySnapshot } from "../gateway/server-capabilities";
import { resolvePhiRequestLocale } from "./request-locale";
import {
  readPhiAreaLandingSelection,
  readPhiAreaPublicRoutePaths,
} from "../helpers/cms-area-config";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePresetByPageId,
} from "../plugins/runtime-modules/descriptor-compiler";
import { PHI_PUBLIC_LOGIN_ROUTE_IDENTITY } from "../constants/public-login-route";
import { createPhiPresetCmsPageId } from "../types/cms-instance-id";
import { resolveActivePresetModuleKeys } from "./cms-request";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";
import { PHIS_REQUEST_PATH_HEADER, PHIS_REQUEST_SEARCH_HEADER } from "../constants/http-headers";
import type { PhiCapabilitySnapshot } from "../types/server-capabilities";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

/** The address the Auth Module declares for signing in; what a Site that reassigned it answers is in the table. */
const PHI_PUBLIC_LOGIN_PATH = "/login";
const PHI_PUBLIC_LOGIN_PAGE_ID = createPhiPresetCmsPageId(PHI_PUBLIC_LOGIN_ROUTE_IDENTITY);

/**
 * The server this Site talks to, as the bridge states it.
 *
 * A bridge without a Site key cannot ask Core anything, and asking with an empty key used to be answered
 * by Core's refusal, swallowed, and read as "no login configured" -- a configuration fault dressed as a
 * fact about the Site. It is an error here, and it says what is missing.
 */
function readPhiBridgeApiOptions(cmsBridge: PhiCmsSiteBridge) {
  const siteKey = cmsBridge.runtime?.siteKey?.trim();
  if (!siteKey) {
    throw new Error("PhiCmsSiteBridge.runtime.siteKey is required to resolve the Public login route.");
  }
  return {
    apiBaseUrl: cmsBridge.runtime?.apiBaseUrl ?? readPhiServerApiCredentials().apiBaseUrl,
    internalToken: cmsBridge.runtime?.internalToken ?? readPhiServerApiCredentials().internalToken,
    siteKey,
  };
}

/**
 * Resolves the Public login href, or `null` when no active Auth Module owns the login route.
 *
 * `AUTHENTICATION.md` section 6 requires protected access to fail closed where nobody owns the login
 * route. Disabling the Auth Module is permitted and has no runtime fallback, so the route can genuinely
 * be absent -- and a guard that assumes it lands the visitor on a 404 that reports a missing page where
 * access is refused.
 *
 * The route is looked up by its Page identity in the Area's active route table, not by `/login`: the
 * path is the Site's to assign (`publicRoutePaths`), and a guard that asked for `/login` after the Site
 * had moved signing in to `/sign-in` either sent visitors to whatever Module had taken `/login` or
 * reported "no login" and shut the Area.
 *
 * Only the redirect path pays for this: an unauthenticated visitor reaching a staff Area.
 */
export const resolvePhiPublicLoginHref = cache(async function resolvePhiPublicLoginHref(
  cmsBridge: PhiCmsSiteBridge,
  locale: string,
  serverCapabilities?: PhiCapabilitySnapshot | null,
): Promise<string | null> {
  const catalog = resolvePhiCmsDescriptorCatalog(cmsBridge.runtimeModuleCatalog);
  const shellBinding = resolvePhiCmsAreaShellPresetBinding(catalog, "public");
  if (!shellBinding) {
    /**
     * This bridge does not carry the Public Area definition -- a staff Area catalog deliberately does
     * not, which is what keeps its module graph small. The route cannot be verified from here, and
     * "cannot tell" is not "absent": refusing would strand a visitor on a Site with a working sign-in
     * page. Offer the declared path instead. An absent login route now answers a real 404 of its own
     * rather than a 200 with the 404 page, so the visitor still learns the truth.
     */
    return localizeAreaPath(locale, "public", PHI_PUBLIC_LOGIN_PATH);
  }

  const cookieStore = await cookies();
  const areaPreset = await getPhiExactSiteArea({
    path: "/",
    ...readPhiBridgeApiOptions(cmsBridge),
    locale,
    cookieHeader: cookieStore.toString(),
    sourcePreset: {
      ownerModuleId: shellBinding.descriptor.ownerModuleId,
      presetKey: shellBinding.descriptor.presetKey,
    },
  });

  const activeModuleIds = resolveActivePresetModuleKeys(
    cmsBridge.runtimeModuleCatalog,
    "public",
    areaPreset ? { preset: areaPreset.preset } : null,
    serverCapabilities ?? null,
  );
  const routeTable = compilePhiCmsActiveRouteTable({
    catalog,
    area: "public",
    activeModuleIds,
    publicRoutePaths: readPhiAreaPublicRoutePaths(areaPreset?.preset.preset.config),
    landingSelection: readPhiAreaLandingSelection(areaPreset?.preset.preset.config),
  });

  const login = resolvePhiCmsRoutePresetByPageId(routeTable, PHI_PUBLIC_LOGIN_PAGE_ID);
  return login ? localizeAreaPath(locale, "public", login.descriptor.path) : null;
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
  /*
   * The locale the Site resolves for this request: the viewer's own choice, then the browser, then the
   * Site's default -- the same chain every page is drawn with, so a refusal sends a German browser to the
   * German login. Only if the Site cannot be reached is it the language this software is written in,
   * the one this process is certain to have text for.
   */
  const api = readPhiBridgeApiOptions(cmsBridge);
  const locale = await resolvePhiRequestLocale(api).catch(() => PHI_CANONICAL_SOURCE_LOCALE);
  /*
   * The snapshot has to be loaded, and a failure to load it has to be an error: a module whose server
   * binding cannot be checked resolves as unavailable, which would drop the Auth Module and make every
   * refusal look like "no login configured". Swallowing the failure into `null` did exactly that
   * whenever Core did not answer for a moment.
   */
  const serverCapabilities = await getPhiCapabilitySnapshot(api);
  const login = await resolvePhiPublicLoginHref(cmsBridge, locale, serverCapabilities);
  if (!login) {
    return null;
  }

  /*
   * Back to what was asked for, query included, as the Area guard sends a visitor back to the path they
   * requested: signing in only to land on the Area's root drops the page that was being opened. The
   * proxy states the request path on every request it passes; a static render has none to state and
   * no query, so it names the Area root, as the guard does where no path is known.
   */
  const requestHeaders = await headers();
  const requestPath = requestHeaders.get(PHIS_REQUEST_PATH_HEADER)?.trim();
  const requestSearch = requestHeaders.get(PHIS_REQUEST_SEARCH_HEADER)?.trim().replace(/^\?/, "");
  const requestedPath = requestPath && (requestPath.startsWith("/") ? requestPath : `/${requestPath}`);
  const next = requestedPath
    ? `${requestedPath}${requestSearch ? `?${requestSearch}` : ""}`
    : root.startsWith("/") ? root : `/${root}`;
  return `${login}?${new URLSearchParams({ login: "1", next }).toString()}`;
}
