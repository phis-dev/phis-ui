import "server-only";

import type { Metadata } from "next";
import { headers } from "next/headers";

import { PhiCmsErrorPage } from "../components/cms/phi-cms-error-page";
import type { PhiCmsErrorPageProps } from "../components/cms/phi-cms-error-page";
import { isPhiCmsAreaKey, type PhiCmsAreaKey } from "../constants/cms-areas";
import {
  PhiCmsAreaBoundary,
  PhiCmsAreaShell,
  PhiCmsRootLayout,
  type PhiCmsAreaChrome,
} from "../components/cms/phi-cms-root-layout";
import { resolvePhiCmsErrorPagePath } from "../components/regions/presets/phi-default-pub-error-page-tree";
import { resolvePhiRequestLocale } from "../server-helpers/request-locale";
import { PHIS_REQUEST_PATH_HEADER } from "../constants/http-headers";
import { PhiCmsRootPage } from "../components/cms/phi-cms-root-page";
import { PhiCmsRootSlotPage } from "../components/cms/phi-cms-root-slot-page";
import { isPhiCmsGatewayAuthError } from "../gateway/errors";
import { loadPhiCmsRootRequest } from "../server-helpers/cms-root";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";

type PhiNextStaticAreaLayoutProps = {
  children: React.ReactNode;
  headerBottom: React.ReactNode;
  hero: React.ReactNode;
  siderRight: React.ReactNode;
  footerTop: React.ReactNode;
  drawer: React.ReactNode;
};

type PhiNextStaticAreaPageProps = {
  params: Promise<{ path?: string[] }>;
};

type PhiNextDynamicRootPageProps = {
  params: Promise<{ root: string; path?: string[] }>;
};

type PhiNextStaticAreaRegionType = Parameters<typeof PhiCmsRootSlotPage>[0]["regionType"];

/**
 * The Area's own Layout: guards, providers, Overlays, and the Client boundary.
 *
 * It draws no Region. Those belong to the two Layouts below it -- one branch for the root of the Area,
 * which draws no Shell, and one for every page inside it, which does. Keeping the providers here is
 * what makes a navigation across that boundary rebuild the Shell without rebuilding the Area.
 */
export function createPhiNextStaticAreaBoundary(
  root: string,
  cmsBridge: PhiCmsSiteBridge,
  Provider?: React.ComponentType<{ children: React.ReactNode }>,
) {
  return function PhiNextStaticAreaBoundary({ children }: { children: React.ReactNode }) {
    const content = (
      <PhiCmsAreaBoundary root={root} cmsBridge={cmsBridge}>
        {children}
      </PhiCmsAreaBoundary>
    );
    return Provider ? <Provider>{content}</Provider> : content;
  };
}

/**
 * One branch's Layout: the Page-owned slots, with or without the Area's own Regions around them.
 *
 * Both branches call this; only `chrome` differs. `none` is the root of the Area, where the Shell is
 * neither drawn nor resolved.
 */
export function createPhiNextStaticAreaLayout(
  root: string,
  cmsBridge: PhiCmsSiteBridge,
  chrome: PhiCmsAreaChrome = "shell",
) {
  return function PhiNextStaticAreaLayout({
    children,
    headerBottom,
    hero,
    siderRight,
    footerTop,
    drawer,
  }: PhiNextStaticAreaLayoutProps) {
    return (
      <PhiCmsAreaShell
        root={root}
        cmsBridge={cmsBridge}
        chrome={chrome}
        headerBottom={headerBottom}
        hero={hero}
        siderRight={siderRight}
        footerTop={footerTop}
        drawer={drawer}
      >
        {children}
      </PhiCmsAreaShell>
    );
  };
}

export function createPhiNextStaticAreaPage(root: string, cmsBridge: PhiCmsSiteBridge) {
  async function generateMetadata({ params }: PhiNextStaticAreaPageProps): Promise<Metadata> {
    const { path } = await params;
    let rootRequest: Awaited<ReturnType<typeof loadPhiCmsRootRequest>>;
    try {
      rootRequest = await loadPhiCmsRootRequest({ root, path, cmsBridge });
    } catch (error) {
      if (isPhiCmsGatewayAuthError(error)) {
        return { title: "Not authorized" };
      }
      throw error;
    }
    const { resolvedRoute, resolvedRequest } = rootRequest;

    if (resolvedRoute.canonicalHref || !resolvedRequest) {
      return {};
    }

    const title = resolvedRequest.page.pageMeta?.title?.value?.trim();
    const description = resolvedRequest.page.pageMeta?.description?.value?.trim();

    return {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    };
  }

  async function PhiNextStaticAreaPage({ params }: PhiNextStaticAreaPageProps) {
    const { path } = await params;
    return <PhiCmsRootPage root={root} path={path} cmsBridge={cmsBridge} />;
  }

  return { Page: PhiNextStaticAreaPage, generateMetadata };
}

