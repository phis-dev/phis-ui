import "server-only";

import type { Metadata } from "next";

import { readPhiAreaMeta } from "../helpers/cms-area-config";
import { buildPhiAreaPageMetadata } from "../helpers/phi-metadata";
import { resolvePhiSitePublicBase } from "../helpers/phi-seo";
import { readPhiSiteRuntimeConfigSync } from "../helpers/site-runtime";

import { PhiCmsErrorPage } from "../components/cms/phi-cms-error-page";
import type { PhiCmsErrorPageProps } from "../components/cms/phi-cms-error-page";
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
import { toPhiStaticCmsSiteBridge } from "../server-helpers/static-render";

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

/**
 * What a Page-owned slot shows for an address its own branch does not answer.
 *
 * Next keeps each slot's active segment beside the children segment, and a client navigation that
 * leaves the branch -- Area root to a Page below it, or one Area to the next -- moves children while
 * the slots have nothing to move to. Without this file Next has no state to put there: it keeps the
 * leaving branch's slot and asks it to serve an address it was never resolved for, and the arriving
 * Layout answers with a tree that disagrees with the one the client holds. That disagreement is what
 * the client tries to settle by navigating again.
 *
 * Nothing is the right answer and not a placeholder. A slot draws one Region of one Page; an address
 * that does not reach that Page has no Region for it, and the Layout beside it already decided
 * existence, access and forwarding with a status line. So this neither resolves the request nor
 * refuses it -- both are answered once, above, and a slot that answered a second time would only
 * multiply what the client has to unwind.
 */
export function createPhiNextAreaSlotDefault() {
  return function PhiNextAreaSlotDefault() {
    return null;
  };
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
 * It answers as Public for every Area, and it is the only route that answers: an Area carries no
 * refusal routes of its own, because one placed inside an Area could never catch anything. Existence
 * is decided by `PhiCmsAreaShell` rather than by the Page, so that the status line can still say 404
 * -- decided below the shell it arrives after the flush, and Next can then only swap the body, which
 * answers 200. The shell is therefore the thrower, and a refusal is always caught above it. A
 * boundary beside the shell's own Layout is skipped; this was measured, at 404 with no navigation.
 *
 * So the shell is not lost here, it was never reachable: an Area keeping its navigation on an error
 * page and an Area answering 404 are the same choice made two ways, and the status line wins.
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

/*
 * The static route tree of the Public Area.
 *
 * The proxy sends an anonymous GET without a query here instead of to the dynamic tree above, under
 * `static-render/<marker>/<mode>/<root>/...`, and Next keeps what these render: one result per page,
 * locale and colour scheme for every visitor it matches. Nothing below reads the request -- the Bridge
 * each factory renders with is the static one (`toPhiStaticCmsSiteBridge`), which takes the path from
 * the route's segments and sends no cookie and no query to Core.
 *
 * The Layouts sit inside the catch-all rather than above it. The dynamic tree's Layouts are given no
 * segments and derive them from a request header the static tree may not read; placed inside, they are
 * given the path, at the price of rendering the Shell again on each client navigation between pages --
 * which, for a page served from the cache, is a read.
 */

type PhiNextStaticPublicLayoutProps = PhiNextStaticAreaLayoutProps & {
  params: Promise<{ root: string; path?: string[] }>;
};

/** One branch of the static tree: the Area boundary and the Shell, for the page its segments name. */
export function createPhiNextStaticPublicLayout(
  cmsBridge: PhiCmsSiteBridge,
  chrome: PhiCmsAreaChrome = "shell",
) {
  const staticBridge = toPhiStaticCmsSiteBridge(cmsBridge);

  return async function PhiNextStaticPublicLayout({
    children,
    headerBottom,
    hero,
    siderRight,
    footerTop,
    drawer,
    params,
  }: PhiNextStaticPublicLayoutProps) {
    const { root, path } = await params;
    return (
      <PhiCmsAreaBoundary root={root} cmsBridge={staticBridge} pagePath={path}>
        <PhiCmsAreaShell
          root={root}
          cmsBridge={staticBridge}
          chrome={chrome}
          pagePath={path}
          headerBottom={headerBottom}
          hero={hero}
          siderRight={siderRight}
          footerTop={footerTop}
          drawer={drawer}
        >
          {children}
        </PhiCmsAreaShell>
      </PhiCmsAreaBoundary>
    );
  };
}

export function createPhiNextStaticPublicPage(cmsBridge: PhiCmsSiteBridge) {
  return createPhiNextDynamicRootPage(toPhiStaticCmsSiteBridge(cmsBridge));
}

export function createPhiNextStaticPublicSlotPage(
  cmsBridge: PhiCmsSiteBridge,
  regionType: PhiNextStaticAreaRegionType,
) {
  return createPhiNextDynamicRootSlotPage(toPhiStaticCmsSiteBridge(cmsBridge), regionType);
}

/**
 * The static tree's refusal page.
 *
 * Next gives a `not-found.tsx` no params, so the Site's file reads the locale from `next/root-params` --
 * a module whose getters Next generates from that Site's own segment names -- and hands it in.
 */
export function createPhiNextStaticPublicNotFound(cmsBridge: PhiCmsSiteBridge) {
  const staticBridge = toPhiStaticCmsSiteBridge(cmsBridge);

  return function PhiNextStaticPublicNotFound({ locale }: { locale: string }) {
    return <PhiCmsErrorPage code={404} cmsBridge={staticBridge} area="public" locale={locale} />;
  };
}
