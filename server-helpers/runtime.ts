import "server-only";
import { hasPhiSiteSessionCookie } from "../constants/site-cookies";

import { cache } from "react";
import { resolvePhiCmsAreaKey } from "../constants/cms-areas";
import { resolvePhiRuntimeConfig } from "../helpers/phis-runtime";
import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import { getResolvedSiteConfig } from "../gateway/site-config";
import { getPhiCapabilitySnapshot } from "../gateway/server-capabilities";
import type {
  PhiWidgetAreaKey,
  PhiBlockRuntime,
  PhiBlockRuntimeSite,
  PhiWidgetThemeMode,
} from "../types/widget-runtime";
import type { PhiSiteFontSlots } from "../types/site-theme";
import {
  normalizePhiThemeModePreference,
  readPhiColorSchemeHintFromCookieHeader,
  readPhiThemeModePreferenceFromCookieHeader,
  resolvePhiThemeMode,
} from "../theme/phi-theme-mode";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import type { PhiSiteRequestContext } from "../types/site-request-context";

type PhiWidgetSiteTheme = NonNullable<PhiBlockRuntime["site"]["theme"]>;

type PhiResolvedWidgetRuntimeSite = PhiBlockRuntimeSite & {
  name: string;
  hostname: string;
  availableLocales: Array<{
    code: string;
    label: string;
  }>;
  store: {
    enabled: boolean;
  };
  themeRevision: {
    publishedRevisionId: number | null;
    workingDraftRevisionId: number | null;
  };
  theme: {
    mode: PhiWidgetThemeMode;
    fonts?: PhiSiteFontSlots | null;
    brand?: PhiWidgetSiteTheme["brand"];
    contact?: PhiWidgetSiteTheme["contact"];
    shell?: PhiWidgetSiteTheme["shell"];
    root?: PhiWidgetSiteTheme["root"];
  };
};

function requirePhiViewerArea(area: PhiWidgetAreaKey | null | undefined): PhiWidgetAreaKey {
  if (!area) {
    throw new Error("The auth viewer answered a signed-in session without its Area.");
  }
  return area;
}

export type PhiViewerState = PhiBlockRuntime["viewer"];

export type GetPhiCmsRuntimeInfoOptions = {
  apiBaseUrl?: string;
  internalToken?: string;
  siteKey?: string;
  cookieHeader?: string;
};

export type PhiCmsRuntimeInfo = {
  site: PhiResolvedWidgetRuntimeSite;
  viewer: PhiViewerState;
};

export function resolvePhiWidgetAreaKey(areaMask: number): PhiWidgetAreaKey {
  return resolvePhiCmsAreaKey(areaMask);
}

export function buildPhiBlockRuntime({
  requestContext,
  areaMask,
  page,
  request,
}: {
  requestContext: PhiSiteRequestContext;
  areaMask: number;
  page?: PhiBlockRuntime["page"];
  request?: PhiBlockRuntime["request"];
}): PhiBlockRuntime {
  return {
    site: requestContext.site,
    locale: requestContext.locale,
    area: resolvePhiWidgetAreaKey(areaMask),
    viewer: requestContext.viewer,
    ...(page ? { page } : {}),
    ...(request ? { request } : {}),
  };
}