export function createPhiNextStaticAreaSlotPage(
  root: string,
  cmsBridge: PhiCmsSiteBridge,
  regionType: PhiNextStaticAreaRegionType,
) {
  return async function PhiNextStaticAreaSlotPage({ params }: PhiNextStaticAreaPageProps) {
    const { path } = await params;
    return (
      <PhiCmsRootSlotPage
        root={root}
        path={path}
        cmsBridge={cmsBridge}
        regionType={regionType}
      />
    );
  };
}

/**
 * An Area's own refusal page: `not-found.tsx`, `unauthorized.tsx`, `forbidden.tsx`.
 *
 * Next resolves these from the refusing segment upwards, so as long as the Area itself is reachable they
 * render in that Area's children slot: the shell stays, the error tree fills the content region, and the
 * Client boundary the layout mounted is already in place. Only a refusal by the layout itself walks past
 * them to the root, where there is no Area left to render into.
 */
export function createPhiNextStaticAreaErrorPage(
  code: PhiCmsErrorPageProps["code"],
  cmsBridge: PhiCmsSiteBridge,
  area: PhiCmsAreaKey,
) {
  return function PhiNextStaticAreaErrorPage() {
    return <PhiCmsErrorPage code={code} cmsBridge={cmsBridge} area={area} />;
  };
}

export function createPhiNextStaticAreaNotFound(cmsBridge: PhiCmsSiteBridge, area: PhiCmsAreaKey) {
  return createPhiNextStaticAreaErrorPage(404, cmsBridge, area);
}

/**
 * A root-level error route: `unauthorized.tsx` and `forbidden.tsx`.
 *
 * These are reached only when an Area layout refuses before it renders -- a reachable Area answers from
 * its own `unauthorized.tsx` or `forbidden.tsx` instead, inside its shell. Being above every Area layout,
 * they are also above the only place the Client boundary is mounted, and the CMS error page renders a
 * page tree like any other: without a boundary it cannot resolve its Runtime Module Clients and throws,
 * replacing the 401 or 403 it was asked to show with a runtime error. So they mount one themselves.
 */
export type PhiNextErrorAreaEntry = {
  cmsBridge: PhiCmsSiteBridge;
  Boundary: React.ComponentType<{ children: React.ReactNode }>;
};

/**
 * The Areas a root error route can rebuild a shell from, keyed by Area root segment.
 *
 * `public` is required: it is what answers when the path names no Area of its own, and what a Site
 * always has.
 */
export type PhiNextErrorAreaRegistry = Readonly<Record<string, PhiNextErrorAreaEntry>> & {
  public: PhiNextErrorAreaEntry;
};

/**
 * A root-level error route: `not-found.tsx`, `unauthorized.tsx` and `forbidden.tsx`.
 *
 * These run when an Area layout refuses before it renders. Next catches a layout's refusal above that
 * layout, so neither the Area's shell nor the Client boundary it mounts exist any more -- which is why
 * this rebuilds both rather than rendering the error tree bare.
 *
 * The Area comes from the request path the Site proxy recorded, so a refused `/builder/...` is answered
 * in the Builder's own shell. A path that names no Area, and any path the proxy did not record, is
 * answered by the Public Area. Deciding here rather than redirecting keeps both the status line and the
 * address the visitor asked for.
 */
