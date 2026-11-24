import "server-only";

import type { NextRequest } from "next/server";

import { isPhiCmsAreaKey } from "../constants/cms-areas";
import { isPhiRecord } from "../helpers/is-record";
import { buildPhiRuntimeModuleWidgetType } from "../plugins/runtime-modules/contracts";
import type { PhiCmsWidgetPluginDefinition, PhiRuntimeModuleCatalog } from "../types/cms-plugins";
import { isPhiConfigError } from "../components/widgets/config/strict-config-reader";
import {
  checkPhiWidgetBinding,
  checkPhiWidgetConfigIcons,
  type PhiBindingCheckProvider,
} from "../helpers/widget-binding-check";
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
 * Whatever `parseConfig` throws refuses the write: a Widget that cannot read its config is not rendered,
 * however it says so. The check is the Widget's `parseConfig`, run against the catalog of the Area the
 * write is for. A Widget type that catalog does not know is left alone: whether a type may be stored at
 * all is Core's and the Module system's question, not this one's.
 *
 * And what a live Widget no longer checks for itself (owner, 2026-11-24: contract checks belong where a
 * config is made, never in the browser): a Table, Tree or record Widget bound to a resource its Provider
 * does not declare or does not fit (`checkPhiWidgetBinding`, the check a package's preset tests run), and
 * an icon `PhiIcon` does not know in a field the Inspector offers as an icon -- a Button's, a Collection
 * View action's (`checkPhiWidgetConfigIcons`). The Providers are the ones the Area's catalog declares; a
 * Widget bound to a Provider no Module of the catalog declares is the Area's state, not the config's, and
 * passes. This runs on the Builder's save of a Page, an Area or an Overlay, never while a page is drawn.
 */

type PhiCmsWriteConfigIssue = {
  widgetType: string;
  nodeId: unknown;
  path: string | null;
  message: string;
};

function buildDataProvidersByKey(catalog: PhiRuntimeModuleCatalog) {
  const providers = new Map<string, PhiBindingCheckProvider>();
  for (const entry of catalog.values()) {
    for (const provider of entry.definition.dataProviders ?? []) providers.set(provider.key, provider);
  }
  return providers;
}

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
  providers: ReadonlyMap<string, PhiBindingCheckProvider>,
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
        let parsed: unknown;
        try {
          parsed = definition.parseConfig(config);
        } catch (error) {
          /*
           * Any error, not only the strict reader's: a Widget from another package may refuse its config
           * in its own words, and the live page leaves that Widget out just the same. Only the strict
           * reader can say which field it was.
           */
          return {
            widgetType,
            nodeId: value.id ?? null,
            path: isPhiConfigError(error) ? error.path : null,
            message: error instanceof Error ? error.message : String(error),
          };
        }
        const [icon] = checkPhiWidgetConfigIcons(definition.fields, config);
        const [binding] = checkPhiWidgetBinding(widgetType, isPhiRecord(parsed) ? parsed : config, providers);
        const message = binding ?? icon;
        if (message) {
          return { widgetType, nodeId: value.id ?? null, path: null, message };
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
  const issue = findConfigIssue(
    body,
    buildWidgetDefinitionsByType(bridge.runtimeModuleCatalog),
    buildDataProvidersByKey(bridge.runtimeModuleCatalog),
  );
  if (!issue) return null;
  return jsonResponse({
    error: `${issue.widgetType}: ${issue.message}`,
    code: "invalid-config",
    widgetType: issue.widgetType,
    nodeId: issue.nodeId,
    field: issue.path,
  }, 422);
}
