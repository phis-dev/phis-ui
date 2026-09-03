import "server-only";

import { cache } from "react";
import { resolvePhiCmsAreaKey } from "../constants/cms-areas";
import { resolvePhiRuntimeConfig } from "../helpers/phis-runtime";
import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import { getResolvedSiteConfig } from "../gateway/site-config";
import { getPhiServerCapabilitySnapshot } from "../gateway/server-capabilities";
import type {
  PhiWidgetAreaKey,
  PhiBlockRuntime,
  PhiBlockRuntimeSite,
  PhiWidgetThemeMode,
} from "../types/widget-runtime";
import type { PhiSiteFontSlots, PhiSiteRemSettings } from "../types/site-theme";
import type { PhiServerCapabilitySnapshot } from "../types/server-capabilities";

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
    rem?: PhiSiteRemSettings | null;
    brand?: PhiWidgetSiteTheme["brand"];
    contact?: PhiWidgetSiteTheme["contact"];
    shell?: PhiWidgetSiteTheme["shell"];
  };
};

export type PhiViewerState = PhiBlockRuntime["viewer"];

export type GetPhiCmsRuntimeInfoOptions = {
  apiBaseUrl?: string;
  internalToken?: string;
  siteKey?: string;
  cookieHeader?: string;
};

export type PhiCmsRuntimeInfo = {
  site: PhiResolvedWidgetRuntimeSite;
  phis: {
    apiBaseUrl: string;
    internalToken: string;
  };
  viewer: PhiViewerState;
};

export type PhiSiteRequestContext = {
  serverCapabilities: PhiServerCapabilitySnapshot | null;
  site: {
    id: number;
    key: string;
    publicUrl?: string;
    name: string;
    hostname: string;
    availableLocales: Array<{
      code: string;
      label: string;
    }>;
    defaultLocale: string;
    themeRevision: {
      publishedRevisionId: number | null;
      workingDraftRevisionId: number | null;
    };
    theme: {
      mode: PhiWidgetThemeMode;
      fonts?: PhiSiteFontSlots | null;
      rem?: PhiSiteRemSettings | null;
      brand?: {
        slogan?: {
          label?: string | null;
          icon?: string | null;
        } | null;
        location?: {
          label?: string | null;
          icon?: string | null;
        } | null;
        wordmark?: {
          parts?: Array<{
            text: string;
            color?: string | null;
            fontWeight?: number | string | null;
          }> | null;
        } | null;
      };
      contact?: {
        label?: string | null;
        href?: string | null;
        icon?: string | null;
      };
      shell?: {
        light?: {
          background?: string | null;
          color?: string | null;
        } | null;
        dark?: {
          background?: string | null;
          color?: string | null;
        } | null;
        header?: {
          light?: {
            background?: string | null;
            color?: string | null;
          } | null;
          dark?: {
            background?: string | null;
            color?: string | null;
          } | null;
          top?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
          main?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
          bottom?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
        } | null;
        sider?: {
          light?: {
            background?: string | null;
            color?: string | null;
          } | null;
          dark?: {
            background?: string | null;
            color?: string | null;
          } | null;
          left?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
            sticky?: boolean | null;
            width?: number | null;
          } | null;
          right?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
            sticky?: boolean | null;
            width?: number | null;
          } | null;
        } | null;
        footer?: {
          light?: {
            background?: string | null;
            color?: string | null;
          } | null;
          dark?: {
            background?: string | null;
            color?: string | null;
          } | null;
          main?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
          bottom?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
        } | null;
      };
    };
  };
  phis: {
    apiBaseUrl: string;
    internalToken: string;
  };
  locale: {
    current: string;
  };
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
    phis: requestContext.phis,
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
      ...(site.theme?.rem ? { rem: site.theme.rem } : {}),
      ...(site.theme?.brand ? { brand: site.theme.brand } : {}),
      ...(site.theme?.contact ? { contact: site.theme.contact } : {}),
      ...(site.theme?.shell ? { shell: site.theme.shell } : {}),
      ...(site.theme?.antd ? { antd: site.theme.antd } : {}),
      ...(site.theme?.phi ? { phi: site.theme.phi } : {}),
    },
  };

  const response = await fetch(buildApiUrl(resolvedRuntime.apiBaseUrl, "/api/auth/me"), {
    headers: buildApiHeaders({
      siteKey: resolvedRuntime.siteKey as string,
      includeSiteKey: true,
      extra: {
        Accept: "application/json",
        "User-Agent": "phis-ui/1.0",
        ...(cookieHeader?.trim() ? { Cookie: cookieHeader.trim() } : {}),
      },
    }),
    cache: "no-store",
  });

  if (response.status === 401) {
    return {
      site: resolvedSite,
      phis: {
        apiBaseUrl: resolvedRuntime.apiBaseUrl,
        internalToken: resolvedRuntime.internalToken,
      },
      viewer: {
        access: "public",
        resolvedArea: "public",
        roleClaims: [],
        groupClaims: [],
        authorizationRevision: 0,
        userName: null,
        userEmail: null,
      },
    };
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
      siteFlags?: number | null;
      newsletterOptIn?: boolean | null;
      preferredLocale?: string | null;
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
      phis: {
        apiBaseUrl: resolvedRuntime.apiBaseUrl,
        internalToken: resolvedRuntime.internalToken,
      },
      viewer: {
        access: "public",
        resolvedArea: "public",
        roleClaims: [],
        groupClaims: [],
        authorizationRevision: 0,
        userName: null,
        userEmail: null,
      },
    };
  }

  return {
    site: resolvedSite,
    phis: {
      apiBaseUrl: resolvedRuntime.apiBaseUrl,
      internalToken: resolvedRuntime.internalToken,
    },
      viewer: {
        access: "authenticated",
        resolvedArea: payload.area ?? "app",
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
        siteFlags: Number.isInteger(payload.user?.siteFlags) ? (payload.user?.siteFlags as number) : 0,
        newsletterOptIn: payload.user?.newsletterOptIn ?? null,
        userName: payload.user?.name ?? null,
        userEmail: payload.user?.email ?? null,
        preferredLocale: payload.user?.preferredLocale ?? null,
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
  const runtimeInfo = await getPhiCmsRuntimeInfo({
    apiBaseUrl,
    internalToken,
    siteKey,
    cookieHeader,
  });
  let serverCapabilities: PhiServerCapabilitySnapshot | null = null;
  try {
    serverCapabilities = await getPhiServerCapabilitySnapshot({
      apiBaseUrl: runtimeInfo.phis.apiBaseUrl,
      internalToken: runtimeInfo.phis.internalToken,
      siteKey: runtimeInfo.site.key,
    });
  } catch (error) {
    console.error("Failed to load phi-server capability snapshot.", error);
  }

  return {
    serverCapabilities,
    site: runtimeInfo.site,
    phis: runtimeInfo.phis,
    locale: {
      current: locale,
    },
    viewer: runtimeInfo.viewer,
  };
});