export function createPhiNextRootErrorPage(
  code: PhiCmsErrorPageProps["code"],
  areas: PhiNextErrorAreaRegistry,
) {
  return async function PhiNextRootErrorPage() {
    const requestPath = (await headers()).get(PHIS_REQUEST_PATH_HEADER) ?? "";
    const firstSegment = requestPath.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
    /*
     * A refusal names its Area only when the first segment is one. Under a locale root that segment is
     * a page name, so it is checked against the known Areas rather than trusted as one.
     */
    const areaKey: PhiCmsAreaKey =
      isPhiCmsAreaKey(firstSegment) && firstSegment !== "public" && areas[firstSegment]
        ? firstSegment
        : "public";
    const { cmsBridge, Boundary } = areas[areaKey] ?? areas.public;

    const bridgeRuntime = cmsBridge.runtime;
    const siteKey = bridgeRuntime?.siteKey?.trim() ?? "";
    const errorPage = <PhiCmsErrorPage code={code} cmsBridge={cmsBridge} area={areaKey} />;
    if (!siteKey) {
      /* Without a Site there is no shell to resolve; the error page falls back to its own bare copy. */
      return <Boundary>{errorPage}</Boundary>;
    }

    /*
     * Only the Public Area is addressed by locale; a staff Area is addressed by its own segment, and
     * `PhiCmsRootLayout` takes whichever of the two the request used as its root.
     */
    const root =
      areaKey === "public"
        ? await resolvePhiRequestLocale({
            apiBaseUrl: bridgeRuntime?.apiBaseUrl,
            internalToken: bridgeRuntime?.internalToken,
            siteKey,
          })
        : areaKey;

    return (
      <Boundary>
        <PhiCmsRootLayout
          root={root}
          cmsBridge={cmsBridge}
          path={resolvePhiCmsErrorPagePath(code).split("/").filter(Boolean)}
        >
          {errorPage}
        </PhiCmsRootLayout>
      </Boundary>
    );
  };
}

/** The Public Area's boundary. Its root segment is a locale, so it only reaches it through `params`. */
export function createPhiNextDynamicRootBoundary(
  cmsBridge: PhiCmsSiteBridge,
  Provider?: React.ComponentType<{ children: React.ReactNode }>,
) {
  return async function PhiNextDynamicRootBoundary({
    children,
    params,
  }: {
    children: React.ReactNode;
    params: Promise<{ root: string }>;
  }) {
    const { root } = await params;
    const content = (
      <PhiCmsAreaBoundary root={root} cmsBridge={cmsBridge}>
        {children}
      </PhiCmsAreaBoundary>
    );
    return Provider ? <Provider>{content}</Provider> : content;
  };
}

export function createPhiNextDynamicRootLayout(
  cmsBridge: PhiCmsSiteBridge,
  chrome: PhiCmsAreaChrome = "shell",
) {
  return async function PhiNextDynamicRootLayout({
    children,
    headerBottom,
    hero,
    siderRight,
    footerTop,
    drawer,
    params,
  }: PhiNextStaticAreaLayoutProps & {
    params: Promise<{ root: string }>;
  }) {
    const { root } = await params;
    return (
      <PhiCmsAreaShell
        root={root}
        cmsBridge={cmsBridge}
        chrome={chrome}
        headerBottom={headerBottom}
        hero={hero}
        siderRight={siderRight}
        footerTop={footerTop}
        drawer={drawer}
      >
        {children}
      </PhiCmsAreaShell>
    );
  };
}

export function createPhiNextDynamicRootPage(cmsBridge: PhiCmsSiteBridge) {
  async function generateMetadata({ params }: PhiNextDynamicRootPageProps): Promise<Metadata> {
    const { root, path } = await params;
    let rootRequest: Awaited<ReturnType<typeof loadPhiCmsRootRequest>>;
    try {
      rootRequest = await loadPhiCmsRootRequest({ root, path, cmsBridge });
    } catch (error) {
      if (isPhiCmsGatewayAuthError(error)) {
        return { title: "Not authorized" };
      }
      throw error;
    }
    const { resolvedRoute, resolvedRequest } = rootRequest;

    if (resolvedRoute.canonicalHref || !resolvedRequest) {
      return {};
    }

    const title = resolvedRequest.page.pageMeta?.title?.value?.trim();
    const description = resolvedRequest.page.pageMeta?.description?.value?.trim();

    return {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    };
  }

  async function PhiNextDynamicRootPage({ params }: PhiNextDynamicRootPageProps) {
    const { root, path } = await params;
    return <PhiCmsRootPage root={root} path={path} cmsBridge={cmsBridge} />;
  }

  return { Page: PhiNextDynamicRootPage, generateMetadata };
}

export function createPhiNextDynamicRootSlotPage(
  cmsBridge: PhiCmsSiteBridge,
  regionType: PhiNextStaticAreaRegionType,
) {
  return async function PhiNextDynamicRootSlotPage({ params }: PhiNextDynamicRootPageProps) {
    const { root, path } = await params;
    return (
      <PhiCmsRootSlotPage
        root={root}
        path={path}
        cmsBridge={cmsBridge}
        regionType={regionType}
      />
    );
  };
}
