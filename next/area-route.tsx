import "server-only";

import type { Metadata } from "next";

import { PhiCmsErrorPage } from "../components/cms/phi-cms-error-page";
import { PhiCmsRootLayout } from "../components/cms/phi-cms-root-layout";
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

export function createPhiNextStaticAreaLayout(
  root: string,
  cmsBridge: PhiCmsSiteBridge,
  Provider?: React.ComponentType<{ children: React.ReactNode }>,
) {
  return function PhiNextStaticAreaLayout({
    children,
    headerBottom,
    hero,
    siderRight,
    footerTop,
    drawer,
  }: PhiNextStaticAreaLayoutProps) {
    const content = (
      <PhiCmsRootLayout
        root={root}
        cmsBridge={cmsBridge}
        headerBottom={headerBottom}
        hero={hero}
        siderRight={siderRight}
        footerTop={footerTop}
        drawer={drawer}
      >
        {children}
      </PhiCmsRootLayout>
    );
    return Provider ? <Provider>{content}</Provider> : content;
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

export function createPhiNextStaticAreaNotFound(cmsBridge: PhiCmsSiteBridge) {
  return function PhiNextStaticAreaNotFound() {
    return <PhiCmsErrorPage code={404} cmsBridge={cmsBridge} />;
  };
}

export function createPhiNextDynamicRootLayout(
  cmsBridge: PhiCmsSiteBridge,
  Provider?: React.ComponentType<{ children: React.ReactNode }>,
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
    const content = (
      <PhiCmsRootLayout
        root={root}
        cmsBridge={cmsBridge}
        headerBottom={headerBottom}
        hero={hero}
        siderRight={siderRight}
        footerTop={footerTop}
        drawer={drawer}
      >
        {children}
      </PhiCmsRootLayout>
    );
    return Provider ? <Provider>{content}</Provider> : content;
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