export async function getPhiCmsRuntimeInfo({
  apiBaseUrl,
  internalToken,
  siteKey,
  cookieHeader,
}: GetPhiCmsRuntimeInfoOptions = {}): Promise<PhiCmsRuntimeInfo> {
  const resolvedRuntime = resolvePhiRuntimeConfig(
    { apiBaseUrl, internalToken, siteKey },
    { context: "getPhiCmsRuntimeInfo", requireSiteKey: true },
  );

  const site = await getResolvedSiteConfig({
    apiBaseUrl: resolvedRuntime.apiBaseUrl,
    internalToken: resolvedRuntime.internalToken,
    siteKey: resolvedRuntime.siteKey as string,
  });
  const resolvedSite: PhiResolvedWidgetRuntimeSite = {
    id: site.id,
    key: site.key,
    publicUrl: site.publicUrl,
    name: site.name,
    hostname: site.hostname,
    availableLocales: site.availableLocales,
    defaultLocale: site.defaultLocale,
    store: {
      enabled: Boolean(site.store?.enabled),
    },
    themeRevision: site.themeRevision,
    theme: {
      mode: site.theme?.mode === "dark" ? "dark" : "light",
      ...(site.theme?.preset ? { preset: site.theme.preset } : {}),
      ...(site.theme?.presetVersion != null ? { presetVersion: site.theme.presetVersion } : {}),
      ...(site.theme?.fonts ? { fonts: site.theme.fonts } : {}),
      ...(site.theme?.brand ? { brand: site.theme.brand } : {}),
      ...(site.theme?.contact ? { contact: site.theme.contact } : {}),
      ...(site.theme?.shell ? { shell: site.theme.shell } : {}),
      ...(site.theme?.root ? { root: site.theme.root } : {}),
      ...(site.theme?.palette ? { palette: site.theme.palette } : {}),
      ...(site.theme?.style ? { style: site.theme.style } : {}),
      ...(site.theme?.components ? { components: site.theme.components } : {}),
    },
  };

  /*
   * The mode this viewer is shown until something overrides it live. It sits beside the viewer's
   * other preferences rather than in `site.theme`, which stays the Theme record the Theme workspace
   * builds its draft from.
   *
   * It still reads the cookie, and for a signed-in viewer that cookie is no longer the choice itself
   * but a mirror of the account: the server writes it on login and whenever the choice changes, so it
   * follows the person between browsers. Reading it here rather than the account keeps this agreeing
   * with the two readers that cannot see an account at all -- the static proxy and the script that
   * runs before the first paint. The account's own answer travels separately as `preferredThemeMode`,
   * because a panel has to show what was chosen, not what it resolved to.
   */
  const viewerThemeMode = resolvePhiThemeMode(
    readPhiThemeModePreferenceFromCookieHeader(cookieHeader),
    readPhiColorSchemeHintFromCookieHeader(cookieHeader),
  );

  const anonymous = (): PhiCmsRuntimeInfo => ({
    site: resolvedSite,
    viewer: {
      access: "public",
      resolvedArea: "public",
      roleClaims: [],
      groupClaims: [],
      authorizationRevision: 0,
      userName: null,
      userEmail: null,
      themeMode: viewerThemeMode,
    },
  });
  /*
   * Core resolves the viewer from the Site session cookie and nothing else (`getSiteRequestActorFromRequest`),
   * and answers 401 where there is none. Asking anyway made every anonymous view -- and every scanner
   * hitting a 404 -- pay one Core round trip to be told what the request already said.
   */
  if (!hasPhiSiteSessionCookie(cookieHeader)) {
    return anonymous();
  }

  const response = await fetch(buildApiUrl(resolvedRuntime.apiBaseUrl, "/api/v1/auth/me"), {
    headers: buildApiHeaders({
      token: resolvedRuntime.internalToken,
      includeToken: true,
      siteKey: resolvedRuntime.siteKey as string,
      includeSiteKey: true,
      gateway: true,
      cookie: cookieHeader,
    }),
    cache: "no-store",
  });

  if (response.status === 401) {
    return anonymous();
  }

  if (!response.ok) {
    throw new Error(`Failed to resolve auth viewer (${response.status}).`);
  }

  const payload = (await response.json()) as {
    authenticated?: boolean;
    area?: PhiWidgetAreaKey | null;
    user?: {
      id?: number | null;
      name?: string | null;
      email?: string | null;
      roleClaims?: Array<{
        providerId?: string | null;
        flags?: number | null;
      }>;
      groupClaims?: Array<{
        providerId?: string | null;
        key?: string | null;
        flags?: number | null;
      }>;
      addonRoleClaims?: Array<{
        providerId?: string | null;
        roles?: unknown;
      }>;
      authorizationRevision?: number | null;
      newsletterOptIn?: boolean | null;
      preferredLocale?: string | null;
      themeMode?: string | null;
      mustChangePassword?: boolean;
      profile?: {
        firstName?: string | null;
        lastName?: string | null;
        companyName?: string | null;
      } | null;
    };
  };

  if (!payload.authenticated) {
    return {
      site: resolvedSite,
      viewer: {
        access: "public",
        resolvedArea: "public",
        roleClaims: [],
        groupClaims: [],
        authorizationRevision: 0,
        userName: null,
        userEmail: null,
        themeMode: viewerThemeMode,
      },
    };
  }

  return {
    site: resolvedSite,
      viewer: {
        access: "authenticated",
        /*
         * phis-server answers a signed-in viewer's Area every time (`resolvePhiUserArea`). A missing
         * one used to become `app`, which the access guard then forwarded to -- onto an Area this
         * viewer may not enter, and round again.
         */
        resolvedArea: requirePhiViewerArea(payload.area),
        roleClaims: (payload.user?.roleClaims ?? [])
          .filter((claim): claim is { providerId: `@${string}/${string}`; flags: number } =>
            typeof claim.providerId === "string" &&
            /^@[^/]+\/[^/]+/.test(claim.providerId) &&
            typeof claim.flags === "number" &&
            Number.isInteger(claim.flags) &&
            claim.flags >= 0,
          )
          .map((claim) => ({ providerId: claim.providerId, flags: claim.flags })),
        groupClaims: (payload.user?.groupClaims ?? [])
          .filter((claim): claim is { providerId: `@${string}/${string}`; key: string; flags: number } =>
            typeof claim.providerId === "string" &&
            /^@[^/]+\/[^/]+/.test(claim.providerId) &&
            typeof claim.key === "string" &&
            /^[a-z0-9][a-z0-9._-]{0,159}$/u.test(claim.key) &&
            typeof claim.flags === "number" &&
            Number.isInteger(claim.flags) &&
            claim.flags > 0,
          )
          .map((claim) => ({ providerId: claim.providerId, key: claim.key, flags: claim.flags })),
        // Same shape as the two above: whatever does not read as a claim is dropped rather than
        // repaired, because a half-read claim would decide what somebody is shown.
        addonRoleClaims: (payload.user?.addonRoleClaims ?? [])
          .filter((claim): claim is { providerId: `@${string}/${string}`; roles: string[] } =>
            typeof claim.providerId === "string" &&
            /^@[^/]+\/[^/]+/.test(claim.providerId) &&
            Array.isArray(claim.roles) &&
            claim.roles.every((role: unknown) =>
              typeof role === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(role),
            ),
          )
          .map((claim) => ({ providerId: claim.providerId, roles: [...claim.roles] })),
        authorizationRevision:
          Number.isInteger(payload.user?.authorizationRevision) &&
          (payload.user?.authorizationRevision ?? 0) >= 0
            ? (payload.user?.authorizationRevision as number)
            : 0,
        newsletterOptIn: payload.user?.newsletterOptIn ?? null,
        themeMode: viewerThemeMode,
        userName: payload.user?.name ?? null,
        userEmail: payload.user?.email ?? null,
        preferredLocale: payload.user?.preferredLocale ?? null,
        /*
         * The stored choice, kept beside the resolution above rather than folded into it. The server
         * answers `system` for an account that has chosen nothing, and that has to survive the trip:
         * a Settings panel showing "Light" because the browser is light would be telling the person
         * they decided something they never did.
         */
        preferredThemeMode: normalizePhiThemeModePreference(payload.user?.themeMode),
        mustChangePassword: payload.user?.mustChangePassword === true,
        profile: payload.user?.profile ?? null,
      },
    };
  }

export const loadPhiSiteRequestContext = cache(async function loadPhiSiteRequestContext(
  siteKey: string,
  locale: string,
  cookieHeader: string,
  apiBaseUrl?: string,
  internalToken?: string,
): Promise<PhiSiteRequestContext> {
  /*
   * Both at once: the snapshot needs only the Site key, which the caller handed in, so it never had to
   * wait for the viewer. Without it no Module can tell what the server provides; rendering on would show
   * Modules as active that the server refuses, so a failed read fails the request.
   */
  const [runtimeInfo, serverCapabilities] = await Promise.all([
    getPhiCmsRuntimeInfo({
      apiBaseUrl,
      internalToken,
      siteKey,
      cookieHeader,
    }),
    getPhiCapabilitySnapshot({
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      siteKey,
    }),
  ]);

  return {
    serverCapabilities,
    site: runtimeInfo.site,
    locale: {
      current: locale,
    },
    viewer: runtimeInfo.viewer,
  };
});
