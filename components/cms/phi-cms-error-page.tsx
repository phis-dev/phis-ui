import "server-only";

import { cookies } from "next/headers";

import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import { resolvePhiRequestLocale } from "../../server-helpers/request-locale";
import { loadPhiResolvedCmsRequest } from "../../server-helpers/cms-request";
import { PhiCmsPageRenderer } from "./phi-cms-page-renderer";
import {
  parsePhiCmsErrorCode,
  resolvePhiCmsErrorPagePath,
  type PhiCmsErrorCode,
} from "../../constants/cms-error-pages";
import {
  resolvePhiCmsAreaRuntimeModuleScope,
  resolvePhiCmsTreeRuntimeRegistry,
} from "./phi-cms-runtime-registry";
import { PhiRuntimeModuleDataProviderHost } from "../runtime/runtime-module-data-provider-host";
import { isPhiStaticCmsSiteBridge } from "../../server-helpers/static-render";
import { PhiCmsErrorFallback } from "./phi-cms-error-fallback";

export type PhiCmsErrorPageProps = {
  code: PhiCmsErrorCode;
  cmsBridge: PhiCmsSiteBridge;
  /** The Area whose route refused the request; its error page is the one to render. */
  area: PhiCmsAreaKey;
  /**
   * The locale to render in, for a static Bridge.
   *
   * A static route reads nothing from the request, and a refusal route is not given the segments of the
   * page that was refused, so the static tree reads its locale from the root params and passes it here.
   * A request-reading Bridge resolves the locale from the request instead and ignores this.
   */
  locale?: string;
};

export function isPhiCmsErrorCode(value: string | number | null | undefined): value is PhiCmsErrorCode {
  return parsePhiCmsErrorCode(value) != null;
}

export async function PhiCmsErrorPage({ code, cmsBridge, area, locale: staticLocale }: PhiCmsErrorPageProps) {
  const isStatic = isPhiStaticCmsSiteBridge(cmsBridge);
  if (isStatic && !staticLocale) {
    throw new Error("A static error page needs the locale of its route.");
  }
  const cookieHeader = isStatic ? "" : (await cookies()).toString();
  const bridgeRuntime = cmsBridge.runtime;
  const siteKey = bridgeRuntime?.siteKey?.trim() ?? "";

  if (!siteKey) {
    return <PhiCmsErrorFallback code={code} />;
  }

  let resolvedRequest: Awaited<ReturnType<typeof loadPhiResolvedCmsRequest>> | null = null;

  try {
    const locale = isStatic && staticLocale ? staticLocale : await resolvePhiRequestLocale({
      apiBaseUrl: bridgeRuntime?.apiBaseUrl,
      internalToken: bridgeRuntime?.internalToken,
      siteKey,
    });
    resolvedRequest = await loadPhiResolvedCmsRequest(
      siteKey,
      locale,
      area,
      resolvePhiCmsErrorPagePath(code),
      cookieHeader,
      bridgeRuntime?.apiBaseUrl,
      bridgeRuntime?.internalToken,
      undefined,
      undefined,
      cmsBridge.runtimeModuleCatalog,
      /*
       * A refusal, not the address that was asked for.
       *
       * Next renders this tree beside the Page of every matched route whether it is shown or not, and
       * `/error/404` names no Area preset -- so a resolution that claimed the request would hand the
       * Shell the default Module selection and drop every Module the Site switched on. It claims only
       * where nothing else did, which is the root refusal route with no Area layout above it.
       */
      "refusal",
    );
  } catch {
    return <PhiCmsErrorFallback code={code} />;
  }

  if (!resolvedRequest) {
    return <PhiCmsErrorFallback code={code} />;
  }

  const runtimeModuleScope = await resolvePhiCmsAreaRuntimeModuleScope({
    cmsBridge,
    area: resolvedRequest.runtime.area,
    areaPreset: resolvedRequest.areaPreset,
    serverCapabilities: resolvedRequest.serverCapabilities,
  });
  const runtimeRegistry = await resolvePhiCmsTreeRuntimeRegistry({
    moduleScope: runtimeModuleScope,
    trees: [resolvedRequest.page],
  });

  return (
    <PhiRuntimeModuleDataProviderHost
      providerKeys={[...runtimeRegistry.dataProviderDescriptorsByKey.keys()]}
    >
      <PhiCmsPageRenderer
        tree={resolvedRequest.page}
        runtime={resolvedRequest.runtime}
        registry={runtimeRegistry}
      />
    </PhiRuntimeModuleDataProviderHost>
  );
}
