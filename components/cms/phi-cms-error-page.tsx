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
} from "../regions/presets/phi-default-pub-error-page-tree";
import {
  resolvePhiRuntimeModuleIdsForArea,
} from "../../plugins/runtime-modules/settings";
import {
  resolvePhiCmsRuntimeModuleScope,
  resolvePhiCmsTreeRuntimeRegistry,
} from "./phi-cms-runtime-registry";
import { PhiRuntimeModuleDataProviderHost } from "../runtime/runtime-module-data-provider-host";
import { readPhiAreaPresetRuntimeModuleIds } from "../../helpers/cms-area-config";

export type PhiCmsErrorPageProps = {
  code: PhiCmsErrorCode;
  cmsBridge: PhiCmsSiteBridge;
  /** The Area whose route refused the request; its error page is the one to render. */
  area: PhiCmsAreaKey;
};

const ERROR_COPY: Record<PhiCmsErrorCode, { title: string; text: string }> = {
  401: {
    title: "Not authorized",
    text: "You are not authorized to view this page.",
  },
  403: {
    title: "Not authorized",
    text: "You are not allowed to view this page.",
  },
  404: {
    title: "Not found",
    text: "This page could not be found.",
  },
  500: {
    title: "Something went wrong",
    text: "The page could not be rendered.",
  },
};

function PhiCmsHardFallbackErrorPage({ code }: { code: PhiCmsErrorCode }) {
  const copy = ERROR_COPY[code];

  return (
    <main
      style={{
        alignItems: "center",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: "40vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", lineHeight: 1.2, margin: 0 }}>{copy.title}</h1>
      <p style={{ fontSize: "1rem", lineHeight: 1.5, margin: "0.75rem 0 0" }}>{copy.text}</p>
    </main>
  );
}

export function isPhiCmsErrorCode(value: string | number | null | undefined): value is PhiCmsErrorCode {
  return parsePhiCmsErrorCode(value) != null;
}

export async function PhiCmsErrorPage({ code, cmsBridge, area }: PhiCmsErrorPageProps) {
  const cookieHeader = (await cookies()).toString();
  const bridgeRuntime = cmsBridge.runtime;
  const siteKey = bridgeRuntime?.siteKey?.trim() ?? "";

  if (!siteKey) {
    return <PhiCmsHardFallbackErrorPage code={code} />;
  }

  let resolvedRequest: Awaited<ReturnType<typeof loadPhiResolvedCmsRequest>> | null = null;

  try {
    const locale = await resolvePhiRequestLocale({
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
    );
  } catch {
    return <PhiCmsHardFallbackErrorPage code={code} />;
  }

  if (!resolvedRequest) {
    return <PhiCmsHardFallbackErrorPage code={code} />;
  }

  const runtimeModuleIds = resolvePhiRuntimeModuleIdsForArea(
    resolvedRequest.runtime.area,
    readPhiAreaPresetRuntimeModuleIds(resolvedRequest.areaPreset, resolvedRequest.runtime.area),
    [...cmsBridge.runtimeModuleCatalog.values()].map((entry) => entry.definition),
  );
  const runtimeModuleScope = await resolvePhiCmsRuntimeModuleScope({
    cmsBridge,
    moduleIds: runtimeModuleIds,
    area: resolvedRequest.runtime.area,
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
