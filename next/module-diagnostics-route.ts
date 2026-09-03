import "server-only";

import type { NextRequest } from "next/server";

import { PHI_CMS_AREA_KEYS, type PhiCmsAreaKey } from "../constants/cms-areas";
import { getPhiServerCapabilitySnapshot } from "../gateway/server-capabilities";
import { resolvePhiRuntimeModuleServerBinding } from "../plugins/runtime-modules/server-capabilities";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";
import { PHIS_TOKEN_HEADER } from "../constants/http-headers";

/**
 * What this Site needs from its server, and what it is not getting.
 *
 * A Module whose Core capability is missing deactivates itself with a scoped diagnostic, which is the
 * right behaviour and an invisible one: a feature simply stops being there, and the reason reaches only
 * the log. Once phi-server and @phis/ui update independently through npm, that becomes a customer's
 * experience rather than a developer's.
 *
 * The comparison has to happen here rather than in phis-cli, because phi-server deliberately does not
 * depend on @phis/ui and so cannot know what a Site requires. The Site holds one half and asks the
 * server for the other.
 *
 * This reports the running Site, not a future one. It is the check to run after an update, not a
 * prediction of whether an update will be safe.
 */

export type PhiSiteModuleDiagnosticsBridges = Partial<
  Readonly<Record<PhiCmsAreaKey, PhiCmsSiteBridge>>
>;

export type PhiSiteModuleDiagnostic = {
  area: PhiCmsAreaKey;
  moduleId: string;
  providerId: string;
  state: string;
  diagnosticCode: string;
  missingCapabilities: readonly string[];
};

export type PhiSiteModuleDiagnosticsReport = {
  ok: boolean;
  siteKey: string;
  offeredCapabilities: readonly string[];
  unavailable: readonly PhiSiteModuleDiagnostic[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function buildPhiSiteModuleDiagnosticsRouteHandler({
  bridgesByArea,
}: {
  bridgesByArea: PhiSiteModuleDiagnosticsBridges;
}) {
  return async function GET(request: NextRequest) {
    const anyBridge = Object.values(bridgesByArea).find((bridge) => bridge?.runtime);
    if (!anyBridge?.runtime) {
      return json({ error: "no_site_runtime" }, 503);
    }
    const { apiBaseUrl, internalToken, siteKey } = anyBridge.runtime;

    // An operator's check, not a public one: it names which Modules a Site lost and why.
    if (!internalToken || request.headers.get(PHIS_TOKEN_HEADER)?.trim() !== internalToken) {
      return json({ error: "unauthorized" }, 401);
    }

    const snapshot = await getPhiServerCapabilitySnapshot({ apiBaseUrl, internalToken, siteKey })
      .catch(() => null);
    const offeredCapabilities = [
      ...new Set(
        (snapshot?.providers ?? []).flatMap((provider) => provider.capabilities.map(({ id }) => id)),
      ),
    ].sort();

    const unavailable: PhiSiteModuleDiagnostic[] = [];
    const seen = new Set<string>();
    for (const area of PHI_CMS_AREA_KEYS) {
      const catalog = bridgesByArea[area]?.runtimeModuleCatalog;
      if (!catalog) {
        continue;
      }
      for (const [moduleId, entry] of catalog) {
        const resolution = resolvePhiRuntimeModuleServerBinding(
          entry.definition.serverBinding,
          snapshot,
        );
        if (resolution.available) {
          continue;
        }
        // The Builder carries every Area's Modules, so the same failure would otherwise repeat.
        const key = area + moduleId;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        unavailable.push({
          area,
          moduleId,
          providerId: entry.definition.serverBinding.providerId,
          state: resolution.state,
          diagnosticCode: resolution.diagnosticCode,
          missingCapabilities: resolution.missingCapabilities,
        });
      }
    }

    const report: PhiSiteModuleDiagnosticsReport = {
      ok: unavailable.length === 0,
      siteKey,
      offeredCapabilities,
      unavailable,
    };
    return json(report, report.ok ? 200 : 409);
  };
}
