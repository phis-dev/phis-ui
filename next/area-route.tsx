import "server-only";

import type { Metadata } from "next";

import { readPhiAreaMeta } from "../helpers/cms-area-config";
import { buildPhiAreaPageMetadata } from "../helpers/phi-metadata";
import { resolvePhiSitePublicBase } from "../helpers/phi-seo";
import { readPhiSiteRuntimeConfigSync } from "../helpers/site-runtime";

import { PhiCmsErrorPage } from "../components/cms/phi-cms-error-page";
import type { PhiCmsErrorPageProps } from "../components/cms/phi-cms-error-page";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import {
  PhiCmsAreaBoundary,
  PhiCmsAreaShell,
  type PhiCmsAreaChrome,
} from "../components/cms/phi-cms-root-layout";
import { PhiCmsRootPage } from "../components/cms/phi-cms-root-page";
import { PhiThemeBlockCatalogProvider } from "../components/root/phi-theme-block-catalog-provider";
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
  return async function PhiNextStaticAreaBoundary({ children }: { children: React.ReactNode }) {
    const content = (
      <PhiCmsAreaBoundary root={root} cmsBridge={cmsBridge}>
        {children}
      </PhiCmsAreaBoundary>
    );
    const bounded = Provider ? <Provider>{content}</Provider> : content;
    // Only an Area whose bridge offers the Theme block catalogue ships it -- today the Builder alone.
    const themeBlockCatalog = await cmsBridge.loadThemeBlockCatalog?.();
    return themeBlockCatalog ? (
      <PhiThemeBlockCatalogProvider catalog={themeBlockCatalog}>{bounded}</PhiThemeBlockCatalogProvider>
    ) : bounded;
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

    return buildPhiAreaPageMetadata({
      area: resolvedRoute.area,
      meta: readPhiAreaMeta(rootRequest.resolvedAreaPreset?.preset.config),
      siteName: resolvedRequest.runtime.site.name,
      pageTitle: resolvedRequest.page.pageMeta?.title?.value,
      pageDescription: resolvedRequest.page.pageMeta?.description?.value,
      pageNoindex: resolvedRequest.runtime.page?.noindex,
    });
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
 * What a root error route rebuilds before it renders.
 *
 * The Bridge is loaded rather than imported, and the Boundary mounted through `next/dynamic`, for the
 * same reason: the root error routes are the fallback boundary of the whole app, so every module this
 * value can reach joins every route's Client-reference manifest, and from there the chunk group of
 * every page. A plain Bridge import is enough to do it -- a Bridge carries its Area's server catalog,
 * and that catalog names the Widget plugins.
 */
export type PhiNextRootErrorArea = {
  loadBridge: () => Promise<PhiCmsSiteBridge>;
  Boundary: React.ComponentType<{ children: React.ReactNode }>;
};

/**
 * A root-level error route: `not-found.tsx`, `unauthorized.tsx` and `forbidden.tsx`.
 *
 * These run when an Area layout refuses before it renders. Next catches a layout's refusal above that
 * layout, so neither the Area's shell nor the Client boundary it mounts exist any more -- which is why
 * this rebuilds both rather than rendering the error tree bare.
 *
 * It answers as Public whichever Area was asked for, and every Area is welcome to answer for itself
 * first: an Area that carries its own `not-found.tsx`, `unauthorized.tsx` or `forbidden.tsx` catches
 * the refusal inside its own shell and never reaches here. What is left for this route are refusals
 * raised above an Area segment, and paths that name no Area at all.
 *
 * Rebuilding the refused Area here instead was measured and dropped: one registry naming all six put
 * 22 further Client modules into every route, the Builder's workspace among them, and roughly half of
 * the Public landing page's script payload with them. Deciding here rather than redirecting still
 * keeps both the status line and the address the visitor asked for.
 */
export function createPhiNextRootErrorPage(
  code: PhiCmsErrorPageProps["code"],
  area: PhiNextRootErrorArea,
) {
  const { loadBridge, Boundary } = area;

  return async function PhiNextRootErrorPage() {
    const cmsBridge = await loadBridge();

    /*
     * A refusal draws no Shell at all, and asks for none later.
     *
     * Next renders every refusal boundary of the matched segments into the response whether one is
     * shown or not, so a Shell resolved here was paid for by every successful Page as well -- measured
     * at three resolutions and roughly 56 KB per request, for output almost no visitor sees. Fetching
     * it from the client afterwards moved that cost rather than removing it, and bought a page that
     * changed shape after it had appeared.
     *
     * The Client boundary is still mounted, because the error page renders a page tree like any other
     * and cannot resolve its Runtime Module Clients without one. What the visitor loses is the
     * navigation, which is why the 404 result carries a link to the Area root.
     */
    return (
      <Boundary>
        <PhiCmsErrorPage code={code} cmsBridge={cmsBridge} area="public" />
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

    return buildPhiAreaPageMetadata({
      area: resolvedRoute.area,
      meta: readPhiAreaMeta(rootRequest.resolvedAreaPreset?.preset.config),
      siteName: resolvedRequest.runtime.site.name,
      pageTitle: resolvedRequest.page.pageMeta?.title?.value,
      pageDescription: resolvedRequest.page.pageMeta?.description?.value,
      pageNoindex: resolvedRequest.runtime.page?.noindex,
      publicAddress: {
        publicBase: resolvePhiSitePublicBase(
          resolvedRequest.runtime.site.publicUrl,
          readPhiSiteRuntimeConfigSync().site.publicUrl,
        ),
        path: resolvedRoute.cmsPath,
        locale: resolvedRoute.locale,
        availableLocales: resolvedRequest.runtime.site.availableLocales.map((option) => option.code),
        defaultLocale: resolvedRequest.runtime.site.defaultLocale,
      },
    });
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
