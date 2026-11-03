import "server-only";

import type { NextRequest } from "next/server";

import { isPhiCmsAreaKey } from "../constants/cms-areas";
import { isPhiRecord } from "../helpers/is-record";
import { buildPhiRuntimeModuleWidgetType } from "../plugins/runtime-modules/contracts";
import type { PhiCmsWidgetPluginDefinition, PhiRuntimeModuleCatalog } from "../types/cms-plugins";
import { isPhiConfigError } from "../components/widgets/config/strict-config-reader";
import { jsonResponse } from "./route-handler-helpers";
import type { PhiSiteAreaBridgeLoader } from "./site-area-bridges";

/*
 * A CMS write is refused when it would store a Widget config the Widget cannot read.
 *
 * Reading is strict (`components/widgets/config/strict-config-reader.ts`): a value that is present and
 * wrong throws, and a live page then leaves that Widget out. Storing such a value is where it can still
 * be stopped, so the Site checks every Widget a write carries before it goes to Core -- Core knows
 * nothing about Widgets, and the Site holds every Widget's own parser. The answer names the field, so
 * the author is told what to correct instead of saving something that disappears.
 *
 * The check is the Widget's `parseConfig` and nothing else, run against the catalog of the Area the
 * write is for. A Widget type that catalog does not know is left alone: whether a type may be stored at
 * all is Core's and the Module system's question, not this one's.
 */

type PhiCmsWriteConfigIssue = {
  widgetType: string;
  nodeId: unknown;
  path: string;
  message: string;
};

function buildWidgetDefinitionsByType(catalog: PhiRuntimeModuleCatalog) {
  const definitions = new Map<string, PhiCmsWidgetPluginDefinition<unknown>>();
  for (const entry of catalog.values()) {
    for (const widget of entry.widgets) {
      definitions.set(buildPhiRuntimeModuleWidgetType(widget), widget.definition);
    }
  }
  return definitions;
}

function findConfigIssue(
  body: unknown,
  definitions: ReadonlyMap<string, PhiCmsWidgetPluginDefinition<unknown>>,
): PhiCmsWriteConfigIssue | null {
  const pending: unknown[] = [body];
  while (pending.length > 0) {
    const value = pending.pop();
    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }
    if (!isPhiRecord(value)) continue;
    const widgetType = value.widgetType;
    const config = value.config;
    if (typeof widgetType === "string" && isPhiRecord(config)) {
      const definition = definitions.get(widgetType);
      if (definition) {
        try {
          definition.parseConfig(config);
        } catch (error) {
          if (!isPhiConfigError(error)) throw error;
          return { widgetType, nodeId: value.id ?? null, path: error.path, message: error.message };
        }
      }
    }
    pending.push(...Object.values(value));
  }
  return null;
}

/**
 * The 422 for a write that carries an unreadable Widget config, or `null` to let it through.
 *
 * The body is read from a clone, so the request still goes upstream untouched.
 */
export async function validatePhiCmsStructureWrite(
  request: NextRequest,
  loadAreaBridge: PhiSiteAreaBridgeLoader,
): Promise<Response | null> {
  const body = await request.clone().json().catch(() => null);
  if (!isPhiRecord(body)) return null;
  const area = typeof body.area === "string" ? body.area.trim().toLowerCase() : "";
  if (!isPhiCmsAreaKey(area)) return null;
  const bridge = await loadAreaBridge(area);
  if (!bridge) return null;
  const issue = findConfigIssue(body, buildWidgetDefinitionsByType(bridge.runtimeModuleCatalog));
  if (!issue) return null;
  return jsonResponse({
    error: `${issue.widgetType}: ${issue.message}`,
    code: "invalid-config",
    widgetType: issue.widgetType,
    nodeId: issue.nodeId,
    field: issue.path,
  }, 422);
}
